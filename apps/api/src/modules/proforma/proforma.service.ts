import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";
import { Prisma } from "../../generated/client/index.js";
import { generateNextClientNumber, generateNextProformaNumber } from "../client/client.service.js";

export interface CreateProformaInput {
  organisationId?: string;
  clientId?: string;
  clientData?: {
    companyName: string;
    contactPerson: string;
    email?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    trnNumber?: string;
    address?: string;
    salesStaffId?: string;
  };
  services: {
    serviceItemId: string;
    basePrice?: number;
    commissionAmount?: number;
    quantity?: number;
  }[];
  currency?: string;
  status?: "DRAFT" | "ISSUED";
  notes?: string;
  generatedById?: string;
}

export async function listProformas(organisationId?: string) {
  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) return [];

  return prisma.proformaInvoice.findMany({
    where: { organisationId: resolvedOrgId },
    include: {
      client: {
        select: {
          id: true,
          clientNumber: true,
          companyName: true,
          contactPerson: true,
          email: true,
          phoneNumber: true,
        },
      },
      generatedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProformaById(id: string) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id },
    include: {
      organisation: {
        include: { setting: true },
      },
      client: {
        include: {
          salesStaff: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              phoneNumber: true,
            },
          },
          services: {
            include: {
              serviceItem: {
                include: { category: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      generatedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  return proforma;
}

export async function createProforma(data: CreateProformaInput) {
  const resolvedOrgId = await resolveOrganisationId(data.organisationId);
  if (!resolvedOrgId) {
    throw new Error("Invalid organization specified");
  }

  let clientId = data.clientId;
  let targetSalesStaffId: string | null = null;

  // 1. If creating a new client on the fly
  if (!clientId && data.clientData) {
    if (!data.clientData.companyName?.trim()) {
      throw new Error("Company name is required for new client");
    }
    const clientNumber = await generateNextClientNumber();
    targetSalesStaffId = data.clientData.salesStaffId || null;

    const newClient = await prisma.client.create({
      data: {
        organisationId: resolvedOrgId,
        clientNumber,
        companyName: data.clientData.companyName.trim(),
        contactPerson: (data.clientData.contactPerson || data.clientData.companyName).trim(),
        assignedPerson: (data.clientData.contactPerson || data.clientData.companyName).trim(),
        email: data.clientData.email?.trim() || `${data.clientData.companyName.replace(/\s+/g, ".").toLowerCase()}@client.ae`,
        phoneNumber: data.clientData.phoneNumber?.trim() || "+971500000000",
        whatsappNumber: data.clientData.whatsappNumber?.trim() || null,
        trnNumber: data.clientData.trnNumber?.trim() || null,
        address: data.clientData.address?.trim() || null,
        salesStaffId: targetSalesStaffId,
        status: "WORK_PENDING_PAYMENT",
      },
    });

    clientId = newClient.id;

    // Initialize Financial Wallet
    await prisma.clientWallet.create({
      data: {
        clientId: newClient.id,
        organisationId: resolvedOrgId,
        balance: 0.0,
        currency: data.currency || "AED",
      },
    });
  }

  if (!clientId) {
    throw new Error("Client ID or Client Details must be provided");
  }

  const existingClient = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!existingClient) {
    throw new Error("Client not found");
  }
  if (!targetSalesStaffId) {
    targetSalesStaffId = existingClient.salesStaffId;
  }

  // 2. Validate selected services
  if (!data.services || data.services.length === 0) {
    throw new Error("At least one service must be selected for the proforma invoice");
  }

  const serviceItemIds = data.services.map((s) => s.serviceItemId);
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

  // 3. Record service items for the client
  for (const srvInput of data.services) {
    const dbSrv = serviceMap.get(srvInput.serviceItemId);
    const qty = srvInput.quantity && srvInput.quantity > 0 ? srvInput.quantity : 1;
    const unitBase = srvInput.basePrice !== undefined
      ? new Prisma.Decimal(srvInput.basePrice)
      : dbSrv?.basePrice || new Prisma.Decimal(0);
    const unitComm = new Prisma.Decimal(srvInput.commissionAmount || 0);

    const basePrice = unitBase.mul(qty);
    const commissionAmount = unitComm.mul(qty);
    const totalPrice = basePrice.plus(commissionAmount);

    subTotal = subTotal.plus(basePrice);
    totalCommission = totalCommission.plus(commissionAmount);
    grandTotal = grandTotal.plus(totalPrice);

    await prisma.clientServiceItem.create({
      data: {
        clientId: existingClient.id,
        serviceItemId: srvInput.serviceItemId,
        organisationId: resolvedOrgId,
        basePrice,
        commissionAmount,
        totalPrice,
        status: "PENDING_PAYMENT",
      },
    });
  }

  // 4. Generate sequential Proforma Number
  const proformaNumber = await generateNextProformaNumber();

  // 5. Create Proforma Invoice
  const proforma = await prisma.proformaInvoice.create({
    data: {
      organisationId: resolvedOrgId,
      clientId: existingClient.id,
      proformaNumber,
      subTotal,
      totalCommission,
      vatAmount: new Prisma.Decimal(0),
      grandTotal,
      currency: data.currency || "AED",
      status: (data.status as any) || "ISSUED",
      notes: data.notes || "Official Proforma Invoice quotation for client service intake",
      generatedById: data.generatedById || targetSalesStaffId || null,
    },
  });

  return getProformaById(proforma.id);
}

export async function deleteProforma(id: string) {
  const existing = await prisma.proformaInvoice.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Proforma invoice not found");
  }

  await prisma.proformaInvoice.delete({
    where: { id },
  });

  return { message: "Proforma invoice deleted successfully" };
}
