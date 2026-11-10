/**
 * Enquiry Service for Next.js Web Application
 * Handles API communication with the backend Fastify server for Business Enquiries.
 */

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In browser: relative URL routes seamlessly through Next.js proxy rewrite
    return "";
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:4000"
  );
}

export type EnquiryStatus = "PENDING" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "REJECTED";

export interface EnquiryItem {
  id: string;
  companyName: string;
  primaryLocation: string;
  subdomain: string;
  email: string;
  mobileNumber: string;
  subscriptionPlan: string;
  documentUrl?: string | null;
  documentName?: string | null;
  documentSize?: string | null;
  status: EnquiryStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnquiryPayload {
  companyName: string;
  primaryLocation: string;
  subdomain: string;
  email: string;
  mobileNumber: string;
  subscriptionPlan?: string;
  document?: string;
  documentName?: string;
  documentSize?: string;
  notes?: string;
}

export interface EnquiryQueryParams {
  search?: string;
  status?: string;
  primaryLocation?: string;
  page?: number;
  limit?: number;
}

export interface EnquiryStats {
  total: number;
  pending: number;
  contacted: number;
  qualified: number;
  converted: number;
  rejected: number;
}

export interface EnquiryListResponse {
  items: EnquiryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class EnquiryApiError extends Error {
  public statusCode: number;
  public details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "EnquiryApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Submits an enquiry from the Landing Page or Platform Owner.
 * The backend handles uploading any attached document directly to Bunny Storage
 * in the "enquiry-docs" folder.
 */
export async function submitEnquiry(
  payload: CreateEnquiryPayload
): Promise<{ success: boolean; message: string; data?: EnquiryItem }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/enquiries`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new EnquiryApiError(
        data.message || "Failed to submit enquiry.",
        res.status,
        data.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof EnquiryApiError) throw error;
    throw new EnquiryApiError(
      error instanceof Error ? error.message : "Network error during enquiry submission.",
      500
    );
  }
}

/**
 * Retrieves paginated enquiries for the Platform Owner with optional filters.
 */
export async function fetchEnquiries(
  params: EnquiryQueryParams = {}
): Promise<{ success: boolean; data: EnquiryListResponse }> {
  const baseUrl = getApiBaseUrl();
  const query = new URLSearchParams();

  if (params.search) query.append("search", params.search);
  if (params.status) query.append("status", params.status);
  if (params.primaryLocation) query.append("primaryLocation", params.primaryLocation);
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));

  const url = `${baseUrl}/api/enquiries${query.toString() ? `?${query.toString()}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new EnquiryApiError(data.message || "Failed to fetch enquiries.", res.status);
    }

    return data;
  } catch (error) {
    if (error instanceof EnquiryApiError) throw error;
    throw new EnquiryApiError(
      error instanceof Error ? error.message : "Network error fetching enquiries.",
      500
    );
  }
}

/**
 * Retrieves enquiry counts and aggregated stats for Platform Owner cards.
 */
export async function fetchEnquiryStats(): Promise<{ success: boolean; data: EnquiryStats }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/enquiries/stats`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new EnquiryApiError(data.message || "Failed to fetch enquiry statistics.", res.status);
    }

    return data;
  } catch (error) {
    if (error instanceof EnquiryApiError) throw error;
    throw new EnquiryApiError(
      error instanceof Error ? error.message : "Network error fetching enquiry stats.",
      500
    );
  }
}

/**
 * Updates an enquiry (status, notes, etc.).
 */
export async function updateEnquiry(
  id: string,
  payload: Partial<CreateEnquiryPayload> & { status?: EnquiryStatus }
): Promise<{ success: boolean; message: string; data?: EnquiryItem }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/enquiries/${id}`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new EnquiryApiError(data.message || "Failed to update enquiry.", res.status);
    }

    return data;
  } catch (error) {
    if (error instanceof EnquiryApiError) throw error;
    throw new EnquiryApiError(
      error instanceof Error ? error.message : "Network error updating enquiry.",
      500
    );
  }
}

/**
 * Deletes an enquiry.
 */
export async function deleteEnquiry(
  id: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/enquiries/${id}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new EnquiryApiError(data.message || "Failed to delete enquiry.", res.status);
    }

    return data;
  } catch (error) {
    if (error instanceof EnquiryApiError) throw error;
    throw new EnquiryApiError(
      error instanceof Error ? error.message : "Network error deleting enquiry.",
      500
    );
  }
}

