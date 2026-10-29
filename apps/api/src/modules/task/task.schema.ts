export interface CreateTaskDTO {
  id?: string;
  taskNumber?: number;
  title: string;
  client: string;
  clientId?: string;
  assignedToUserId?: string; // Foreign key linking to the users table created by Super Admin
  assignedTo: {
    id?: string;
    name: string;
    initials: string;
    avatarColor?: string;
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
  organisationId?: string;
}

export interface StaffResponseDTO {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
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
