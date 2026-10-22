import { getStoredToken } from "./auth.service";

export interface UserItem {
  id: string;
  organisationId: string | null;
  fullName: string | null;
  email: string;
  username: string;
  phoneNumber: string;
  role: "PLATFORM_OWNER" | "SUPER_ADMIN" | "ADMIN" | "STAFF";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
  department: string | null;
  designation: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
    status: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string | null;
    username: string;
  } | null;
}

export interface UserPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateTenantUserPayload {
  fullName: string;
  email: string;
  username: string;
  phoneNumber: string;
  password: string;
  role: "ADMIN" | "STAFF";
  department?: string;
  designation?: string;
}

export interface UpdateTenantUserPayload {
  fullName?: string;
  phoneNumber?: string;
  role?: "ADMIN" | "STAFF";
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  department?: string;
  designation?: string;
  password?: string;
}

function getAuthHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch users belonging to the logged-in organization
 */
export async function getTenantUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  department?: string;
}): Promise<{ users: UserItem[]; pagination: UserPagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  if (params?.role) searchParams.set("role", params.role);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.department) searchParams.set("department", params.department);

  const res = await fetch(`/api/org/users?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to fetch organization users");
  }

  return {
    users: data.data || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1, hasMore: false },
  };
}

/**
 * Add a new user to the organization
 */
export async function createTenantUser(payload: CreateTenantUserPayload): Promise<UserItem> {
  const res = await fetch("/api/org/users", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to create organization user");
  }

  return data.data;
}

/**
 * Update an existing organization user
 */
export async function updateTenantUser(id: string, payload: UpdateTenantUserPayload): Promise<UserItem> {
  const res = await fetch(`/api/org/users/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to update user");
  }

  return data.data;
}

/**
 * Delete an organization user
 */
export async function deleteTenantUser(id: string): Promise<void> {
  const res = await fetch(`/api/org/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to delete user");
  }
}

/**
 * Platform Owner: Fetch all users across all tenants
 */
export async function getPlatformUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  organisationId?: string;
  role?: string;
  status?: string;
}): Promise<{ users: UserItem[]; pagination: UserPagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  if (params?.organisationId) searchParams.set("organisationId", params.organisationId);
  if (params?.role) searchParams.set("role", params.role);
  if (params?.status) searchParams.set("status", params.status);

  const res = await fetch(`/api/platform/users?${searchParams.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to fetch platform users");
  }

  return {
    users: data.data || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1, hasMore: false },
  };
}

/**
 * Platform Owner: Update user status globally
 */
export async function updatePlatformUserStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<UserItem> {
  const res = await fetch(`/api/platform/users/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to update user status");
  }

  return data.data;
}
