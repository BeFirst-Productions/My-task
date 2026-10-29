import { prisma } from "../../database/index.js";
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CreateSubcategoryDTO,
  UpdateSubcategoryDTO,
} from "./service.schema.js";

/**
 * Resolves an organisation ID from an ID, subdomain, or slug, falling back to the default org.
 */
export async function resolveOrganisationId(orgIdOrSubdomain?: string): Promise<string | null> {
  if (!orgIdOrSubdomain || orgIdOrSubdomain === "org-default") {
    const defaultOrg = await prisma.organisation.findFirst({ select: { id: true } });
    return defaultOrg?.id || null;
  }
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { id: orgIdOrSubdomain },
        { subdomain: { equals: orgIdOrSubdomain, mode: "insensitive" } },
        { companyName: { equals: orgIdOrSubdomain, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return org?.id || orgIdOrSubdomain;
}

/**
 * Lists all categories and their nested services for an organisation.
 */
export async function listCategories(orgIdOrSubdomain?: string) {
  const resolvedOrgId = await resolveOrganisationId(orgIdOrSubdomain);

  const categories = await prisma.serviceCategory.findMany({
    where: resolvedOrgId ? { organisationId: resolvedOrgId } : {},
    include: {
      services: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    code: cat.code || "",
    description: cat.description || "",
    department: cat.department || "General",
    status: cat.status,
    organisationId: cat.organisationId,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    innerServices: cat.services.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: Number(sub.basePrice),
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee !== null ? Number(sub.governmentFee) : undefined,
      serviceFee: sub.serviceFee !== null ? Number(sub.serviceFee) : undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  }));
}

/**
 * Gets a single category by ID.
 */
export async function getCategoryById(id: string) {
  const cat = await prisma.serviceCategory.findUnique({
    where: { id },
    include: {
      services: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cat) return null;

  return {
    id: cat.id,
    name: cat.name,
    code: cat.code || "",
    description: cat.description || "",
    department: cat.department || "General",
    status: cat.status,
    organisationId: cat.organisationId,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    innerServices: cat.services.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: Number(sub.basePrice),
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee !== null ? Number(sub.governmentFee) : undefined,
      serviceFee: sub.serviceFee !== null ? Number(sub.serviceFee) : undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  };
}

/**
 * Creates a new category along with optional services.
 */
export async function createCategory(data: CreateCategoryDTO, orgIdOrSubdomain?: string) {
  const resolvedOrgId = await resolveOrganisationId(data.organisationId || orgIdOrSubdomain);

  if (!resolvedOrgId) {
    throw new Error("Unable to determine organisation for category creation.");
  }

  const autoCode =
    data.code?.trim().toUpperCase() ||
    `CAT-${Math.floor(100 + Math.random() * 900)}`;

  const category = await prisma.serviceCategory.create({
    data: {
      organisationId: resolvedOrgId,
      name: data.name.trim(),
      code: autoCode,
      description: data.description?.trim() || "",
      department: data.department || "General",
      status: data.status || "ACTIVE",
      services: {
        create: (data.subcategories || []).map((sub) => ({
          organisationId: resolvedOrgId,
          name: sub.name.trim(),
          basePrice: sub.price,
          currency: sub.currency || "AED",
          description: sub.description?.trim() || "",
          governmentFee: sub.governmentFee,
          serviceFee: sub.serviceFee,
          status: sub.status || "ACTIVE",
          isActive: (sub.status || "ACTIVE") === "ACTIVE",
        })),
      },
    },
    include: {
      services: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    id: category.id,
    name: category.name,
    code: category.code || "",
    description: category.description || "",
    department: category.department || "General",
    status: category.status,
    organisationId: category.organisationId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    innerServices: category.services.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: Number(sub.basePrice),
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee !== null ? Number(sub.governmentFee) : undefined,
      serviceFee: sub.serviceFee !== null ? Number(sub.serviceFee) : undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  };
}

/**
 * Updates an existing category and optionally reconciles its services.
 */
export async function updateCategory(id: string, data: UpdateCategoryDTO) {
  const currentCategory = await prisma.serviceCategory.findUnique({
    where: { id },
    select: { organisationId: true },
  });

  if (!currentCategory) {
    throw new Error("Category not found");
  }

  const resolvedOrgId = currentCategory.organisationId;

  // If subcategories were passed, reconcile them with ServiceItem
  if (data.subcategories !== undefined) {
    const existing = await prisma.serviceItem.findMany({
      where: { categoryId: id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const incomingWithId = data.subcategories.filter((s) => s.id && existingIds.has(s.id));
    const incomingIds = new Set(incomingWithId.map((s) => s.id!));

    const toDeleteIds = existing.filter((e) => !incomingIds.has(e.id)).map((e) => e.id);

    await prisma.$transaction([
      ...(toDeleteIds.length > 0
        ? [
            prisma.serviceItem.deleteMany({
              where: { id: { in: toDeleteIds } },
            }),
          ]
        : []),
      ...incomingWithId.map((sub) =>
        prisma.serviceItem.update({
          where: { id: sub.id },
          data: {
            name: sub.name?.trim(),
            basePrice: sub.price,
            currency: sub.currency,
            description: sub.description?.trim(),
            governmentFee: sub.governmentFee,
            serviceFee: sub.serviceFee,
            status: sub.status,
            isActive: sub.status ? sub.status === "ACTIVE" : undefined,
          },
        })
      ),
      ...data.subcategories
        .filter((s) => !s.id || !existingIds.has(s.id))
        .map((sub) =>
          prisma.serviceItem.create({
            data: {
              organisationId: resolvedOrgId,
              categoryId: id,
              name: sub.name.trim(),
              basePrice: sub.price,
              currency: sub.currency || "AED",
              description: sub.description?.trim() || "",
              governmentFee: sub.governmentFee,
              serviceFee: sub.serviceFee,
              status: sub.status || "ACTIVE",
              isActive: (sub.status || "ACTIVE") === "ACTIVE",
            },
          })
        ),
    ]);
  }

  // Update category main fields
  const updated = await prisma.serviceCategory.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      code: data.code !== undefined ? data.code.trim().toUpperCase() : undefined,
      description: data.description !== undefined ? data.description.trim() : undefined,
      department: data.department !== undefined ? data.department : undefined,
      status: data.status,
    },
    include: {
      services: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    code: updated.code || "",
    description: updated.description || "",
    department: updated.department || "General",
    status: updated.status,
    organisationId: updated.organisationId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    innerServices: updated.services.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: Number(sub.basePrice),
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee !== null ? Number(sub.governmentFee) : undefined,
      serviceFee: sub.serviceFee !== null ? Number(sub.serviceFee) : undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  };
}

/**
 * Deletes a category and all its nested services.
 */
export async function deleteCategory(id: string) {
  await prisma.serviceCategory.delete({
    where: { id },
  });
  return { success: true };
}

/**
 * Adds a new service to an existing category.
 */
export async function createSubcategory(categoryId: string, data: CreateSubcategoryDTO) {
  const category = await prisma.serviceCategory.findUnique({
    where: { id: categoryId },
    select: { organisationId: true },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  await prisma.serviceItem.create({
    data: {
      organisationId: category.organisationId,
      categoryId,
      name: data.name.trim(),
      basePrice: data.price,
      currency: data.currency || "AED",
      description: data.description?.trim() || "",
      governmentFee: data.governmentFee,
      serviceFee: data.serviceFee,
      status: data.status || "ACTIVE",
      isActive: (data.status || "ACTIVE") === "ACTIVE",
    },
  });

  return getCategoryById(categoryId);
}

/**
 * Updates a service item.
 */
export async function updateSubcategory(id: string, data: UpdateSubcategoryDTO) {
  const sub = await prisma.serviceItem.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      basePrice: data.price,
      currency: data.currency,
      description: data.description !== undefined ? data.description.trim() : undefined,
      governmentFee: data.governmentFee,
      serviceFee: data.serviceFee,
      status: data.status,
      isActive: data.status ? data.status === "ACTIVE" : undefined,
    },
  });

  return getCategoryById(sub.categoryId);
}

/**
 * Deletes a service item.
 */
export async function deleteSubcategory(id: string) {
  const sub = await prisma.serviceItem.delete({
    where: { id },
  });

  return getCategoryById(sub.categoryId);
}

/**
 * Clears all categories for an organisation.
 */
export async function clearAllCategories(orgIdOrSubdomain?: string) {
  const resolvedOrgId = await resolveOrganisationId(orgIdOrSubdomain);
  if (resolvedOrgId) {
    await prisma.serviceCategory.deleteMany({
      where: { organisationId: resolvedOrgId },
    });
  }
  return { success: true };
}
