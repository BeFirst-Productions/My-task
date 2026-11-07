import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";
import { getDbForOrganisation } from "../document/document.service.js";

// Role-based default permitted modules
const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  SUPER_ADMIN: ["clients", "work_orders", "tasks", "services", "documents", "invoices", "reports", "users", "settings", "tokens"],
  PLATFORM_OWNER: ["clients", "work_orders", "tasks", "services", "documents", "invoices", "reports", "users", "settings", "tokens"],
  ADMIN: ["clients", "work_orders", "tasks", "services", "documents", "invoices", "reports"],
  SALES_STAFF: ["clients", "tasks", "invoices", "documents"],
  ACCOUNTANT: ["clients", "work_orders", "invoices", "reports"],
  STAFF: ["work_orders", "tasks", "documents"],
};

export interface GlobalSearchParams {
  q: string;
  organisationId?: string;
  userRole?: string;
  currentUserId?: string;
  permittedModules?: string[] | string;
}

export function evaluateUserPermissions(role?: string, customPerms?: string[] | string): {
  canSearchClients: boolean;
  canSearchTasks: boolean;
  canSearchDocuments: boolean;
} {
  const normRole = (role || "").toUpperCase();
  if (normRole === "SUPER_ADMIN" || normRole === "PLATFORM_OWNER") {
    return {
      canSearchClients: true,
      canSearchTasks: true,
      canSearchDocuments: true,
    };
  }

  // Combine default role modules with any custom permissions granted by Super Admin
  const permitted = new Set<string>(ROLE_DEFAULT_MODULES[normRole] || ROLE_DEFAULT_MODULES.STAFF);

  if (customPerms) {
    let extraList: string[] = [];
    if (Array.isArray(customPerms)) {
      extraList = customPerms;
    } else if (typeof customPerms === "string") {
      try {
        const parsed = JSON.parse(customPerms);
        if (Array.isArray(parsed)) {
          extraList = parsed;
        } else if (typeof parsed === "object" && parsed !== null) {
          extraList = Object.keys(parsed);
        }
      } catch {
        extraList = customPerms.split(",").map((s) => s.trim());
      }
    }

    for (const item of extraList) {
      if (item) permitted.add(item.toLowerCase().replace(/-/g, "_"));
    }
  }

  const canSearchClients =
    permitted.has("clients") ||
    permitted.has("client_management") ||
    permitted.has("client_list");

  const canSearchTasks =
    permitted.has("tasks") ||
    permitted.has("work_orders") ||
    permitted.has("services") ||
    permitted.has("task_list") ||
    permitted.has("task_management");

  const canSearchDocuments =
    permitted.has("documents") ||
    permitted.has("document_management") ||
    permitted.has("doc_list");

  return { canSearchClients, canSearchTasks, canSearchDocuments };
}

export async function searchGlobal(params: GlobalSearchParams) {
  const { q, organisationId, userRole = "STAFF", currentUserId, permittedModules } = params;
  const searchTerm = (q || "").trim();

  const permissions = evaluateUserPermissions(userRole, permittedModules);

  if (!searchTerm || searchTerm.length < 1) {
    return {
      query: searchTerm,
      clients: [],
      tasks: [],
      documents: [],
      totalCount: 0,
      permissions,
    };
  }

  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) {
    return {
      query: searchTerm,
      clients: [],
      tasks: [],
      documents: [],
      totalCount: 0,
      permissions,
    };
  }

  const isSalesStaff = userRole === "SALES_STAFF";
  const isStaff = userRole === "STAFF";

  const [clients, tasks, documents] = await Promise.all([
    // 1. Clients Search (Strictly if permitted)
    permissions.canSearchClients
      ? prisma.client.findMany({
          where: {
            organisationId: resolvedOrgId,
            ...(isSalesStaff && currentUserId ? { salesStaffId: currentUserId } : {}),
            OR: [
              { companyName: { contains: searchTerm, mode: "insensitive" } },
              { contactPerson: { contains: searchTerm, mode: "insensitive" } },
              { clientNumber: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
              { phoneNumber: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            clientNumber: true,
            companyName: true,
            contactPerson: true,
            email: true,
            phoneNumber: true,
            status: true,
            salesStaff: { select: { fullName: true, username: true } },
          },
        })
      : Promise.resolve([]),

    // 2. Tasks & Work Orders Search (Strictly if permitted)
    permissions.canSearchTasks
      ? (async () => {
          const serviceItems = await prisma.clientServiceItem.findMany({
            where: {
              organisationId: resolvedOrgId,
              ...(isStaff && currentUserId ? { assignedStaffId: currentUserId } : {}),
              ...(isSalesStaff && currentUserId ? { client: { salesStaffId: currentUserId } } : {}),
              OR: [
                { serviceItem: { name: { contains: searchTerm, mode: "insensitive" } } },
                { serviceItem: { category: { name: { contains: searchTerm, mode: "insensitive" } } } },
                { client: { companyName: { contains: searchTerm, mode: "insensitive" } } },
                { client: { clientNumber: { contains: searchTerm, mode: "insensitive" } } },
                { client: { contactPerson: { contains: searchTerm, mode: "insensitive" } } },
              ],
            },
            take: 8,
            orderBy: { id: "desc" },
            include: {
              client: { select: { id: true, companyName: true, clientNumber: true } },
              serviceItem: { select: { name: true, category: { select: { name: true } } } },
              assignedStaff: { select: { id: true, fullName: true, username: true } },
            },
          });

          return serviceItems.map((item) => ({
            id: item.id,
            clientId: item.client?.id,
            clientName: item.client?.companyName || "Client",
            clientNumber: item.client?.clientNumber || "",
            title: item.serviceItem?.name || "Service Deliverable",
            category: item.serviceItem?.category?.name || "Service Task",
            status: item.status,
            totalPrice: Number(item.totalPrice || 0),
            assignedStaff: item.assignedStaff?.fullName || item.assignedStaff?.username || null,
            source: "work-order",
          }));
        })()
      : Promise.resolve([]),

    // 3. Documents Search (Strictly if permitted)
    permissions.canSearchDocuments
      ? (async () => {
          try {
            const { targetDb } = await getDbForOrganisation(resolvedOrgId);
            const docs = await targetDb.document.findMany({
              where: {
                organisationId: resolvedOrgId,
                OR: [
                  { documentName: { contains: searchTerm, mode: "insensitive" } },
                  { assignedPerson: { contains: searchTerm, mode: "insensitive" } },
                  { issuingAuthority: { contains: searchTerm, mode: "insensitive" } },
                  { client: { companyName: { contains: searchTerm, mode: "insensitive" } } },
                ],
              },
              take: 8,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                documentName: true,
                documentType: true,
                assignedPerson: true,
                expiryDate: true,
                status: true,
                documentUrl: true,
                client: { select: { id: true, companyName: true, clientNumber: true } },
              },
            });

            return docs.map((doc: any) => ({
              id: doc.id,
              documentName: doc.documentName,
              documentType: doc.documentType,
              assignedPerson: doc.assignedPerson,
              clientName: doc.client?.companyName || doc.assignedPerson || null,
              clientId: doc.client?.id || null,
              expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
              status: doc.status,
              documentUrl: doc.documentUrl,
              source: "document",
            }));
          } catch (err) {
            console.warn("Global document search error:", err);
            return [];
          }
        })()
      : Promise.resolve([]),
  ]);

  const totalCount = clients.length + tasks.length + documents.length;

  return {
    query: searchTerm,
    clients,
    tasks,
    documents,
    totalCount,
    permissions,
  };
}

