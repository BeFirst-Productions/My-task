import { prisma } from "../../database/index.js";
import { resolveOrganisationId } from "../task/task.service.js";

const DEFAULT_CATALOG_DATA = [
  {
    name: "Trade License & Commercial",
    type: "TRADE_LICENSE" as const,
    description: "New formation, renewal, and amendment services for UAE mainland and freezone licenses.",
    services: [
      { name: "Trade License Renewal", basePrice: 1200.0, estimatedDays: 5, description: "Official renewal through DED / relevant Freezone authority." },
      { name: "New Trade License Application", basePrice: 2800.0, estimatedDays: 10, description: "End-to-end commercial trade license issuance." },
      { name: "Commercial Permit Application", basePrice: 850.0, estimatedDays: 3, description: "Special activity and municipal permit approvals." },
      { name: "MOA Amendment & Attestation", basePrice: 1400.0, estimatedDays: 4, description: "Memorandum amendment, notary attestation, and shareholder restructuring." },
    ],
  },
  {
    name: "Visa & Immigration",
    type: "VISA_IMMIGRATION" as const,
    description: "Residence, employment, partner, and dependent visa issuance and renewal.",
    services: [
      { name: "Employment Visa Processing", basePrice: 1600.0, estimatedDays: 7, description: "Entry permit, medical test, Emirates ID, and residency stamping." },
      { name: "Residence Visa Renewal", basePrice: 1100.0, estimatedDays: 5, description: "Medical fitness, Emirates ID renewal, and residency endorsement." },
      { name: "Visa Cancellation & Clearance", basePrice: 550.0, estimatedDays: 2, description: "Residency cancellation and settlement clearance." },
      { name: "Golden Visa Consultation & Filing", basePrice: 3500.0, estimatedDays: 14, description: "Eligibility review, nomination filing, and long-term residency issuance." },
    ],
  },
  {
    name: "Corporate Banking & Financial",
    type: "BANKING_FINANCE" as const,
    description: "Corporate bank account opening, VAT registration, and compliance assistance.",
    services: [
      { name: "Corporate Bank Account Opening", basePrice: 2200.0, estimatedDays: 14, description: "Application preparation, banker meeting coordination, and compliance follow-up." },
      { name: "Tax TRN Registration (FTA)", basePrice: 950.0, estimatedDays: 4, description: "Federal Tax Authority VAT registration and TRN certificate issuance." },
      { name: "Corporate Tax Registration", basePrice: 1250.0, estimatedDays: 5, description: "UAE Corporate Tax registration and EmaraTax portal setup." },
    ],
  },
  {
    name: "PRO & Government Services",
    type: "PRO_ATTESTATION" as const,
    description: "Ministry of Human Resources (MOHRE), Labour, and Municipal attestations.",
    services: [
      { name: "Labour Establishment Card", basePrice: 750.0, estimatedDays: 3, description: "MOHRE establishment card issuance and renewal." },
      { name: "Tenancy Contract (Ejari) Registration", basePrice: 600.0, estimatedDays: 2, description: "Ejari contract attestation and Dubai Land Department registration." },
      { name: "Power of Attorney (POA) Notarization", basePrice: 900.0, estimatedDays: 3, description: "Drafting, legal translation, and Dubai Court notary attestation." },
      { name: "Custom PRO Services", basePrice: 500.0, estimatedDays: 3, description: "Ad-hoc government document submission and representation." },
    ],
  },
];

export async function getOrSeedServiceCatalog(organisationId?: string) {
  const resolvedOrgId = await resolveOrganisationId(organisationId);
  if (!resolvedOrgId) {
    return [];
  }

  // Check if categories already exist for this organisation
  const existingCategories = await prisma.serviceCategory.findMany({
    where: { organisationId: resolvedOrgId },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingCategories.length > 0) {
    return existingCategories;
  }

  // Seed default catalog for this organisation
  for (const catData of DEFAULT_CATALOG_DATA) {
    const category = await prisma.serviceCategory.create({
      data: {
        organisationId: resolvedOrgId,
        name: catData.name,
        type: catData.type,
        description: catData.description,
      },
    });

    for (const srv of catData.services) {
      await prisma.serviceItem.create({
        data: {
          organisationId: resolvedOrgId,
          categoryId: category.id,
          name: srv.name,
          basePrice: srv.basePrice,
          estimatedDays: srv.estimatedDays,
          description: srv.description,
          isActive: true,
        },
      });
    }
  }

  return prisma.serviceCategory.findMany({
    where: { organisationId: resolvedOrgId },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

