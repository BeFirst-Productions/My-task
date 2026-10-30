import type { Role } from "../../generated/client/index.js";

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
  category: "Core Operations" | "Operations" | "Finance" | "Intelligence" | "Administration" | "Custom";
  availableActions: ModuleActionDef[];
}

/**
 * Standard modules across the SaaS CRM platform with their available granular CRUD actions.
 * Only actions that are logically available for a module are defined.
 */
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
    description: "Client profiles, businesses, wallet balance, and intake",
    category: "Core Operations",
    availableActions: [
      { action: "list", label: "View / List", description: "Browse client profiles" },
      { action: "create", label: "Create", description: "Onboard new client accounts" },
      { action: "edit", label: "Edit / Convert", description: "Update client details and convert to work" },
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
    id: "services",
    label: "Service Management",
    description: "Main service categories, sub-services, and pricing catalog",
    category: "Core Operations",
    availableActions: [
      { action: "list", label: "View Catalog", description: "Browse services and pricing" },
      { action: "create", label: "Add Service", description: "Create categories and sub-services" },
      { action: "edit", label: "Edit Service", description: "Update service pricing and details" },
      { action: "delete", label: "Delete Service", description: "Remove services from catalog" },
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

export type CrmModuleId = (typeof CRM_MODULES)[number]["id"];

/**
 * Default CRUD actions provisioned canonically per role
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Record<string, ModuleAction[]>> = {
  SUPER_ADMIN: {
    dashboard: ["view"],
    clients: ["list", "create", "edit", "delete"],
    work_orders: ["list", "create", "edit", "delete"],
    tasks: ["list", "create", "edit", "delete"],
    services: ["list", "create", "edit", "delete"],
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
    services: ["list", "create", "edit", "delete"],
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
  PLATFORM_OWNER: {
    dashboard: ["view"],
    users: ["list", "create", "edit", "delete"],
    reports: ["list", "export"],
    settings: ["view", "edit"],
  },
};

export const ROLE_PERMITTED_MODULES: Record<Role, CrmModuleId[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "clients",
    "work_orders",
    "tasks",
    "services",
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
    "services",
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
  PLATFORM_OWNER: [
    "dashboard",
    "users",
    "reports",
    "settings",
  ],
};

/**
 * Available assignable roles for an Organization in the CRM.
 * Excludes PLATFORM_OWNER which is global SaaS infrastructure only.
 */
export const ORGANISATION_AVAILABLE_ROLES = [
  {
    role: "SUPER_ADMIN" as Role,
    name: "Super Admin",
    description: "Account owner with full unrestricted access to all modules and configurations.",
    badgeColor: "amber",
  },
  {
    role: "ADMIN" as Role,
    name: "Administrator",
    description: "Office-wide operations, client intake, work order oversight, and staff assignment.",
    badgeColor: "purple",
  },
  {
    role: "SALES_STAFF" as Role,
    name: "Sales Staff",
    description: "Client consultation, requirements gathering, commission setup, and proforma generation.",
    badgeColor: "emerald",
  },
  {
    role: "ACCOUNTANT" as Role,
    name: "Accounts Manager",
    description: "Financial intake, advance payment logging, client wallet top-ups, and invoice verification.",
    badgeColor: "cyan",
  },
  {
    role: "STAFF" as Role,
    name: "Staff Member",
    description: "Operational execution of assigned service tasks and deliverable document uploads.",
    badgeColor: "blue",
  },
] as const;

/**
 * Resolves the available modules for a specific organization.
 * Supports distinct and custom modules per organization.
 */
export function getOrganisationModules(orgEnabledModules?: any): CrmModule[] {
  if (!orgEnabledModules) {
    return [...CRM_MODULES];
  }

  if (Array.isArray(orgEnabledModules)) {
    const idSet = new Set(orgEnabledModules.map(String));
    return CRM_MODULES.filter((m) => idSet.has(m.id));
  }

  return [...CRM_MODULES];
}

/**
 * Resolves a user's permissions, taking custom permissions into account
 * and filtering them to the organization's enabled modules.
 */
export function resolveUserPermissions(
  role: Role | string,
  customPermissions?: any,
  orgEnabledModules?: any
): Record<string, ModuleAction[]> {
  const orgModules = getOrganisationModules(orgEnabledModules);
  const orgModuleIds = new Set(orgModules.map((m) => m.id));

  // If user has custom permissions saved by Super Admin:
  if (
    customPermissions &&
    typeof customPermissions === "object" &&
    !Array.isArray(customPermissions) &&
    Object.keys(customPermissions).length > 0
  ) {
    const resolved: Record<string, ModuleAction[]> = {};
    for (const [modId, actions] of Object.entries(customPermissions)) {
      if (orgModuleIds.has(modId) && Array.isArray(actions) && actions.length > 0) {
        resolved[modId] = actions as ModuleAction[];
      }
    }
    return resolved;
  }

  // Fallback to role default permissions scoped to organization's modules
  const defaults =
    ROLE_DEFAULT_PERMISSIONS[role as Role] || ROLE_DEFAULT_PERMISSIONS.STAFF;
  const resolved: Record<string, ModuleAction[]> = {};
  for (const [modId, actions] of Object.entries(defaults)) {
    if (orgModuleIds.has(modId)) {
      resolved[modId] = [...actions];
    }
  }
  return resolved;
}

/**
 * Returns the permitted modules for a given role/user.
 */
export function getPermittedModulesForRole(
  role?: string | null,
  customPermissions?: any,
  orgEnabledModules?: any
): string[] {
  const permissions = resolveUserPermissions(
    role || "STAFF",
    customPermissions,
    orgEnabledModules
  );
  return Object.keys(permissions).filter((mod) => (permissions[mod]?.length ?? 0) > 0);
}
