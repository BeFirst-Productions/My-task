import { getStoredToken } from "./auth.service";

export type ModuleAction =
  | "list"
  | "create"
  | "edit"
  | "delete"
  | "view"
  | "export"
  | "dismiss";

export interface ModuleActionDef {
  action: ModuleAction;
  label: string;
  description: string;
}

export interface CrmModule {
  id: string;
  label: string;
  description: string;
  category?: "Core Operations" | "Operations" | "Finance" | "Intelligence" | "Administration" | "Custom";
  availableActions?: ModuleActionDef[];
}

export interface UserItem {
  id: string;
  organisationId: string | null;
  fullName: string | null;
  email: string;
  username: string;
  phoneNumber: string;
  role: "PLATFORM_OWNER" | "SUPER_ADMIN" | "ADMIN" | "STAFF" | "SALES_STAFF" | "ACCOUNTANT";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
  department: string | null;
  designation: string | null;
  isAvailable?: boolean;
  activeTasksCount?: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  customPermissions?: Record<string, ModuleAction[]> | null;
  permissions?: Record<string, ModuleAction[]>;
  permittedModules?: string[];
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
    status: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string | null;
    username: string;
  } | null;
}

export type OrgRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "SALES_STAFF" | "ACCOUNTANT";

export interface RoleDefinition {
  role: OrgRole;
  name: string;
  description: string;
  badgeColor: string;
}

export const CRM_MODULES: CrmModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Analytical overview, metrics, and KPI widgets",
    category: "Core Operations",
    availableActions: [
      { action: "view", label: "View Analytics", description: "View metrics and KPI dashboards" },
    ],
  },
  {
    id: "clients",
    label: "Client Management",
    description: "Client profiles, businesses, and contact directory",
    category: "Core Operations",
    availableActions: [
      { action: "list", label: "View / List", description: "Browse client profiles" },
      { action: "create", label: "Create", description: "Onboard new client accounts" },
      { action: "edit", label: "Edit", description: "Update client details and profiles" },
      { action: "delete", label: "Delete", description: "Remove client records" },
    ],
  },
  {
    id: "work_orders",
    label: "Work Orders",
    description: "Operational service orders, multi-service task assignment, and delivery tracking",
    category: "Core Operations",
    availableActions: [
      { action: "list", label: "View / List", description: "Browse active work orders" },
      { action: "create", label: "Assign Staff", description: "Assign service tasks to available staff" },
      { action: "edit", label: "Update Status", description: "Update progress and upload deliverable" },
      { action: "delete", label: "Cancel", description: "Cancel service work orders" },
    ],
  },
  {
    id: "tasks",
    label: "Intake & Tasks",
    description: "Initial client intake leads, assignments, and ad-hoc office tasks",
    category: "Core Operations",
    availableActions: [
      { action: "list", label: "View / List", description: "Browse task boards and lists" },
      { action: "create", label: "Create", description: "Create tasks and assign members" },
      { action: "edit", label: "Edit", description: "Update task progress and stages" },
      { action: "delete", label: "Delete", description: "Delete workflow tasks" },
    ],
  },
  {
    id: "documents",
    label: "Document Management",
    description: "Client documents, verification, vault, and uploads",
    category: "Core Operations",
    availableActions: [
      { action: "list", label: "View / List", description: "Browse document vault" },
      { action: "create", label: "Upload", description: "Upload client documents" },
      { action: "edit", label: "Verify", description: "Review and verify documents" },
      { action: "delete", label: "Delete", description: "Remove documents from vault" },
    ],
  },
  {
    id: "alerts",
    label: "Alerts & Notifications",
    description: "Urgent notices, reminders, and system alerts",
    category: "Operations",
    availableActions: [
      { action: "list", label: "View Alerts", description: "Receive alerts & notices" },
      { action: "dismiss", label: "Dismiss", description: "Acknowledge and dismiss alerts" },
    ],
  },
  {
    id: "invoices",
    label: "Invoices & Proforma",
    description: "Billing, proforma invoices, fee receipts, and financial records",
    category: "Finance",
    availableActions: [
      { action: "list", label: "View / List", description: "Browse invoices & statements" },
      { action: "create", label: "Generate", description: "Create invoices and proforma quotes" },
      { action: "edit", label: "Edit", description: "Modify fee structures & notes" },
      { action: "delete", label: "Void / Delete", description: "Void or delete invoices" },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    description: "Operational performance, activity logs, and exportable reports",
    category: "Intelligence",
    availableActions: [
      { action: "list", label: "View Reports", description: "View analytics reports and summaries" },
      { action: "export", label: "Export Data", description: "Export CSV / PDF records" },
    ],
  },
  {
    id: "users",
    label: "User Management",
    description: "Staff roster, access control, and user provisioning",
    category: "Administration",
    availableActions: [
      { action: "list", label: "View Roster", description: "View team roster and members" },
      { action: "create", label: "Add Member", description: "Create and invite new members" },
      { action: "edit", label: "Edit / Suspend", description: "Update roles and status" },
      { action: "delete", label: "Delete", description: "Remove member accounts" },
    ],
  },
  {
    id: "settings",
    label: "Organization Settings",
    description: "Company branding, integrations, and preferences",
    category: "Administration",
    availableActions: [
      { action: "view", label: "View Settings", description: "View company profile and configurations" },
      { action: "edit", label: "Edit Settings", description: "Update branding, integrations, and preferences" },
    ],
  },
];

export const ORGANISATION_AVAILABLE_ROLES: RoleDefinition[] = [
  {
    role: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Account owner with full unrestricted access to all modules and configurations.",
    badgeColor: "amber",
  },
  {
    role: "ADMIN",
    name: "Administrator",
    description: "Office-wide operations, client intake, work order oversight, and staff assignment.",
    badgeColor: "purple",
  },
  {
    role: "SALES_STAFF",
    name: "Sales Staff",
    description: "Client consultation, requirements gathering, commission setup, and proforma generation.",
    badgeColor: "emerald",
  },
  {
    role: "ACCOUNTANT",
    name: "Accounts Manager",
    description: "Financial intake, advance payment logging, client wallet top-ups, and invoice verification.",
    badgeColor: "cyan",
  },
  {
    role: "STAFF",
    name: "Staff Member",
    description: "Operational execution of assigned service tasks and deliverable document uploads.",
    badgeColor: "blue",
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<OrgRole, Record<string, ModuleAction[]>> = {
  SUPER_ADMIN: {
    dashboard: ["view"],
    clients: ["list", "create", "edit", "delete"],
    work_orders: ["list", "create", "edit", "delete"],
    tasks: ["list", "create", "edit", "delete"],
    documents: ["list", "create", "edit", "delete"],
    alerts: ["list", "dismiss"],
    invoices: ["list", "create", "edit", "delete"],
    reports: ["list", "export"],
    users: ["list", "create", "edit", "delete"],
    settings: ["view", "edit"],
  },
  ADMIN: {
    dashboard: ["view"],
    clients: ["list", "create", "edit", "delete"],
    work_orders: ["list", "create", "edit", "delete"],
    tasks: ["list", "create", "edit", "delete"],
    documents: ["list", "create", "edit", "delete"],
    alerts: ["list", "dismiss"],
    invoices: ["list", "create", "edit", "delete"],
    reports: ["list", "export"],
  },
  SALES_STAFF: {
    dashboard: ["view"],
    clients: ["list", "create", "edit"],
    tasks: ["list", "create", "edit"],
    invoices: ["list", "create"],
    documents: ["list", "create"],
    alerts: ["list", "dismiss"],
  },
  ACCOUNTANT: {
    dashboard: ["view"],
    clients: ["list", "edit"],
    work_orders: ["list"],
    invoices: ["list", "create", "edit"],
    reports: ["list", "export"],
    alerts: ["list", "dismiss"],
  },
  STAFF: {
    dashboard: ["view"],
    work_orders: ["list", "edit"],
    tasks: ["list", "edit"],
    documents: ["list", "create"],
    alerts: ["list", "dismiss"],
  },
};

export const ROLE_PERMITTED_MODULES: Record<OrgRole, string[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "clients",
    "work_orders",
    "tasks",
    "documents",
    "alerts",
    "invoices",
    "reports",
    "users",
    "settings",
  ],
  ADMIN: [
    "dashboard",
    "clients",
    "work_orders",
    "tasks",
    "documents",
    "alerts",
    "invoices",
    "reports",
  ],
  SALES_STAFF: [
    "dashboard",
    "clients",
    "tasks",
    "invoices",
    "documents",
    "alerts",
  ],
  ACCOUNTANT: [
    "dashboard",
    "clients",
    "work_orders",
    "invoices",
    "reports",
    "alerts",
  ],
  STAFF: [
    "dashboard",
    "work_orders",
    "tasks",
    "documents",
    "alerts",
  ],
};

export function getPermittedModulesForRole(role?: string | null): string[] {
  if (!role) return [...ROLE_PERMITTED_MODULES.STAFF];
  return ROLE_PERMITTED_MODULES[role as OrgRole] || [...ROLE_PERMITTED_MODULES.STAFF];
}

/**
 * Resolves permissions for a user given their role and custom permissions
 */
export function resolveUserPermissions(
  role: string,
  customPermissions?: Record<string, ModuleAction[]> | null,
  availableModuleIds?: string[]
): Record<string, ModuleAction[]> {
  const allowedSet = availableModuleIds ? new Set(availableModuleIds) : null;

  if (
    customPermissions &&
    typeof customPermissions === "object" &&
    !Array.isArray(customPermissions) &&
    Object.keys(customPermissions).length > 0
  ) {
    const res: Record<string, ModuleAction[]> = {};
    for (const [mod, acts] of Object.entries(customPermissions)) {
      if (!allowedSet || allowedSet.has(mod)) {
        if (Array.isArray(acts) && acts.length > 0) {
          res[mod] = acts as ModuleAction[];
        }
      }
    }
    return res;
  }

  const defaults =
    ROLE_DEFAULT_PERMISSIONS[role as OrgRole] || ROLE_DEFAULT_PERMISSIONS.STAFF;
  const res: Record<string, ModuleAction[]> = {};
  for (const [mod, acts] of Object.entries(defaults)) {
    if (!allowedSet || allowedSet.has(mod)) {
      res[mod] = [...acts];
    }
  }
  return res;
}

/**
 * Fetches available roles and permitted modules from backend API
 */
export async function fetchAvailableRoles(): Promise<{
  roles: RoleDefinition[];
  modules: CrmModule[];
  roleModules: Record<string, string[]>;
  roleDefaultPermissions?: Record<string, Record<string, ModuleAction[]>>;
}> {
  try {
    const res = await fetch("/api/org/users/roles", {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (res.ok && data.success && data.data) {
      return data.data;
    }
  } catch (err) {
    console.warn("Could not fetch remote roles, falling back to local definitions:", err);
  }
  return {
    roles: ORGANISATION_AVAILABLE_ROLES,
    modules: CRM_MODULES,
    roleModules: ROLE_PERMITTED_MODULES,
    roleDefaultPermissions: ROLE_DEFAULT_PERMISSIONS,
  };
}

export interface UserPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateTenantUserPayload {
  fullName: string;
  email: string;
  username?: string;
  phoneNumber: string;
  password: string;
  role: OrgRole;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  department?: string;
  designation?: string;
  customPermissions?: Record<string, ModuleAction[]> | null;
}

export interface UpdateTenantUserPayload {
  fullName?: string;
  phoneNumber?: string;
  role?: OrgRole;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  department?: string;
  designation?: string;
  password?: string;
  customPermissions?: Record<string, ModuleAction[]> | null;
}

function getAuthHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch users belonging to the logged-in organization
 */
export async function getTenantUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  department?: string;
}): Promise<{ users: UserItem[]; pagination: UserPagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  if (params?.role) searchParams.set("role", params.role);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.department) searchParams.set("department", params.department);

  const res = await fetch(`/api/org/users?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to fetch organization users");
  }

  return {
    users: data.data || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1, hasMore: false },
  };
}

/**
 * Add a new user to the organization
 */
export async function createTenantUser(payload: CreateTenantUserPayload): Promise<UserItem> {
  const res = await fetch("/api/org/users", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to create organization user");
  }

  return data.data;
}

/**
 * Update an existing organization user
 */
export async function updateTenantUser(id: string, payload: UpdateTenantUserPayload): Promise<UserItem> {
  const res = await fetch(`/api/org/users/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to update user");
  }

  return data.data;
}

/**
 * Update user status (ACTIVE, INACTIVE, SUSPENDED)
 */
export async function updateTenantUserStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
): Promise<UserItem> {
  return updateTenantUser(id, { status });
}

/**
 * Delete an organization user
 */
export async function deleteTenantUser(id: string): Promise<void> {
  const res = await fetch(`/api/org/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to delete user");
  }
}

/**
 * Platform Owner: Fetch all users across all tenants
 */
export async function getPlatformUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  organisationId?: string;
  role?: string;
  status?: string;
}): Promise<{ users: UserItem[]; pagination: UserPagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  if (params?.organisationId) searchParams.set("organisationId", params.organisationId);
  if (params?.role) searchParams.set("role", params.role);
  if (params?.status) searchParams.set("status", params.status);

  const res = await fetch(`/api/platform/users?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to fetch platform users");
  }

  return {
    users: data.data || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1, hasMore: false },
  };
}

/**
 * Platform Owner: Update user status globally
 */
export async function updatePlatformUserStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<UserItem> {
  const res = await fetch(`/api/platform/users/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to update user status");
  }

  return data.data;
}
