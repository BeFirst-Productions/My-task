import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";
import { Prisma } from "../../generated/client/index.js";

export interface ListWorkOrdersQuery {
  organisationId?: string;
  status?: string;
  assignedStaffId?: string;
  userRole?: string;
  currentUserId?: string;
  search?: string;
}

export async function listWorkOrders(params: ListWorkOrdersQuery) {
  const resolvedOrgId = await resolveOrganisationId(params.organisationId);
  if (!resolvedOrgId) return [];

  const whereClause: any = {
    organisationId: resolvedOrgId,
  };

  // If the logged-in user is STAFF, enforce strict isolation: show only services assigned to them
  if (params.userRole === "STAFF" && params.currentUserId) {
    whereClause.assignedStaffId = params.currentUserId;
  } else if (params.assignedStaffId && params.assignedStaffId !== "ALL") {
    whereClause.assignedStaffId = params.assignedStaffId;
  }

  if (params.status && params.status !== "ALL") {
    whereClause.status = params.status;
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    whereClause.OR = [
      { client: { companyName: { contains: s, mode: "insensitive" } } },
      { client: { contactPerson: { contains: s, mode: "insensitive" } } },
      { client: { clientNumber: { contains: s, mode: "insensitive" } } },
      { serviceItem: { name: { contains: s, mode: "insensitive" } } },
    ];
  }

  return prisma.clientServiceItem.findMany({
    where: whereClause,
    include: {
      client: {
        include: {
          wallet: {
            select: { balance: true, currency: true },
          },
        },
      },
      serviceItem: {
        include: { category: true },
      },
      assignedStaff: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          designation: true,
          department: true,
          isAvailable: true,
          activeTasksCount: true,
        },
      },
      completionDoc: true,
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export interface AssignServicesInput {
  organisationId?: string;
  serviceItemIds: string[];
  staffId: string;
  assignedById?: string;
}

export async function assignServicesToStaff(input: AssignServicesInput) {
  const { serviceItemIds, staffId, assignedById } = input;
  const resolvedOrgId = await resolveOrganisationId(input.organisationId);

  if (!resolvedOrgId) {
    throw new Error("Invalid organization specified");
  }
  if (!serviceItemIds || serviceItemIds.length === 0) {
    throw new Error("Please select at least one service to assign");
  }
  if (!staffId) {
    throw new Error("Please select an operational staff member to assign");
  }

  // Execute atomic assignment guarded by client wallet balances
  return prisma.$transaction(async (tx) => {
    // 1. Verify staff member
    const staff = await tx.user.findFirst({
      where: { id: staffId, organisationId: resolvedOrgId },
    });
    if (!staff) {
      throw new Error("Selected staff member does not belong to this organisation");
    }

    // 2. Fetch selected services
    const services = await tx.clientServiceItem.findMany({
      where: {
        id: { in: serviceItemIds },
        organisationId: resolvedOrgId,
      },
      include: {
        client: {
          include: { wallet: true },
        },
        serviceItem: true,
      },
    });

    if (services.length !== serviceItemIds.length) {
      throw new Error("One or more selected services could not be found");
    }

    // Ensure all services are in assignable state
    for (const srv of services) {
      if (srv.status === "COMPLETED") {
        throw new Error(`Service "${srv.serviceItem.name}" is already completed and cannot be reassigned`);
      }
    }

    // 3. Group by Client and calculate required amount
    const clientMap = new Map<
      string,
      {
        client: typeof services[0]["client"];
        services: typeof services;
        totalRequired: Prisma.Decimal;
      }
    >();

    for (const srv of services) {
      const clientId = srv.clientId;
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client: srv.client,
          services: [],
          totalRequired: new Prisma.Decimal(0),
        });
      }
      const entry = clientMap.get(clientId)!;
      entry.services.push(srv);
      entry.totalRequired = entry.totalRequired.plus(srv.totalPrice);
    }

    // 4. WALLET BALANCE GUARD: Check each client has sufficient wallet balance
    for (const [, entry] of clientMap.entries()) {
      const wallet = entry.client.wallet;
      if (!wallet) {
        throw new Error(`Client "${entry.client.companyName}" does not have an active financial wallet`);
      }

      if (wallet.balance.lessThan(entry.totalRequired)) {
        const shortfall = entry.totalRequired.minus(wallet.balance);
        throw new Error(
          `Insufficient wallet balance for client "${entry.client.companyName}". Required: AED ${entry.totalRequired.toFixed(
            2
          )}, Current Balance: AED ${wallet.balance.toFixed(2)}. Shortfall: AED ${shortfall.toFixed(
            2
          )}. Please request top-up from client before assigning this work.`
        );
      }
    }

    // 5. Debit Wallets and Record Transactions
    for (const [clientId, entry] of clientMap.entries()) {
      const wallet = entry.client.wallet!;
      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore.minus(entry.totalRequired);

      // Debit Client Wallet
      await tx.clientWallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      // Record Debit Transaction in Ledger
      const serviceNames = entry.services.map((s) => s.serviceItem.name).join(", ");
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          organisationId: resolvedOrgId,
          type: "DEBIT_SERVICE_ASSIGNMENT",
          amount: entry.totalRequired,
          balanceBefore,
          balanceAfter,
          description: `Service assignment debit for ${entry.services.length} task(s): ${serviceNames}`,
          createdById: assignedById || null,
        },
      });

      // Update Client status to IN_PROGRESS
      await tx.client.update({
        where: { id: clientId },
        data: { status: "IN_PROGRESS" },
      });
    }

    // 6. Update ClientServiceItems to ASSIGNED
    await tx.clientServiceItem.updateMany({
      where: { id: { in: serviceItemIds } },
      data: {
        status: "ASSIGNED",
        assignedStaffId: staff.id,
        assignedAt: new Date(),
      },
    });

    // 7. Update staff workload and availability
    const newActiveCount = (staff.activeTasksCount || 0) + serviceItemIds.length;
    await tx.user.update({
      where: { id: staff.id },
      data: {
        activeTasksCount: newActiveCount,
        isAvailable: newActiveCount < 4,
      },
    });

    return {
      assignedCount: serviceItemIds.length,
      staffName: staff.fullName || staff.username,
    };
  });
}

export interface UpdateWorkOrderStatusInput {
  serviceItemId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  completionDocName?: string;
  completionDocUrl?: string;
  completionNotes?: string;
  userId?: string;
}

export async function updateWorkOrderStatus(input: UpdateWorkOrderStatusInput) {
  const { serviceItemId, status, completionDocName, completionDocUrl, completionNotes, userId } = input;

  return prisma.$transaction(async (tx) => {
    const srv = await tx.clientServiceItem.findUnique({
      where: { id: serviceItemId },
      include: {
        assignedStaff: true,
        client: true,
      },
    });

    if (!srv) {
      throw new Error("Work order service item not found");
    }

    let completionDocId: string | null = null;

    if (status === "COMPLETED") {
      // Optional Document Upload: If a completed deliverable is uploaded, register it in the Client Vault
      if (completionDocUrl && completionDocUrl.trim()) {
        const doc = await tx.document.create({
          data: {
            organisationId: srv.organisationId,
            clientId: srv.clientId,
            documentName: completionDocName?.trim() || "Completed Deliverable Document",
            documentUrl: completionDocUrl.trim(),
            status: "ACTIVE",
            uploadedById: userId || null,
            description: completionNotes || `Completed deliverable for service item ${serviceItemId}`,
          },
        });
        completionDocId = doc.id;
      }

      // Update service status to COMPLETED
      await tx.clientServiceItem.update({
        where: { id: serviceItemId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completionDocId: completionDocId || undefined,
          completionNotes: completionNotes?.trim() || null,
        },
      });

      // Decrement staff workload counter and mark available
      if (srv.assignedStaffId) {
        const staff = await tx.user.findUnique({ where: { id: srv.assignedStaffId } });
        if (staff) {
          const updatedActive = Math.max(0, (staff.activeTasksCount || 1) - 1);
          await tx.user.update({
            where: { id: staff.id },
            data: {
              activeTasksCount: updatedActive,
              isAvailable: true,
            },
          });
        }
      }

      // Check if all client services are finished; if so, update Client to COMPLETED
      const remainingUnfinished = await tx.clientServiceItem.count({
        where: {
          clientId: srv.clientId,
          status: { not: "COMPLETED" },
        },
      });

      if (remainingUnfinished === 0) {
        await tx.client.update({
          where: { id: srv.clientId },
          data: { status: "COMPLETED" },
        });
      }
    } else {
      // Transition to IN_PROGRESS
      await tx.clientServiceItem.update({
        where: { id: serviceItemId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return tx.clientServiceItem.findUnique({
      where: { id: serviceItemId },
      include: {
        serviceItem: true,
        assignedStaff: true,
        completionDoc: true,
      },
    });
  });
}
