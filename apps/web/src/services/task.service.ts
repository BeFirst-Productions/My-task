export interface TaskItem {
  id: string;
  taskNumber: number;
  title: string;
  client: string;
  clientId?: string;
  assignedToUserId?: string; // Foreign key relation to the user in the users table
  assignedTo: {
    id?: string;
    name: string;
    initials: string;
    avatarColor: string; // e.g. "bg-blue-100 text-blue-700"
    email?: string;
    role?: string;
  };
  department: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  dueDate: string;
  service?: string;
  customService?: string;
  phoneNumber?: string;
  seatNo?: string;
  currentSeatNo?: string;
  details?: string;
  dotColor?: "blue" | "green" | "amber" | "rose";
  organisationId?: string;
  createdAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email?: string;
  username?: string;
  role?: string;
  department: string;
  designation?: string;
  initials: string;
  avatarColor: string;
  seatNo: string;
  phoneNumber?: string;
  organisationId?: string | null;
  isAvailable?: boolean;
  activeTasksCount?: number;
}

export interface TaskStats {
  totalTasks: number;
  totalChange: string;
  completed: number;
  completedChange: string;
  completionRate: string;
  pending: number;
  pendingChange: string;
  overdue: number;
  overdueChange: string;
  assignedToStaff: number;
  staffPercentage: string;
}

export const DEFAULT_TASKS: TaskItem[] = [];
const _mockTasks = [
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
    dotColor: "blue",
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
    dotColor: "blue",
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
    dotColor: "green",
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
    dotColor: "blue",
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
    dotColor: "green",
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
    dotColor: "blue",
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
    dotColor: "blue",
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
    dotColor: "blue",
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
    dotColor: "blue",
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
    dotColor: "blue",
    createdAt: "2026-09-20",
  },
];

export const DEFAULT_TASK_STATS: TaskStats = {
  totalTasks: 0,
  totalChange: "0%",
  completed: 0,
  completedChange: "0%",
  completionRate: "0% completion",
  pending: 0,
  pendingChange: "0%",
  overdue: 0,
  overdueChange: "0%",
  assignedToStaff: 0,
  staffPercentage: "0% of total",
};

export const AVAILABLE_STAFF: StaffMember[] = [];

export const AVAILABLE_CLIENTS = [
  { id: "cli-1", name: "Al Noor Trading LLC", clientId: "CLI-9011", phone: "50 123 4567" },
  { id: "cli-2", name: "Blue Sky Technical", clientId: "CLI-9012", phone: "52 987 6543" },
  { id: "cli-3", name: "Desert Line FZE", clientId: "CLI-9013", phone: "55 456 7890" },
  { id: "cli-4", name: "Green Wave LLC", clientId: "CLI-9014", phone: "56 321 0987" },
  { id: "cli-5", name: "Prime Star Trading", clientId: "CLI-9015", phone: "54 789 0123" },
  { id: "cli-6", name: "Al Falah Group", clientId: "CLI-9016", phone: "50 890 1234" },
  { id: "cli-7", name: "Skyline Industries", clientId: "CLI-9017", phone: "52 678 9012" },
  { id: "cli-8", name: "Emerald Media", clientId: "CLI-9018", phone: "55 234 5678" },
  { id: "cli-9", name: "Golden Horizon", clientId: "CLI-9019", phone: "56 901 2345" },
  { id: "cli-10", name: "Atlas Technologies", clientId: "CLI-9020", phone: "54 345 6789" },
];

export const AVAILABLE_SERVICES = [
  "Trade License Renewal",
  "Trade License Application",
  "Visa Document Collection",
  "Visa Renewal Processing",
  "Client Onboarding",
  "Corporate Bank Account Opening",
  "Document Verification",
  "Client Meeting Schedule",
  "MOA Amendment & Attestation",
  "Contract Closing & Payment Settlement",
  "Tax TRN Registration",
  "Labour Establishment Card",
  "Commercial Permit Application",
  "Other / Custom Service",
];

/**
 * Fetches staff members belonging strictly to a particular company from the users table.
 */
export async function fetchCompanyStaff(organisationId?: string): Promise<StaffMember[]> {
  try {
    const q = organisationId ? `?organisationId=${encodeURIComponent(organisationId)}` : "";
    const res = await fetch(`/api/tasks/staff${q}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch company staff from /api/tasks/staff, trying /api/org/users:", err);
  }

  // Fallback to /api/org/users if available
  try {
    const res = await fetch("/api/org/users?limit=50");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((u: any, idx: number) => {
          const name = u.fullName || u.username;
          const initials = name
            .split(" ")
            .map((p: string) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return {
            id: u.id,
            name,
            email: u.email,
            username: u.username,
            role: u.role,
            department: u.department || u.designation || (u.role === "SUPER_ADMIN" ? "Management" : "Operations"),
            designation: u.designation,
            initials: initials || "ST",
            avatarColor: "bg-blue-100 text-blue-700",
            seatNo: `SEAT-${101 + idx}`,
            phoneNumber: u.phoneNumber,
            organisationId: u.organisationId,
          };
        });
      }
    }
  } catch (err) {
    console.warn("Could not fetch from /api/org/users, using defaults:", err);
  }

  return [];
}

/**
 * Fetches tasks for an organisation from API
 */
export async function fetchTasks(organisationId?: string): Promise<TaskItem[]> {
  try {
    const q = organisationId ? `?organisationId=${encodeURIComponent(organisationId)}` : "";
    const res = await fetch(`/api/tasks${q}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch tasks:", err);
  }
  return [];
}

/**
 * Updates a task by ID via API
 */
export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem | null> {
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn("Failed to update task via API:", err);
  }
  return null;
}

/**
 * Deletes a task by ID via API
 */
export async function deleteTask(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const json = await res.json();
      return json.success === true;
    }
  } catch (err) {
    console.warn("Failed to delete task via API:", err);
  }
  return false;
}

