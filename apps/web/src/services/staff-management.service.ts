import { getAuthHeaders } from "./auth.service";

export type StaffLiveStatus =
  | "WORKING"
  | "ALMOST_DUE"
  | "OVERTIME"
  | "AVAILABLE"
  | "ON_BREAK"
  | "OFFLINE";

export interface StaffCardData {
  id: string;
  name: string;
  avatar?: string | null;
  initials: string;
  role: string;
  designation: string;
  department?: string | null;
  seatNo: string;
  status: StaffLiveStatus;
  statusLabel: string;
  isAvailable: boolean;
  currentClient: {
    name: string;
    clientId: string;
  } | null;
  currentService: {
    name: string;
    category?: string | null;
  } | null;
  timer: {
    elapsedSeconds: number;
    targetMinutes: number;
    formattedElapsed: string;
    formattedTarget: string;
    displayString: string;
    statusSubtext: string;
  };
  email?: string | null;
  phoneNumber?: string | null;
  activeTasksCount: number;
  assignedAt?: string | null;
  isOnBreak?: boolean;
  breakStartedAt?: string | null;
  breakDurationSeconds?: number;
  isTimerPaused?: boolean;
  isOffline?: boolean;
}

export interface StaffFilters {
  services: string[];
  clients: string[];
  statuses: { id: StaffLiveStatus; label: string; count: number }[];
}

export interface StaffManagementResponse {
  success: boolean;
  data: StaffCardData[];
  filters: StaffFilters;
  totalCount: number;
}

export interface StaffManagementQuery {
  search?: string;
  status?: string;
  service?: string;
  client?: string;
  sortBy?: string;
}

export async function fetchStaffManagement(
  orgIdOrSubdomain?: string,
  query?: StaffManagementQuery
): Promise<StaffManagementResponse> {
  try {
    const params = new URLSearchParams();
    if (orgIdOrSubdomain) params.append("organisationId", orgIdOrSubdomain);
    if (query?.search) params.append("search", query.search);
    if (query?.status && query.status !== "ALL") params.append("status", query.status);
    if (query?.service && query.service !== "ALL") params.append("service", query.service);
    if (query?.client && query.client !== "ALL") params.append("client", query.client);
    if (query?.sortBy) params.append("sortBy", query.sortBy);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/staff-management${queryString}`, {
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json;
      }
    }
  } catch (err) {
    console.error("Failed to fetch staff management data:", err);
  }

  return {
    success: false,
    data: [],
    filters: {
      services: [],
      clients: [],
      statuses: [],
    },
    totalCount: 0,
  };
}

export async function updateStaffStatus(
  userId: string,
  status: StaffLiveStatus | "TOGGLE_BREAK" | "TOGGLE_AVAILABLE"
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/staff-management/${userId}/status`, {
      method: "PATCH",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: json.message || "Failed to update staff status",
      };
    }
    return { success: true, message: json.message };
  } catch (err: any) {
    console.error("Failed to update staff status:", err);
    return { success: false, message: err.message || "Network error updating staff status" };
  }
}
