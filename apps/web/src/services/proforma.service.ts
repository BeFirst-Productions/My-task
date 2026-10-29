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
    const res = await fetch(`/api/proforma${q}`);
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
    const res = await fetch(`/api/proforma/${id}`);
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

