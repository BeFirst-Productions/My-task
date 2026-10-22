/**
 * Organisation Service for Next.js Web Application
 * Handles API communication with the backend Fastify server.
 */

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In browser: relative URL routes seamlessly through Next.js proxy rewrite without CORS issues
    return "";
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:4000"
  );
}

export interface CompanyDetailsInput {
  companyName: string;
  name?: string;
  primaryLocation: string;
  subdomain: string;
  logo?: string;
  document?: string;
}

export interface SuperAdminDetailsInput {
  email: string;
  phoneNumber: string;
  username: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface CreateOrganisationPayload {
  companyDetails: CompanyDetailsInput;
  superAdminDetails: SuperAdminDetailsInput;
}

export interface CreatedOrganisationData {
  organisation: {
    id: string;
    name: string;
    companyName: string;
    subdomain: string;
    primaryLocation: string;
    logo?: string | null;
    document?: string | null;
    tradeLicenceDocument?: string | null;
    databaseName: string;
    status: string;
    createdAt?: string;
  };
  superAdmin: {
    id: string;
    email: string;
    username: string;
    fullName?: string;
    role?: string;
  };
  database: {
    databaseName: string;
    status?: string;
  };
}

export interface CreateOrganisationResponse {
  success: boolean;
  message: string;
  data: CreatedOrganisationData;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class OrganisationApiError extends Error {
  public statusCode: number;
  public errorType?: string;
  public details?: ValidationErrorDetail[];

  constructor(
    message: string,
    statusCode: number,
    errorType?: string,
    details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = "OrganisationApiError";
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
  }
}

/**
 * Sends a POST request to /api/organisations to create a new tenant organisation,
 * provision its dedicated PostgreSQL database, and register its super admin.
 */
export async function createOrganisation(
  payload: CreateOrganisationPayload
): Promise<CreateOrganisationResponse> {
  const baseUrl = getApiBaseUrl();
  const targetUrl = `${baseUrl}/api/organisations`;
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    const errorMsg =
      networkError instanceof Error
        ? networkError.message
        : "Failed to connect to backend server";
    throw new OrganisationApiError(
      `Network error: Unable to communicate with API server at ${targetUrl || "/api/organisations"} (${errorMsg}). Please verify the backend is running.`,
      0,
      "NetworkError"
    );
  }

  let jsonResult: any;
  try {
    jsonResult = await response.json();
  } catch {
    jsonResult = {
      message: `Server returned HTTP ${response.status} with unexpected non-JSON response.`,
    };
  }

  if (!response.ok) {
    throw new OrganisationApiError(
      jsonResult.message || `Failed to create organisation (HTTP ${response.status})`,
      response.status,
      jsonResult.error,
      jsonResult.details
    );
  }

  return jsonResult as CreateOrganisationResponse;
}

export interface OrganisationListItem {
  id: string;
  companyName: string;
  name?: string;
  subdomain: string;
  primaryLocation: string;
  databaseName: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  companyType?: string | null;
  tradeLicenceNumber?: string | null;
  issuingAuthority?: string | null;
  logo?: string | null;
  document?: string | null;
  tradeLicenceDocument?: string | null;
  notificationConfig?: {
    primaryWhatsAppNumber?: string;
    notificationEmail?: string;
    isWhatsAppEnabled?: boolean;
    isEmailEnabled?: boolean;
  } | null;
  superAdmin?: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    phoneNumber?: string;
  } | null;
  totalUsers?: number;
  users?: {
    id: string;
    email: string;
    username: string;
    role: string;
  }[];
}

export interface GetOrganisationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface GetOrganisationsResponse {
  success: boolean;
  data: OrganisationListItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Fetches organisations list from /api/organisations
 */
export async function getOrganisations(
  params: GetOrganisationsParams = {}
): Promise<GetOrganisationsResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);

  const queryString = query.toString();
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/organisations${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new OrganisationApiError(
      data.message || "Failed to fetch organisations",
      response.status,
      data.error
    );
  }

  return data as GetOrganisationsResponse;
}

/**
 * Deletes an organisation and drops its dedicated tenant database
 */
export async function deleteOrganisation(
  id: string
): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/organisations/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new OrganisationApiError(
      data.message || "Failed to delete organisation",
      response.status,
      data.error
    );
  }

  return data;
}

/**
 * Updates an organisation's status (e.g. ACTIVE <-> INACTIVE)
 */
export async function updateOrganisationStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED"
): Promise<{ success: boolean; data: OrganisationListItem; message?: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/organisations/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new OrganisationApiError(
      data.message || "Failed to update organisation status",
      response.status,
      data.error
    );
  }

  return data;
}

export interface UpdateOrganisationPayload {
  companyName?: string;
  name?: string;
  primaryLocation?: string;
  subdomain?: string;
  logo?: string | null;
  document?: string | null;
  email?: string;
  mobileNumber?: string;
  phoneNumber?: string;
  superadminUsername?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Updates an organisation's details
 */
export async function updateOrganisation(
  id: string,
  payload: UpdateOrganisationPayload
): Promise<{ success: boolean; data: OrganisationListItem; message?: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/organisations/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new OrganisationApiError(
      data.message || "Failed to update organisation",
      response.status,
      data.error
    );
  }

  return data;
}
