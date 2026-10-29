import { getAuthHeaders } from "./auth.service";
import { ClientServiceItemData } from "./client.service";

export interface WorkOrderItemData extends ClientServiceItemData {
  client?: {
    id: string;
    clientNumber: string | null;
    companyName: string | null;
    contactPerson: string | null;
    phoneNumber: string | null;
    email: string | null;
    wallet?: {
      balance: number | string;
      currency: string;
    } | null;
  };
}

export interface ListWorkOrdersParams {
  organisationId?: string;
  status?: string;
  assignedStaffId?: string;
  userRole?: string;
  currentUserId?: string;
  search?: string;
}

export async function fetchWorkOrders(params: ListWorkOrdersParams): Promise<WorkOrderItemData[]> {
  try {
    const query = new URLSearchParams();
    if (params.organisationId) query.append("organisationId", params.organisationId);
    if (params.status && params.status !== "ALL") query.append("status", params.status);
    if (params.assignedStaffId && params.assignedStaffId !== "ALL") query.append("assignedStaffId", params.assignedStaffId);
    if (params.userRole) query.append("userRole", params.userRole);
    if (params.currentUserId) query.append("currentUserId", params.currentUserId);
    if (params.search) query.append("search", params.search);

    const res = await fetch(`/api/work-orders?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch work orders:", err);
  }
  return [];
}

export async function assignWorkOrderServices(payload: {
  organisationId?: string;
  serviceItemIds: string[];
  staffId: string;
  assignedById?: string;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await fetch("/api/work-orders/assign", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("Failed to assign work order services:", err);
    return { success: false, message: err.message || "Failed to assign services" };
  }
}

export async function updateWorkOrderStatus(
  serviceItemId: string,
  payload: {
    status: "IN_PROGRESS" | "COMPLETED";
    completionDocName?: string;
    completionDocUrl?: string;
    completionNotes?: string;
    userId?: string;
  }
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await fetch(`/api/work-orders/${serviceItemId}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("Failed to update work order status:", err);
    return { success: false, message: err.message || "Failed to update status" };
  }
}

