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
 * Lists all categories and their nested subcategories for an organisation.
 */
export async function listCategories(orgIdOrSubdomain?: string) {
  const resolvedOrgId = await resolveOrganisationId(orgIdOrSubdomain);

  const categories = await prisma.serviceCategory.findMany({
    where: resolvedOrgId ? { organisationId: resolvedOrgId } : {},
    include: {
      subcategories: {
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
    innerServices: cat.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: sub.price,
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee ?? undefined,
      serviceFee: sub.serviceFee ?? undefined,
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
      subcategories: {
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
    innerServices: cat.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: sub.price,
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee ?? undefined,
      serviceFee: sub.serviceFee ?? undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  };
}

/**
 * Creates a new category along with optional subcategories.
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
      subcategories: {
        create: (data.subcategories || []).map((sub) => ({
          name: sub.name.trim(),
          price: sub.price,
          currency: sub.currency || "AED",
          description: sub.description?.trim() || "",
          governmentFee: sub.governmentFee,
          serviceFee: sub.serviceFee,
          status: sub.status || "ACTIVE",
        })),
      },
    },
    include: {
      subcategories: {
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
    innerServices: category.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: sub.price,
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee ?? undefined,
      serviceFee: sub.serviceFee ?? undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  };
}

/**
 * Updates an existing category and optionally reconciles its subcategories.
 */
export async function updateCategory(id: string, data: UpdateCategoryDTO) {
  // If subcategories were passed, reconcile them
  if (data.subcategories !== undefined) {
    // Delete existing subcategories not in the new list, update existing, and create new ones
    const existing = await prisma.serviceSubcategory.findMany({
      where: { categoryId: id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const incomingWithId = data.subcategories.filter((s) => s.id && existingIds.has(s.id));
    const incomingIds = new Set(incomingWithId.map((s) => s.id!));

    const toDeleteIds = existing.filter((e) => !incomingIds.has(e.id)).map((e) => e.id);

    await prisma.$transaction([
      // Delete removed
      ...(toDeleteIds.length > 0
        ? [
            prisma.serviceSubcategory.deleteMany({
              where: { id: { in: toDeleteIds } },
            }),
          ]
        : []),
      // Update existing
      ...incomingWithId.map((sub) =>
        prisma.serviceSubcategory.update({
          where: { id: sub.id },
          data: {
            name: sub.name?.trim(),
            price: sub.price,
            currency: sub.currency,
            description: sub.description?.trim(),
            governmentFee: sub.governmentFee,
            serviceFee: sub.serviceFee,
            status: sub.status,
          },
        })
      ),
      // Create new
      ...data.subcategories
        .filter((s) => !s.id || !existingIds.has(s.id))
        .map((sub) =>
          prisma.serviceSubcategory.create({
            data: {
              categoryId: id,
              name: sub.name.trim(),
              price: sub.price,
              currency: sub.currency || "AED",
              description: sub.description?.trim() || "",
              governmentFee: sub.governmentFee,
              serviceFee: sub.serviceFee,
              status: sub.status || "ACTIVE",
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
      subcategories: {
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
    innerServices: updated.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      price: sub.price,
      currency: sub.currency,
      description: sub.description || "",
      governmentFee: sub.governmentFee ?? undefined,
      serviceFee: sub.serviceFee ?? undefined,
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  };
}

/**
 * Deletes a category and all its nested subcategories.
 */
export async function deleteCategory(id: string) {
  await prisma.serviceCategory.delete({
    where: { id },
  });
  return { success: true };
}

/**
 * Adds a new subcategory to an existing category.
 */
export async function createSubcategory(categoryId: string, data: CreateSubcategoryDTO) {
  await prisma.serviceSubcategory.create({
    data: {
      categoryId,
      name: data.name.trim(),
      price: data.price,
      currency: data.currency || "AED",
      description: data.description?.trim() || "",
      governmentFee: data.governmentFee,
      serviceFee: data.serviceFee,
      status: data.status || "ACTIVE",
    },
  });

  // Return full updated category
  return getCategoryById(categoryId);
}

/**
 * Updates a subcategory.
 */
export async function updateSubcategory(id: string, data: UpdateSubcategoryDTO) {
  const sub = await prisma.serviceSubcategory.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      price: data.price,
      currency: data.currency,
      description: data.description !== undefined ? data.description.trim() : undefined,
      governmentFee: data.governmentFee,
      serviceFee: data.serviceFee,
      status: data.status,
    },
  });

  return getCategoryById(sub.categoryId);
}

/**
 * Deletes a subcategory.
 */
export async function deleteSubcategory(id: string) {
  const sub = await prisma.serviceSubcategory.delete({
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
