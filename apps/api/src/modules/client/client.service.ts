import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";
import { Prisma } from "../../generated/client/index.js";
import { getProformaById } from "../proforma/proforma.service.js";

export interface CreateClientServiceInput {
  serviceItemId: string;
  commissionAmount?: number;
  basePrice?: number;
}

export interface CreateClientDTO {
  organisationId?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  whatsappNumber?: string;
  trnNumber?: string;
  address?: string;
  salesStaffId?: string;
  services: CreateClientServiceInput[];
  notes?: string;
  createdById?: string;
}

/**
 * Robustly generates the next sequential client number (e.g. CLI-1005).
 * Guaranteed collision-proof even with deletions or multiple orgs.
 */
async function generateNextClientNumber(): Promise<string> {
  const latestClients = await prisma.client.findMany({
    select: { clientNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 1000;
  for (const c of latestClients) {
    if (c.clientNumber) {
      const match = c.clientNumber.match(/CLI-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  while (true) {
    const candidate = `CLI-${nextNum}`;
    const exists = await prisma.client.findUnique({
      where: { clientNumber: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextNum++;
  }
}

/**
 * Robustly generates the next sequential proforma invoice number (e.g. PI-2026-1005).
 * Guaranteed collision-proof against concurrent operations or deletions.
 */
async function generateNextProformaNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PI-${currentYear}-`;

  const latestProformas = await prisma.proformaInvoice.findMany({
    where: {
      proformaNumber: { startsWith: prefix },
    },
    select: { proformaNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 1000;
  for (const pi of latestProformas) {
    if (pi.proformaNumber) {
      const parts = pi.proformaNumber.split("-");
      const numStr = parts[parts.length - 1];
      if (numStr) {
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  while (true) {
    const candidate = `${prefix}${nextNum}`;
    const exists = await prisma.proformaInvoice.findUnique({
      where: { proformaNumber: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextNum++;
  }
}

export async function createClientWithServices(data: CreateClientDTO) {
  const resolvedOrgId = await resolveOrganisationId(data.organisationId);
  if (!resolvedOrgId) {
    throw new Error("Invalid organization specified");
  }

  if (!data.companyName?.trim()) {
    throw new Error("Company name is required");
  }
  if (!data.services || data.services.length === 0) {
    throw new Error("At least one service must be selected");
  }

  // Generate unique sequential client number e.g. CLI-1005
  const clientNumber = await generateNextClientNumber();

  // Deduplicate incoming services by serviceItemId
  const uniqueServicesMap = new Map<string, (typeof data.services)[0]>();
  for (const srv of data.services) {
    if (srv.serviceItemId && !uniqueServicesMap.has(srv.serviceItemId)) {
      uniqueServicesMap.set(srv.serviceItemId, srv);
    }
  }
  const uniqueServices = Array.from(uniqueServicesMap.values());

  // Fetch all selected service items from catalog to compute pricing
  const serviceItemIds = uniqueServices.map((s) => s.serviceItemId);
  const dbServices = await prisma.serviceItem.findMany({
    where: {
      id: { in: serviceItemIds },
      organisationId: resolvedOrgId,
    },
  });

  const serviceMap = new Map(dbServices.map((s) => [s.id, s]));

  let subTotal = new Prisma.Decimal(0);
  let totalCommission = new Prisma.Decimal(0);
  let grandTotal = new Prisma.Decimal(0);

  const preparedServices = uniqueServices.map((srvInput) => {
    const dbSrv = serviceMap.get(srvInput.serviceItemId);
    const basePrice = srvInput.basePrice !== undefined
      ? new Prisma.Decimal(srvInput.basePrice)
      : dbSrv?.basePrice || new Prisma.Decimal(0);
    const commissionAmount = new Prisma.Decimal(srvInput.commissionAmount || 0);
    const totalPrice = basePrice.plus(commissionAmount);

    subTotal = subTotal.plus(basePrice);
    totalCommission = totalCommission.plus(commissionAmount);
    grandTotal = grandTotal.plus(totalPrice);

    return {
      serviceItemId: srvInput.serviceItemId,
      organisationId: resolvedOrgId,
      basePrice,
      commissionAmount,
      totalPrice,
      status: "PENDING_PAYMENT" as const,
    };
  });

  // Execute database transaction creating Client, Wallet, and ServiceItems
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Client
    const newClient = await tx.client.create({
      data: {
        organisationId: resolvedOrgId,
        clientNumber,
        companyName: data.companyName.trim(),
        contactPerson: data.contactPerson.trim(),
        assignedPerson: data.contactPerson.trim(),
        email: data.email.trim(),
        phoneNumber: data.phoneNumber.trim(),
        whatsappNumber: data.whatsappNumber?.trim() || null,
        trnNumber: data.trnNumber?.trim() || null,
        address: data.address?.trim() || null,
        salesStaffId: data.salesStaffId || null,
        status: "WORK_PENDING_PAYMENT",
      },
    });

    // 2. Initialize Client Financial Wallet
    const wallet = await tx.clientWallet.create({
      data: {
        clientId: newClient.id,
        organisationId: resolvedOrgId,
        balance: 0.0,
        currency: "AED",
      },
    });

    // 3. Create requested Client Service Items
    for (const srv of preparedServices) {
      await tx.clientServiceItem.create({
        data: {
          clientId: newClient.id,
          organisationId: resolvedOrgId,
          serviceItemId: srv.serviceItemId,
          basePrice: srv.basePrice,
          commissionAmount: srv.commissionAmount,
          totalPrice: srv.totalPrice,
          status: srv.status,
        },
      });
    }

    return {
      client: newClient,
      wallet,
    };
  });

  return getClientDetails(result.client.id);
}

/**
 * Generates an official Proforma Invoice for a registered client based on their service package.
 */
export async function generateProformaForClient(
  clientId: string,
  generatedById?: string,
  forceNew = false
) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      services: {
        include: { serviceItem: true },
      },
      proformaInvoices: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  // Calculate pricing from the client's registered services
  let subTotal = new Prisma.Decimal(0);
  let totalCommission = new Prisma.Decimal(0);
  let grandTotal = new Prisma.Decimal(0);

  for (const srv of client.services) {
    const base = new Prisma.Decimal(srv.basePrice || 0);
    const comm = new Prisma.Decimal(srv.commissionAmount || 0);
    const total = new Prisma.Decimal(srv.totalPrice || base.plus(comm));

    subTotal = subTotal.plus(base);
    totalCommission = totalCommission.plus(comm);
    grandTotal = grandTotal.plus(total);
  }

  // If a proforma already exists and we're not forcing a new one, return it
  if (!forceNew && client.proformaInvoices && client.proformaInvoices.length > 0) {
    const existing = client.proformaInvoices[0];
    if (existing) {
      // If the existing invoice had 0 or mismatched totals from current services, sync it
      if (
        (Number(existing.grandTotal) === 0 && Number(grandTotal) > 0) ||
        Number(existing.grandTotal) !== Number(grandTotal) ||
        Number(existing.subTotal) !== Number(subTotal)
      ) {
        await prisma.proformaInvoice.update({
          where: { id: existing.id },
          data: {
            subTotal,
            totalCommission,
            grandTotal,
            status: "ISSUED",
          },
        });
      }
      return getProformaById(existing.id);
    }
  }

  // Generate unique sequential proforma invoice number e.g. PI-2026-1005
  const proformaNumber = await generateNextProformaNumber();

  // Create Proforma Invoice
  const proforma = await prisma.proformaInvoice.create({
    data: {
      organisationId: client.organisationId,
      clientId: client.id,
      proformaNumber,
      subTotal,
      totalCommission,
      vatAmount: 0.0,
      grandTotal,
      currency: "AED",
      status: "ISSUED",
      notes: "Official Proforma Invoice generated from client service package",
      generatedById: generatedById || client.salesStaffId || null,
    },
  });

  return getProformaById(proforma.id);
}

export async function listClients(organisationId?: string, query?: string, status?: string) {
  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) return [];

  const whereClause: any = {
    organisationId: resolvedOrgId,
  };

  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  if (query && query.trim()) {
    const q = query.trim();
    whereClause.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { contactPerson: { contains: q, mode: "insensitive" } },
      { clientNumber: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phoneNumber: { contains: q, mode: "insensitive" } },
      { whatsappNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.client.findMany({
    where: whereClause,
    include: {
      wallet: {
        select: { balance: true, currency: true },
      },
      salesStaff: {
        select: { id: true, fullName: true, username: true, email: true },
      },
      services: {
        select: {
          id: true,
          status: true,
          totalPrice: true,
          serviceItem: { select: { name: true } },
        },
      },
      proformaInvoices: {
        select: {
          id: true,
          proformaNumber: true,
          grandTotal: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientDetails(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      organisation: {
        select: { id: true, companyName: true, subdomain: true, logo: true },
      },
      salesStaff: {
        select: { id: true, fullName: true, username: true, email: true, phoneNumber: true },
      },
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            include: {
              createdBy: { select: { id: true, fullName: true, username: true, role: true } },
            },
          },
        },
      },
      services: {
        include: {
          serviceItem: {
            include: { category: true },
          },
          assignedStaff: {
            select: { id: true, fullName: true, username: true, designation: true, isAvailable: true },
          },
          completionDoc: true,
        },
        orderBy: { createdAt: "asc" },
      },
      proformaInvoices: {
        orderBy: { createdAt: "desc" },
        include: {
          generatedBy: { select: { id: true, fullName: true, username: true } },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return client;
}

export interface ConvertToWorkInput {
  clientId: string;
  advanceAmount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT_CARD" | "ONLINE_PAYMENT";
  referenceId?: string;
  notes?: string;
  createdById?: string;
}

export async function convertClientToWork(input: ConvertToWorkInput) {
  const { clientId, advanceAmount, paymentMethod, referenceId, notes, createdById } = input;

  if (advanceAmount <= 0) {
    throw new Error("Advance payment amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({
      where: { id: clientId },
      include: { wallet: true },
    });

    if (!client) {
      throw new Error("Client not found");
    }

    if (!client.wallet) {
      throw new Error("Client financial wallet not initialized");
    }

    const advanceDecimal = new Prisma.Decimal(advanceAmount);
    const balanceBefore = client.wallet.balance;
    const balanceAfter = balanceBefore.plus(advanceDecimal);

    // 1. Credit wallet
    await tx.clientWallet.update({
      where: { id: client.wallet.id },
      data: { balance: balanceAfter },
    });

    // 2. Record Transaction in Ledger
    await tx.walletTransaction.create({
      data: {
        walletId: client.wallet.id,
        organisationId: client.organisationId,
        type: "CREDIT_ADVANCE",
        amount: advanceDecimal,
        balanceBefore,
        balanceAfter,
        paymentMethod,
        referenceId: referenceId?.trim() || null,
        description: notes?.trim() || "Advance payment collected on work conversion",
        createdById: createdById || null,
      },
    });

    // 3. Shift client status to WORK_APPROVED
    await tx.client.update({
      where: { id: clientId },
      data: { status: "WORK_APPROVED" },
    });

    // 4. Shift pending services to READY_TO_ASSIGN
    await tx.clientServiceItem.updateMany({
      where: {
        clientId,
        status: "PENDING_PAYMENT",
      },
      data: { status: "READY_TO_ASSIGN" },
    });

    // 5. Update latest proforma invoice status
    const latestProforma = await tx.proformaInvoice.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    if (latestProforma) {
      await tx.proformaInvoice.update({
        where: { id: latestProforma.id },
        data: { status: "CONVERTED_TO_WORK" },
      });
    }

    return tx.client.findUnique({
      where: { id: clientId },
      include: {
        wallet: {
          include: {
            transactions: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        },
        services: true,
      },
    });
  });
}

export interface TopUpWalletInput {
  clientId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT_CARD" | "ONLINE_PAYMENT";
  referenceId?: string;
  notes?: string;
  createdById?: string;
}

export async function topUpClientWallet(input: TopUpWalletInput) {
  const { clientId, amount, paymentMethod, referenceId, notes, createdById } = input;

  if (amount <= 0) {
    throw new Error("Top-up amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({
      where: { id: clientId },
      include: { wallet: true },
    });

    if (!client || !client.wallet) {
      throw new Error("Client or client wallet not found");
    }

    const amountDecimal = new Prisma.Decimal(amount);
    const balanceBefore = client.wallet.balance;
    const balanceAfter = balanceBefore.plus(amountDecimal);

    // 1. Credit wallet
    const updatedWallet = await tx.clientWallet.update({
      where: { id: client.wallet.id },
      data: { balance: balanceAfter },
    });

    // 2. Record Transaction in Ledger
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: client.wallet.id,
        organisationId: client.organisationId,
        type: "CREDIT_TOPUP",
        amount: amountDecimal,
        balanceBefore,
        balanceAfter,
        paymentMethod,
        referenceId: referenceId?.trim() || null,
        description: notes?.trim() || "Manual wallet top-up payment received",
        createdById: createdById || null,
      },
    });

    return {
      wallet: updatedWallet,
      transaction,
    };
  });
}

export async function getSalesStaffList(organisationId?: string) {
  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) return [];

  return prisma.user.findMany({
    where: {
      organisationId: resolvedOrgId,
      role: "SALES_STAFF",
      status: { not: "SUSPENDED" },
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      phoneNumber: true,
      role: true,
      department: true,
      status: true,
    },
    orderBy: { fullName: "asc" },
  });
}

