import { getAuthHeaders } from "./auth.service";
export interface ProformaInvoiceData {
  id: string;
  organisationId: string;
  clientId: string;
  proformaNumber: string;
  subTotal: number | string;
  totalCommission: number | string;
  vatAmount: number | string;
  grandTotal: number | string;
  currency: string;
  status: "DRAFT" | "ISSUED" | "CONVERTED_TO_WORK" | "CANCELLED";
  notes?: string | null;
  generatedById?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    clientNumber: string | null;
    companyName: string | null;
    contactPerson: string | null;
    email: string | null;
    phoneNumber: string | null;
    whatsappNumber?: string | null;
    trnNumber?: string | null;
    address?: string | null;
    services?: {
      id: string;
      basePrice: number | string;
      commissionAmount: number | string;
      totalPrice: number | string;
      serviceItem?: {
        name: string;
        category?: { name: string };
      };
    }[];
  };
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
    logo?: string | null;
    primaryLocation?: string;
    setting?: {
      companyAddress?: string | null;
      supportEmail?: string | null;
      supportPhone?: string | null;
      invoiceCurrency?: string;
    } | null;
  };
  generatedBy?: {
    id: string;
    fullName: string | null;
    username: string;
    email: string;
    phoneNumber?: string;
  } | null;
}

export async function fetchProformas(organisationId?: string): Promise<ProformaInvoiceData[]> {
  try {
    const q = organisationId ? `?organisationId=${encodeURIComponent(organisationId)}` : "";
    const res = await fetch(`/api/proforma${q}`, {
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch proforma invoices:", err);
  }
  return [];
}

export async function fetchProformaById(id: string): Promise<ProformaInvoiceData | null> {
  try {
    const res = await fetch(`/api/proforma/${id}`, {
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch proforma invoice:", err);
  }
  return null;
}



export interface CreateProformaPayload {
  organisationId?: string;
  clientId?: string;
  clientData?: {
    companyName: string;
    contactPerson: string;
    email?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    trnNumber?: string;
    address?: string;
    salesStaffId?: string;
  };
  services: {
    serviceItemId: string;
    basePrice?: number;
    commissionAmount?: number;
    quantity?: number;
  }[];
  currency?: string;
  status?: "DRAFT" | "ISSUED";
  notes?: string;
  generatedById?: string;
}

export async function createProforma(
  payload: CreateProformaPayload
): Promise<{ success: boolean; data?: ProformaInvoiceData; message?: string }> {
  try {
    const res = await fetch("/api/proforma", {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: json.message || "Failed to create proforma invoice",
      };
    }
    return json;
  } catch (err: any) {
    console.error("Failed to create proforma invoice:", err);
    return { success: false, message: err.message || "Failed to create proforma invoice" };
  }
}