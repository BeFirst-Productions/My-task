import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";

export async function listProformas(organisationId?: string) {
  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) return [];

  return prisma.proformaInvoice.findMany({
    where: { organisationId: resolvedOrgId },
    include: {
      client: {
        select: {
          id: true,
          clientNumber: true,
          companyName: true,
          contactPerson: true,
          email: true,
          phoneNumber: true,
        },
      },
      generatedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProformaById(id: string) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id },
    include: {
      organisation: {
        include: { setting: true },
      },
      client: {
        include: {
          services: {
            include: {
              serviceItem: {
                include: { category: true },
              },
            },
          },
        },
      },
      generatedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  return proforma;
}

