import { getAuthHeaders } from "./auth.service";

export interface SearchResultClient {
  id: string;
  clientNumber?: string;
  companyName: string;
  contactPerson: string;
  email?: string;
  phoneNumber?: string;
  status: string;
  salesStaff?: { fullName?: string; username?: string };
}

export interface SearchResultTask {
  id: string;
  clientId?: string;
  clientName: string;
  clientNumber?: string;
  title: string;
  category: string;
  status: string;
  totalPrice?: number;
  assignedStaff?: string | null;
  source: string;
}

export interface SearchResultDocument {
  id: string;
  documentName: string;
  documentType: string;
  assignedPerson?: string;
  clientName?: string;
  clientId?: string;
  expiryDate?: string | null;
  status: string;
  documentUrl?: string;
  source: string;
}

export interface GlobalSearchResults {
  query: string;
  clients: SearchResultClient[];
  tasks: SearchResultTask[];
  documents: SearchResultDocument[];
  totalCount: number;
  permissions: {
    canSearchClients: boolean;
    canSearchTasks: boolean;
    canSearchDocuments: boolean;
  };
}

export async function fetchGlobalSearch(params: {
  q: string;
  organisationId?: string;
  userRole?: string;
  currentUserId?: string;
  permittedModules?: string[];
}): Promise<GlobalSearchResults | null> {
  const { q, organisationId, userRole, currentUserId, permittedModules } = params;
  if (!q || q.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL("/api/search/global", window.location.origin);
    url.searchParams.set("q", q.trim());
    if (organisationId) url.searchParams.set("organisationId", organisationId);
    if (userRole) url.searchParams.set("userRole", userRole);
    if (currentUserId) url.searchParams.set("currentUserId", currentUserId);
    if (permittedModules && permittedModules.length > 0) {
      url.searchParams.set("permittedModules", JSON.stringify(permittedModules));
    }

    const res = await fetch(url.toString(), {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      console.warn("Global search failed with status:", res.status);
      return null;
    }

    const json = await res.json();
    if (json.success && json.data) {
      return json.data as GlobalSearchResults;
    }
    return null;
  } catch (err) {
    console.error("fetchGlobalSearch error:", err);
    return null;
  }
}

