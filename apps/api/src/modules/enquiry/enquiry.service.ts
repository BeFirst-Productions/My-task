import { prisma } from "../../database/index.js";
import {
  uploadEnquiryDocumentToBunny,
  deleteDocumentFromBunny,
} from "../../services/bunny.service.js";
import type {
  CreateEnquiryInput,
  UpdateEnquiryInput,
  EnquiryQueryInput,
} from "./enquiry.schema.js";

export class EnquiryService {
  /**
   * Creates a new business setup enquiry.
   * If a document is attached (Base64 / data URL / file), uploads directly to Bunny Storage
   * specifically into the "enquiry-docs" folder.
   */
  async createEnquiry(input: CreateEnquiryInput) {
    let documentUrl: string | undefined = undefined;

    if (input.document && typeof input.document === "string" && input.document.trim().length > 0) {
      try {
        documentUrl = await uploadEnquiryDocumentToBunny(
          input.document,
          input.documentName || `${input.subdomain}_doc.pdf`,
          input.companyName
        );
      } catch (err) {
        console.error("[EnquiryService] Error uploading enquiry document to Bunny:", err);
        // Fallback to storing raw URL if upload fails
        if (input.document.startsWith("http")) {
          documentUrl = input.document;
        }
      }
    }

    const enquiry = await (prisma as any).enquiry.create({
      data: {
        companyName: input.companyName.trim(),
        primaryLocation: input.primaryLocation.trim(),
        subdomain: input.subdomain.trim().toLowerCase(),
        email: input.email.trim().toLowerCase(),
        mobileNumber: input.mobileNumber.trim(),
        subscriptionPlan: input.subscriptionPlan || "GROWTH",
        documentUrl: documentUrl || null,
        documentName: input.documentName || null,
        documentSize: input.documentSize || null,
        status: "PENDING",
        notes: input.notes?.trim() || null,
      },
    });

    // Notify the Platform Owner about the new incoming enquiry
    try {
      await (prisma as any).systemNotification.create({
        data: {
          recipientRole: "PLATFORM_OWNER",
          title: `New Business Enquiry: ${enquiry.companyName}`,
          message: `${enquiry.companyName} (${enquiry.primaryLocation}) requested ${enquiry.subscriptionPlan} package. Subdomain: ${enquiry.subdomain}.mytask.com${
            enquiry.documentUrl ? " • Document saved in Bunny Storage" : ""
          }`,
          type: "ENQUIRY",
          referenceId: enquiry.id,
          isRead: false,
        },
      });
      console.log(`[EnquiryService] Created platform notification for enquiry ${enquiry.id}`);
    } catch (notifErr) {
      console.error("[EnquiryService] Failed to create system notification for enquiry:", notifErr);
    }

    return enquiry;
  }

  /**
   * Retrieves paginated enquiries with optional filters and keyword search.
   */
  async getEnquiries(query: EnquiryQueryInput) {
    const { search, status, primaryLocation, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (primaryLocation && primaryLocation !== "ALL") {
      where.primaryLocation = primaryLocation;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: "insensitive" } },
        { subdomain: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { mobileNumber: { contains: term, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      (prisma as any).enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).enquiry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Aggregates stats for the Platform Owner overview cards.
   */
  async getEnquiryStats() {
    const [total, pending, contacted, qualified, converted, rejected] = await Promise.all([
      (prisma as any).enquiry.count(),
      (prisma as any).enquiry.count({ where: { status: "PENDING" } }),
      (prisma as any).enquiry.count({ where: { status: "CONTACTED" } }),
      (prisma as any).enquiry.count({ where: { status: "QUALIFIED" } }),
      (prisma as any).enquiry.count({ where: { status: "CONVERTED" } }),
      (prisma as any).enquiry.count({ where: { status: "REJECTED" } }),
    ]);

    return {
      total,
      pending,
      contacted,
      qualified,
      converted,
      rejected,
    };
  }

  /**
   * Retrieves a single enquiry by its unique ID.
   */
  async getEnquiryById(id: string) {
    const enquiry = await (prisma as any).enquiry.findUnique({
      where: { id },
    });
    return enquiry;
  }

  /**
   * Updates enquiry details, status, or notes.
   * If a new document is provided, the previous document is removed from Bunny Storage.
   */
  async updateEnquiry(id: string, input: UpdateEnquiryInput) {
    const existing = await (prisma as any).enquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Enquiry with ID "${id}" was not found.`);
    }

    let documentUrl: string | undefined = undefined;

    if (input.document && typeof input.document === "string" && input.document.trim().length > 0) {
      try {
        documentUrl = await uploadEnquiryDocumentToBunny(
          input.document,
          input.documentName || `enquiry_${id}_doc.pdf`,
          input.companyName || existing.companyName
        );

        // Delete old document from Bunny Storage if it was replaced
        if (existing.documentUrl && existing.documentUrl !== documentUrl) {
          await deleteDocumentFromBunny(existing.documentUrl);
        }
      } catch (err) {
        console.error("[EnquiryService] Error updating document to Bunny:", err);
      }
    }

    const data: any = {};
    if (input.status) data.status = input.status;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.companyName) data.companyName = input.companyName.trim();
    if (input.primaryLocation) data.primaryLocation = input.primaryLocation.trim();
    if (input.subdomain) data.subdomain = input.subdomain.trim().toLowerCase();
    if (input.email) data.email = input.email.trim().toLowerCase();
    if (input.mobileNumber) data.mobileNumber = input.mobileNumber.trim();
    if (input.subscriptionPlan) data.subscriptionPlan = input.subscriptionPlan;
    if (documentUrl) {
      data.documentUrl = documentUrl;
      if (input.documentName) data.documentName = input.documentName;
      if (input.documentSize) data.documentSize = input.documentSize;
    }

    const updated = await (prisma as any).enquiry.update({
      where: { id },
      data,
    });

    return updated;
  }

  /**
   * Deletes an enquiry and deletes its attached document from Bunny Storage (enquiry-docs).
   */
  async deleteEnquiry(id: string) {
    const enquiry = await (prisma as any).enquiry.findUnique({
      where: { id },
    });

    if (!enquiry) {
      throw new Error(`Enquiry with ID "${id}" was not found.`);
    }

    // Delete associated document from Bunny Storage in enquiry-docs folder
    if (enquiry.documentUrl) {
      try {
        await deleteDocumentFromBunny(enquiry.documentUrl);
        console.log(`[EnquiryService] Deleted file from Bunny Storage: ${enquiry.documentUrl}`);
      } catch (bunnyErr) {
        console.error(`[EnquiryService] Warning: Failed to delete Bunny document ${enquiry.documentUrl}:`, bunnyErr);
      }
    }

    // Delete the database record
    await (prisma as any).enquiry.delete({
      where: { id },
    });

    return { success: true };
  }
}

export const enquiryService = new EnquiryService();

