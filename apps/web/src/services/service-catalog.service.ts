import { getAuthHeaders } from "./auth.service";

export interface ServiceItemData {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  basePrice: number | string;
  estimatedDays?: number | null;
  isActive: boolean;
}

export interface ServiceCategoryData {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  services: ServiceItemData[];
}

export async function fetchServiceCatalog(organisationId?: string): Promise<ServiceCategoryData[]> {
  try {
    const q = organisationId ? `?organisationId=${encodeURIComponent(organisationId)}` : "";
    const res = await fetch(`/api/service-catalog${q}`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.error("Failed to fetch service catalog:", err);
  }
  return [];
}

/**
 * Service Catalog & Subcategories Client Service
 * Interacts with backend API (/api/services) backed by PostgreSQL & Prisma,
 * with resilient offline fallback.
 */

export interface InnerService {
  id: string;
  name: string;
  price: number;
  currency?: string;
  duration?: string;
  description?: string;
  governmentFee?: number;
  serviceFee?: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface MainService {
  id: string;
  name: string;
  code: string;
  description?: string;
  department: string;
  icon?: string;
  status: "ACTIVE" | "INACTIVE";
  innerServices: InnerService[];
  organisationId?: string;
  createdAt: string;
  updatedAt: string;
}

export const SERVICE_DEPARTMENTS = [
  "Business Setup",
  "PRO Services",
  "Documentation",
  "Banking Support",
  "Legal & Tax",
  "Attestation",
  "Custom Services",
];

export const SERVICE_CURRENCIES = ["AED", "USD", "EUR", "SAR", "QAR", "INR", "GBP"];

const STORAGE_KEY_PREFIX = "org_services_catalog_";

function getStorageKey(orgIdentifier: string = "default"): string {
  return `${STORAGE_KEY_PREFIX}${orgIdentifier}`;
}

function getLocalServices(orgIdentifier: string): MainService[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(orgIdentifier));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => !["ms-1", "ms-2", "ms-3", "ms-4", "ms-5"].includes(s.id));
      }
    }
  } catch (err) {
    console.warn("Failed to read local services:", err);
  }
  return [];
}

function saveLocalServices(services: MainService[], orgIdentifier: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getStorageKey(orgIdentifier), JSON.stringify(services));
    } catch (err) {
      console.error("Failed to persist services locally:", err);
    }
  }
}

/**
 * Loads all Categories with their nested Subcategories from API
 */
export async function fetchMainServices(orgIdentifier: string = "default"): Promise<MainService[]> {
  try {
    const q = orgIdentifier ? `?organisationId=${encodeURIComponent(orgIdentifier)}` : "";
    const res = await fetch(`/api/services${q}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        saveLocalServices(json.data, orgIdentifier);
        return json.data;
      }
    }
  } catch (err) {
    console.warn("Backend /api/services unavailable, using local cache:", err);
  }

  return getLocalServices(orgIdentifier);
}

/**
 * Creates a new Category along with optional initial Subcategories via API
 */
export async function createMainService(
  payload: {
    name: string;
    code?: string;
    description?: string;
    department?: string;
    status?: "ACTIVE" | "INACTIVE";
    innerServices?: Array<{
      name: string;
      price: number;
      currency?: string;
      duration?: string;
      description?: string;
      governmentFee?: number;
      serviceFee?: number;
      status?: "ACTIVE" | "INACTIVE";
    }>;
  },
  orgIdentifier: string = "default"
): Promise<MainService> {
  const q = orgIdentifier ? `?organisationId=${encodeURIComponent(orgIdentifier)}` : "";
  const requestBody = {
    name: payload.name.trim(),
    code: payload.code?.trim() || undefined,
    description: payload.description?.trim() || "",
    department: payload.department || "General",
    status: payload.status || "ACTIVE",
    subcategories: (payload.innerServices || []).map((inner) => ({
      name: inner.name.trim(),
      price: Number(inner.price) || 0,
      currency: inner.currency || "AED",
      description: inner.description?.trim() || "",
      governmentFee: inner.governmentFee ? Number(inner.governmentFee) : undefined,
      serviceFee: inner.serviceFee ? Number(inner.serviceFee) : undefined,
      status: inner.status || "ACTIVE",
    })),
  };

  try {
    const res = await fetch(`/api/services${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const current = getLocalServices(orgIdentifier);
        saveLocalServices([json.data, ...current.filter((c) => c.id !== json.data.id)], orgIdentifier);
        return json.data;
      }
    }
  } catch (err) {
    console.warn("API createCategory failed, falling back locally:", err);
  }

  // Offline / local fallback
  const now = new Date().toISOString();
  const newMain: MainService = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: payload.name.trim(),
    code: payload.code?.trim().toUpperCase() || `CAT-${Math.floor(100 + Math.random() * 900)}`,
    description: payload.description?.trim() || "",
    department: payload.department || "General",
    status: payload.status || "ACTIVE",
    innerServices: (payload.innerServices || []).map((inner, idx) => ({
      id: `sub-${Date.now()}-${idx}`,
      name: inner.name.trim(),
      price: Number(inner.price) || 0,
      currency: inner.currency || "AED",
      description: inner.description?.trim() || "",
      governmentFee: inner.governmentFee ? Number(inner.governmentFee) : undefined,
      serviceFee: inner.serviceFee ? Number(inner.serviceFee) : undefined,
      status: inner.status || "ACTIVE",
      createdAt: now,
      updatedAt: now,
    })),
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newMain, ...getLocalServices(orgIdentifier)];
  saveLocalServices(updated, orgIdentifier);
  return newMain;
}

/**
 * Updates an existing Category via API
 */
export async function updateMainService(
  id: string,
  payload: Partial<Omit<MainService, "id" | "createdAt">>,
  orgIdentifier: string = "default"
): Promise<MainService> {
  const requestBody: any = {
    name: payload.name !== undefined ? payload.name.trim() : undefined,
    code: payload.code !== undefined ? payload.code.trim().toUpperCase() : undefined,
    description: payload.description !== undefined ? payload.description.trim() : undefined,
    department: payload.department,
    status: payload.status,
  };

  if (payload.innerServices !== undefined) {
    requestBody.subcategories = payload.innerServices.map((inner) => ({
      id: inner.id.startsWith("sub-") || inner.id.startsWith("is-") ? undefined : inner.id,
      name: inner.name.trim(),
      price: Number(inner.price) || 0,
      currency: inner.currency || "AED",
      description: inner.description?.trim() || "",
      governmentFee: inner.governmentFee ? Number(inner.governmentFee) : undefined,
      serviceFee: inner.serviceFee ? Number(inner.serviceFee) : undefined,
      status: inner.status || "ACTIVE",
    }));
  }

  try {
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const current = getLocalServices(orgIdentifier);
        saveLocalServices(
          current.map((s) => (s.id === json.data.id ? json.data : s)),
          orgIdentifier
        );
        return json.data;
      }
    }
  } catch (err) {
    console.warn("API updateCategory failed, using local update:", err);
  }

  const current = getLocalServices(orgIdentifier);
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Category with ID "${id}" was not found.`);
  }

  const updatedItem: MainService = {
    ...current[index],
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedItem;
  saveLocalServices(current, orgIdentifier);
  return updatedItem;
}

/**
 * Deletes a Category and its Subcategories via API
 */
export async function deleteMainService(
  id: string,
  orgIdentifier: string = "default"
): Promise<boolean> {
  try {
    const res = await fetch(`/api/services/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const current = getLocalServices(orgIdentifier);
      saveLocalServices(
        current.filter((s) => s.id !== id),
        orgIdentifier
      );
      return true;
    }
  } catch (err) {
    console.warn("API deleteCategory failed, using local deletion:", err);
  }

  const current = getLocalServices(orgIdentifier);
  const filtered = current.filter((s) => s.id !== id);
  saveLocalServices(filtered, orgIdentifier);
  return true;
}

/**
 * Adds a new Subcategory to a Category via API
 */
export async function addInnerService(
  mainServiceId: string,
  innerPayload: {
    name: string;
    price: number;
    currency?: string;
    duration?: string;
    description?: string;
    governmentFee?: number;
    serviceFee?: number;
    status?: "ACTIVE" | "INACTIVE";
  },
  orgIdentifier: string = "default"
): Promise<MainService> {
  try {
    const res = await fetch(`/api/services/${mainServiceId}/subcategories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: innerPayload.name.trim(),
        price: Number(innerPayload.price) || 0,
        currency: innerPayload.currency || "AED",
        description: innerPayload.description?.trim() || "",
        governmentFee: innerPayload.governmentFee,
        serviceFee: innerPayload.serviceFee,
        status: innerPayload.status || "ACTIVE",
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const current = getLocalServices(orgIdentifier);
        saveLocalServices(
          current.map((s) => (s.id === json.data.id ? json.data : s)),
          orgIdentifier
        );
        return json.data;
      }
    }
  } catch (err) {
    console.warn("API addSubcategory failed, falling back locally:", err);
  }

  const current = getLocalServices(orgIdentifier);
  const index = current.findIndex((s) => s.id === mainServiceId);
  if (index === -1) {
    throw new Error(`Category with ID "${mainServiceId}" not found.`);
  }

  const now = new Date().toISOString();
  const newInner: InnerService = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: innerPayload.name.trim(),
    price: Number(innerPayload.price) || 0,
    currency: innerPayload.currency || "AED",
    description: innerPayload.description?.trim() || "",
    status: innerPayload.status || "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  current[index].innerServices = [...(current[index].innerServices || []), newInner];
  current[index].updatedAt = now;
  saveLocalServices(current, orgIdentifier);
  return current[index];
}

/**
 * Updates a Subcategory via API
 */
export async function updateInnerService(
  mainServiceId: string,
  innerId: string,
  payload: Partial<Omit<InnerService, "id">>,
  orgIdentifier: string = "default"
): Promise<MainService> {
  try {
    const res = await fetch(`/api/services/subcategories/${innerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name?.trim(),
        price: payload.price !== undefined ? Number(payload.price) : undefined,
        currency: payload.currency,
        description: payload.description?.trim(),
        status: payload.status,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const current = getLocalServices(orgIdentifier);
        saveLocalServices(
          current.map((s) => (s.id === json.data.id ? json.data : s)),
          orgIdentifier
        );
        return json.data;
      }
    }
  } catch (err) {
    console.warn("API updateSubcategory failed, using local update:", err);
  }

  const current = getLocalServices(orgIdentifier);
  const mainIndex = current.findIndex((s) => s.id === mainServiceId);
  if (mainIndex === -1) {
    throw new Error(`Category with ID "${mainServiceId}" not found.`);
  }

  const inners = current[mainIndex].innerServices || [];
  const innerIndex = inners.findIndex((i) => i.id === innerId);
  if (innerIndex === -1) {
    throw new Error(`Subcategory with ID "${innerId}" not found.`);
  }

  const now = new Date().toISOString();
  inners[innerIndex] = {
    ...inners[innerIndex],
    ...payload,
    updatedAt: now,
  };

  current[mainIndex].innerServices = inners;
  current[mainIndex].updatedAt = now;
  saveLocalServices(current, orgIdentifier);
  return current[mainIndex];
}

/**
 * Deletes a Subcategory via API
 */
export async function deleteInnerService(
  mainServiceId: string,
  innerId: string,
  orgIdentifier: string = "default"
): Promise<MainService> {
  try {
    const res = await fetch(`/api/services/subcategories/${innerId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const current = getLocalServices(orgIdentifier);
        saveLocalServices(
          current.map((s) => (s.id === json.data.id ? json.data : s)),
          orgIdentifier
        );
        return json.data;
      }
    }
  } catch (err) {
    console.warn("API deleteSubcategory failed, using local delete:", err);
  }

  const current = getLocalServices(orgIdentifier);
  const mainIndex = current.findIndex((s) => s.id === mainServiceId);
  if (mainIndex === -1) {
    throw new Error(`Category with ID "${mainServiceId}" not found.`);
  }

  current[mainIndex].innerServices = (current[mainIndex].innerServices || []).filter(
    (i) => i.id !== innerId
  );
  current[mainIndex].updatedAt = new Date().toISOString();
  saveLocalServices(current, orgIdentifier);
  return current[mainIndex];
}

/**
 * Clears all categories via API
 */
export async function resetServiceCatalog(orgIdentifier: string = "default"): Promise<MainService[]> {
  try {
    const q = orgIdentifier ? `?organisationId=${encodeURIComponent(orgIdentifier)}` : "";
    await fetch(`/api/services/all${q}`, { method: "DELETE" });
  } catch (err) {
    console.warn("API resetServiceCatalog failed:", err);
  }
  saveLocalServices([], orgIdentifier);
  return [];
}
