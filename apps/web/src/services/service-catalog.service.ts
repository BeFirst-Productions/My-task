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
    const res = await fetch(`/api/service-catalog${q}`);
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

