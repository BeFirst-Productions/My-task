import { getAuthHeaders } from "./auth.service";
export interface ClientServiceItemData {
  id: string;
  clientId: string;
  serviceItemId: string;
  basePrice: number | string;
  commissionAmount: number | string;
  totalPrice: number | string;
  status: "PENDING_PAYMENT" | "READY_TO_ASSIGN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignedStaffId?: string | null;
  assignedAt?: string | null;
  completedAt?: string | null;
  completionNotes?: string | null;
  serviceItem?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    };
  };
  assignedStaff?: {
    id: string;
    fullName: string | null;
    username: string;
    designation: string | null;
    isAvailable: boolean;
  } | null;
  completionDoc?: {
    id: string;
    documentName: string;
    documentUrl: string;
    createdAt: string;
  } | null;
}

export interface WalletTransactionData {
  id: string;
  walletId: string;
  type: "CREDIT_ADVANCE" | "CREDIT_TOPUP" | "DEBIT_SERVICE_ASSIGNMENT" | "REFUND" | "ADJUSTMENT";
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  paymentMethod?: string | null;
  referenceId?: string | null;
  description: string;
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string | null;
    username: string;
    role: string;
  } | null;
}

export interface ClientData {
  id: string;
  organisationId: string;
  clientNumber: string | null;
  companyName: string | null;
  contactPerson: string | null;
  assignedPerson: string;
  email: string | null;
  phoneNumber: string | null;
  whatsappNumber?: string | null;
  trnNumber: string | null;
  address: string | null;
  status: string;
  salesStaffId?: string | null;
  createdAt: string;
  updatedAt: string;
  salesStaff?: {
    id: string;
    fullName: string | null;
    username: string;
    email: string;
    phoneNumber?: string;
  } | null;
  wallet?: {
    id?: string;
    balance: number | string;
    currency: string;
    transactions?: WalletTransactionData[];
  } | null;
  services?: ClientServiceItemData[];
  proformaInvoices?: {
    id: string;
    proformaNumber: string;
    grandTotal: number | string;
    status: string;
    createdAt: string;
  }[];
  documents?: any[];
}

export interface CreateClientPayload {
  organisationId?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  whatsappNumber?: string;
  trnNumber?: string;
  address?: string;
  salesStaffId?: string;
  services: {
    serviceItemId: string;
    commissionAmount: number;
    basePrice?: number;
  }[];
  notes?: string;
  createdById?: string;
}

export async function fetchClients(organisationId?: string, query?: string, status?: string): Promise<ClientData[]> {
  try {
    const params = new URLSearchParams();
    if (organisationId) params.append("organisationId", organisationId);
    if (query) params.append("query", query);
    if (status && status !== "ALL") params.append("status", status);

    const res = await fetch(`/api/clients?${params.toString()}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch clients:", err);
  }
  return [];
}

export async function fetchClientDetails(clientId: string): Promise<ClientData | null> {
  try {
    const res = await fetch(`/api/clients/${clientId}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch client details:", err);
  }
  return null;
}

export async function createClient(data: CreateClientPayload): Promise<{ success: boolean; data?: ClientData; message?: string }> {
  try {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: json.message || `Server responded with status ${res.status}: ${res.statusText}`,
      };
    }
    return json;
  } catch (err: any) {
    console.error("Failed to create client:", err);
    return { success: false, message: err.message || "Failed to create client" };
  }
}

export async function convertClientToWork(
  clientId: string,
  data: {
    advanceAmount: number;
    paymentMethod: string;
    referenceId?: string;
    notes?: string;
    createdById?: string;
  }
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const res = await fetch(`/api/clients/${clientId}/convert-to-work`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("Failed to convert client to work:", err);
    return { success: false, message: err.message || "Failed to convert client to work" };
  }
}

export async function topUpClientWallet(
  clientId: string,
  data: {
    amount: number;
    paymentMethod: string;
    referenceId?: string;
    notes?: string;
    createdById?: string;
  }
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const res = await fetch(`/api/clients/${clientId}/top-up-wallet`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error("Failed to top up wallet:", err);
    return { success: false, message: err.message || "Failed to top up wallet" };
  }
}

export interface SalesStaffMember {
  id: string;
  fullName?: string | null;
  name?: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  department?: string;
}

export async function fetchSalesStaff(organisationId?: string): Promise<SalesStaffMember[]> {
  try {
    const q = organisationId ? `?organisationId=${encodeURIComponent(organisationId)}` : "";
    const res = await fetch(`/api/clients/sales-staff${q}`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((u: any) => ({
          id: u.id,
          fullName: u.fullName || u.username,
          name: u.fullName || u.username,
          username: u.username,
          email: u.email,
          role: u.role,
          department: u.department,
        }));
      }
    }
  } catch (err) {
    console.warn("Failed to fetch sales staff via /api/clients/sales-staff:", err);
  }
  return [];
}

