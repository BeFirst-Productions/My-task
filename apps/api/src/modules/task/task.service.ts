import { prisma } from "../../database/index.js";
import type { CreateTaskDTO, StaffResponseDTO } from "./task.schema.js";

// Deterministic avatar colors
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-pink-100 text-pink-700",
  "bg-emerald-100 text-emerald-700",
  "bg-purple-100 text-purple-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1]?.[0] || "";
  return (first + last).toUpperCase() || "ST";
}

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] || "bg-blue-100 text-blue-700";
}

function getSeatNumber(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const num = 101 + (Math.abs(hash) % 89);
  return `SEAT-${num}`;
}

/**
 * Resolves an organisation ID from an ID, subdomain, or slug, falling back to the default org.
 */
export async function resolveOrganisationId(orgIdOrSubdomain?: string): Promise<string | null> {
  if (!orgIdOrSubdomain || orgIdOrSubdomain === "org-default") {
    const defaultOrg = await prisma.organisation.findFirst({ select: { id: true } });
    return defaultOrg?.id || null;
  }
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { id: orgIdOrSubdomain },
        { subdomain: { equals: orgIdOrSubdomain, mode: "insensitive" } },
        { companyName: { equals: orgIdOrSubdomain, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return org?.id || orgIdOrSubdomain;
}

/**
 * Fetches staff members belonging strictly to a particular company from the `users` table.
 * Each company has separate users created by its Super Admin.
 */
export async function getCompanyStaff(orgIdOrSubdomain?: string): Promise<StaffResponseDTO[]> {
  const resolvedOrgId = await resolveOrganisationId(orgIdOrSubdomain);

  // Query database for all users belonging to this specific company
  const dbUsers = resolvedOrgId
    ? await prisma.user.findMany({
        where: {
          organisationId: resolvedOrgId,
          status: { not: "SUSPENDED" },
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          department: true,
          designation: true,
          organisationId: true,
          isAvailable: true,
          activeTasksCount: true,
        },
        orderBy: { fullName: "asc" },
      })
    : [];

  const staffFromDb: StaffResponseDTO[] = dbUsers.map((u) => {
    const name = u.fullName || u.username;
    return {
      id: u.id,
      name,
      email: u.email,
      username: u.username,
      role: u.role,
      department:
        u.department ||
        u.designation ||
        (u.role === "SUPER_ADMIN" ? "Management" : "Operations"),
      designation: u.designation || undefined,
      initials: getInitials(name),
      avatarColor: getAvatarColor(u.id + name),
      seatNo: getSeatNumber(u.id),
      phoneNumber: u.phoneNumber,
      organisationId: u.organisationId,
      isAvailable: u.isAvailable ?? true,
      activeTasksCount: u.activeTasksCount ?? 0,
    };
  });

  return staffFromDb;
}

// In-memory store for organisation tasks
/*
const _deprecatedOldTasks = [
  {
    id: "task-1",
    taskNumber: 1,
    title: "License Renewal Follow Up",
    client: "Al Noor Trading LLC",
    clientId: "CLI-9011",
    assignedTo: { name: "Ahmed Riyas", initials: "AR", avatarColor: "bg-blue-100 text-blue-700" },
    department: "PRO Services",
    priority: "High",
    status: "Pending",
    dueDate: "Oct 15, 2026",
    service: "Trade License Renewal",
    seatNo: "SEAT-104",
    currentSeatNo: "SEAT-104",
    createdAt: "2026-10-01",
  },
  {
    id: "task-2",
    taskNumber: 2,
    title: "Visa Document Collection",
    client: "Blue Sky Technical",
    clientId: "CLI-9012",
    assignedTo: { name: "Fatima Noor", initials: "FN", avatarColor: "bg-pink-100 text-pink-700" },
    department: "Documentation",
    priority: "Medium",
    status: "In Progress",
    dueDate: "Oct 12, 2026",
    service: "Visa Document Collection",
    seatNo: "SEAT-108",
    currentSeatNo: "SEAT-108",
    createdAt: "2026-10-02",
  },
  {
    id: "task-3",
    taskNumber: 3,
    title: "Client Onboarding",
    client: "Desert Line FZE",
    clientId: "CLI-9013",
    assignedTo: { name: "Salman K", initials: "SK", avatarColor: "bg-emerald-100 text-emerald-700" },
    department: "Business Setup",
    priority: "High",
    status: "Completed",
    dueDate: "Oct 10, 2026",
    service: "Business Setup & Onboarding",
    seatNo: "SEAT-112",
    currentSeatNo: "SEAT-112",
    createdAt: "2026-09-28",
  },
  {
    id: "task-4",
    taskNumber: 4,
    title: "Bank Account Follow Up",
    client: "Green Wave LLC",
    clientId: "CLI-9014",
    assignedTo: { name: "Reena Ali", initials: "RA", avatarColor: "bg-purple-100 text-purple-700" },
    department: "Banking Support",
    priority: "Medium",
    status: "Pending",
    dueDate: "Oct 18, 2026",
    service: "Corporate Bank Account Opening",
    seatNo: "SEAT-105",
    currentSeatNo: "SEAT-105",
    createdAt: "2026-10-03",
  },
  {
    id: "task-5",
    taskNumber: 5,
    title: "Document Verification",
    client: "Prime Star Trading",
    clientId: "CLI-9015",
    assignedTo: { name: "Hussain M", initials: "HM", avatarColor: "bg-cyan-100 text-cyan-700" },
    department: "Compliance",
    priority: "Low",
    status: "In Progress",
    dueDate: "Oct 14, 2026",
    service: "Compliance & Document Verification",
    seatNo: "SEAT-110",
    currentSeatNo: "SEAT-110",
    createdAt: "2026-10-04",
  },
  {
    id: "task-6",
    taskNumber: 6,
    title: "Client Meeting Schedule",
    client: "Al Falah Group",
    clientId: "CLI-9016",
    assignedTo: { name: "Rameez Ali", initials: "RA", avatarColor: "bg-amber-100 text-amber-700" },
    department: "Sales",
    priority: "Medium",
    status: "Completed",
    dueDate: "Oct 09, 2026",
    service: "Advisory & Consultation",
    seatNo: "SEAT-101",
    currentSeatNo: "SEAT-101",
    createdAt: "2026-09-25",
  },
  {
    id: "task-7",
    taskNumber: 7,
    title: "Trade License Application",
    client: "Skyline Industries",
    clientId: "CLI-9017",
    assignedTo: { name: "Sana Fathima", initials: "SF", avatarColor: "bg-violet-100 text-violet-700" },
    department: "Business Setup",
    priority: "High",
    status: "Pending",
    dueDate: "Oct 16, 2026",
    service: "Trade License Issuance",
    seatNo: "SEAT-115",
    currentSeatNo: "SEAT-115",
    createdAt: "2026-10-05",
  },
  {
    id: "task-8",
    taskNumber: 8,
    title: "Visa Renewal Processing",
    client: "Emerald Media",
    clientId: "CLI-9018",
    assignedTo: { name: "Huda", initials: "HU", avatarColor: "bg-amber-100 text-amber-800" },
    department: "PRO Services",
    priority: "Medium",
    status: "In Progress",
    dueDate: "Oct 11, 2026",
    service: "Employment Visa Renewal",
    seatNo: "SEAT-103",
    currentSeatNo: "SEAT-103",
    createdAt: "2026-10-02",
  },
  {
    id: "task-9",
    taskNumber: 9,
    title: "Client Document Update",
    client: "Golden Horizon",
    clientId: "CLI-9019",
    assignedTo: { name: "Rashid", initials: "RA", avatarColor: "bg-indigo-100 text-indigo-700" },
    department: "Documentation",
    priority: "Low",
    status: "Pending",
    dueDate: "Oct 20, 2026",
    service: "MOA Amendment & Attestation",
    seatNo: "SEAT-107",
    currentSeatNo: "SEAT-107",
    createdAt: "2026-10-06",
  },
  {
    id: "task-10",
    taskNumber: 10,
    title: "Final Agreement & Payment",
    client: "Atlas Technologies",
    clientId: "CLI-9020",
    assignedTo: { name: "Naseer", initials: "NA", avatarColor: "bg-orange-100 text-orange-700" },
    department: "Sales",
    priority: "High",
    status: "Overdue",
    dueDate: "Oct 08, 2026",
    service: "Contract Closing & Payment Settlement",
    seatNo: "SEAT-102",
    currentSeatNo: "SEAT-102",
    createdAt: "2026-09-20",
  },
];
*/

// In-memory backing store for organisation tasks (starts empty)
let inMemoryTasks: any[] = [];

export async function listTasks(organisationId?: string) {
  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) return inMemoryTasks;
  return inMemoryTasks.filter(
    (t) => !t.organisationId || t.organisationId === resolvedOrgId
  );
}

export async function createTask(input: CreateTaskDTO) {
  const resolvedOrgId = await resolveOrganisationId(input.organisationId);
  const newTask = {
    ...input,
    organisationId: resolvedOrgId || input.organisationId,
    id: input.id || `task-${Date.now()}`,
    taskNumber: input.taskNumber || inMemoryTasks.length + 1,
    createdAt: new Date().toISOString(),
  };
  inMemoryTasks = [newTask, ...inMemoryTasks];
  return newTask;
}

export async function updateTask(id: string, updates: Partial<CreateTaskDTO>) {
  const index = inMemoryTasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    inMemoryTasks[index] = {
      ...inMemoryTasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return inMemoryTasks[index];
  } else {
    const newTask = {
      id,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    inMemoryTasks = [newTask, ...inMemoryTasks];
    return newTask;
  }
}

export async function deleteTask(id: string) {
  inMemoryTasks = inMemoryTasks.filter((t) => t.id !== id);
  return { success: true };
}
