import { env } from "../config/index.js";

/**
 * Supported Bunny Storage Regions and their REST API Hostnames.
 * Reference: https://docs.bunny.net/reference/storage-api
 */
const BUNNY_STORAGE_ENDPOINTS: Record<string, string> = {
  de: "storage.bunnycdn.com", // Falkenstein (Default EU)
  uk: "uk.storage.bunnycdn.com", // London
  ny: "ny.storage.bunnycdn.com", // New York (US East)
  la: "la.storage.bunnycdn.com", // Los Angeles (US West)
  sg: "sg.storage.bunnycdn.com", // Singapore
  syd: "syd.storage.bunnycdn.com", // Sydney
  se: "se.storage.bunnycdn.com", // Stockholm
  br: "br.storage.bunnycdn.com", // São Paulo
  jh: "jh.storage.bunnycdn.com", // Johannesburg
};

export interface BunnyUploadOptions {
  buffer: Buffer;
  originalFilename: string;
  mimeType?: string;
  folder?: string;
}

export interface BunnyUploadResult {
  success: boolean;
  url: string;
  storagePath: string;
  fileName: string;
  size: number;
  mimeType: string;
  isMock?: boolean;
}

/**
 * Resolves the Bunny Storage API endpoint based on the configured region.
 */
export function getBunnyStorageHostname(region: string = "de"): string {
  const normalizedRegion = region.trim().toLowerCase();
  return BUNNY_STORAGE_ENDPOINTS[normalizedRegion] || BUNNY_STORAGE_ENDPOINTS.de || "storage.bunnycdn.com";
}

/**
 * Sanitizes a filename to prevent directory traversal or unsafe URL characters.
 */
export function sanitizeBunnyFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const cleanName = originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();

  return `${timestamp}_${cleanName}`;
}

/**
 * Uploads a document (e.g. Trade Licence) to Bunny.net Storage via its REST API.
 * Returns the public Bunny CDN URL for saving in the database.
 */
export async function uploadDocumentToBunny(
  options: BunnyUploadOptions
): Promise<BunnyUploadResult> {
  const {
    buffer,
    originalFilename,
    mimeType = "application/pdf",
    folder = "trade-licences",
  } = options;

  const storageZone = env.BUNNY_STORAGE_ZONE_NAME?.trim();
  const accessKey = env.BUNNY_STORAGE_ACCESS_KEY?.trim();
  const region = env.BUNNY_STORAGE_REGION?.trim() || "de";
  const cdnBaseUrl = (env.BUNNY_CDN_URL?.trim() || "https://omniexpiry.b-cdn.net").replace(
    /\/$/,
    ""
  );

  const fileName = sanitizeBunnyFilename(originalFilename);
  const storagePath = `${folder}/${fileName}`;

  // Check if live Bunny credentials are provided
  const hasLiveCredentials =
    Boolean(storageZone) &&
    Boolean(accessKey) &&
    accessKey !== "your-bunny-storage-access-key";

  if (!hasLiveCredentials) {
    console.warn(
      `[BunnyStorage] Real credentials not set in .env (Storage Zone: "${storageZone}"). Using simulated Bunny CDN URL for development.`
    );

    const publicUrl = `${cdnBaseUrl}/${storagePath}`;

    return {
      success: true,
      url: publicUrl,
      storagePath,
      fileName,
      size: buffer.length,
      mimeType,
      isMock: true,
    };
  }

  // Upload to Bunny.net Storage REST API
  const endpoint = getBunnyStorageHostname(region);
  const uploadUrl = `https://${endpoint}/${storageZone}/${storagePath}`;

  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": mimeType,
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[BunnyStorage] Upload failed (${response.status} ${response.statusText}):`,
        errorText
      );
      throw new Error(
        `Failed to upload document to Bunny.net (${response.status}): ${errorText || response.statusText}`
      );
    }

    const publicUrl = `${cdnBaseUrl}/${storagePath}`;

    return {
      success: true,
      url: publicUrl,
      storagePath,
      fileName,
      size: buffer.length,
      mimeType,
      isMock: false,
    };
  } catch (err) {
    console.error("[BunnyStorage] Network or API error during upload:", err);
    throw err instanceof Error
      ? err
      : new Error("Unknown error while uploading to Bunny.net Storage");
  }
}

/**
 * Deletes a document from Bunny.net Storage.
 */
export async function deleteDocumentFromBunny(
  storagePath: string
): Promise<boolean> {
  const storageZone = env.BUNNY_STORAGE_ZONE_NAME?.trim();
  const accessKey = env.BUNNY_STORAGE_ACCESS_KEY?.trim();
  const region = env.BUNNY_STORAGE_REGION?.trim() || "de";

  const hasLiveCredentials =
    Boolean(storageZone) &&
    Boolean(accessKey) &&
    accessKey !== "your-bunny-storage-access-key";

  if (!hasLiveCredentials) {
    console.warn("[BunnyStorage] Mock deletion skipped (no live credentials).");
    return true;
  }

  const endpoint = getBunnyStorageHostname(region);
  const deleteUrl = `https://${endpoint}/${storageZone}/${storagePath}`;

  try {
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        AccessKey: accessKey,
      },
    });

    return response.ok;
  } catch (err) {
    console.error("[BunnyStorage] Error deleting document:", err);
    return false;
  }
}

/**
 * Handles trade licence document input (Base64 data URI, buffer, filename, or existing URL),
 * uploads the document directly to Bunny.net Storage, and returns the public Bunny CDN URL.
 * Called directly in organization.service.ts during organisation registration.
 */
export async function uploadTradeLicenceDocument(
  documentInput: string | Buffer,
  companyName: string = "company"
): Promise<string> {
  const cdnBaseUrl = (env.BUNNY_CDN_URL?.trim() || "https://omniexpiry.b-cdn.net").replace(
    /\/$/,
    ""
  );

  // 1. If documentInput is already an HTTP / HTTPS Bunny URL, return it
  if (
    typeof documentInput === "string" &&
    (documentInput.startsWith("http://") || documentInput.startsWith("https://"))
  ) {
    return documentInput;
  }

  // 2. If documentInput is a Base64 Data URI (e.g. data:application/pdf;base64,JVBERi0...)
  if (typeof documentInput === "string" && documentInput.startsWith("data:")) {
    const matches = documentInput.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches[1] && matches[2]) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      let extension = "pdf";
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
      else if (mimeType.includes("png")) extension = "png";
      else if (mimeType.includes("webp")) extension = "webp";

      const safeCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      const filename = `trade_licence_${safeCompany}.${extension}`;

      const result = await uploadDocumentToBunny({
        buffer,
        originalFilename: filename,
        mimeType,
        folder: "trade-licences",
      });

      return result.url;
    }
  }

  // 3. If documentInput is a raw Buffer
  if (Buffer.isBuffer(documentInput)) {
    const safeCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const result = await uploadDocumentToBunny({
      buffer: documentInput,
      originalFilename: `trade_licence_${safeCompany}.pdf`,
      mimeType: "application/pdf",
      folder: "trade-licences",
    });

    return result.url;
  }

  // 4. If documentInput is a raw base64 string
  if (
    typeof documentInput === "string" &&
    documentInput.length > 200 &&
    !documentInput.includes(" ") &&
    !documentInput.includes("/")
  ) {
    try {
      const buffer = Buffer.from(documentInput, "base64");
      const safeCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      const result = await uploadDocumentToBunny({
        buffer,
        originalFilename: `trade_licence_${safeCompany}.pdf`,
        mimeType: "application/pdf",
        folder: "trade-licences",
      });

      return result.url;
    } catch {
      // Continue to fallback
    }
  }

  // 5. If documentInput is a filename (e.g. "trade_licence.pdf")
  const cleanName = sanitizeBunnyFilename(
    typeof documentInput === "string" && documentInput.length > 0
      ? documentInput
      : "trade_licence.pdf"
  );
  return `${cdnBaseUrl}/trade-licences/${cleanName}`;
}

/**
 * Uploads organisation media (logo or document) to Bunny Storage.
 * Supports data URIs (Base64), direct URLs, buffers, and filenames.
 */
export async function uploadMediaOrDocumentToBunny(
  fileInput: string | Buffer | null | undefined,
  folder: "logos" | "documents" = "documents",
  filePrefix: string = "file"
): Promise<string | null> {
  if (!fileInput) return null;

  const cdnBaseUrl = (env.BUNNY_CDN_URL?.trim() || "https://omniexpiry.b-cdn.net").replace(
    /\/$/,
    ""
  );

  // If already an HTTP/HTTPS URL, keep it
  if (
    typeof fileInput === "string" &&
    (fileInput.startsWith("http://") || fileInput.startsWith("https://"))
  ) {
    return fileInput;
  }

  // If Data URI (base64)
  if (typeof fileInput === "string" && fileInput.startsWith("data:")) {
    const matches = fileInput.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches[1] && matches[2]) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      let extension = "png";
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
      else if (mimeType.includes("webp")) extension = "webp";
      else if (mimeType.includes("svg")) extension = "svg";
      else if (mimeType.includes("pdf")) extension = "pdf";

      const safePrefix = filePrefix.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      const filename = `${safePrefix}_${Date.now()}.${extension}`;

      const result = await uploadDocumentToBunny({
        buffer,
        originalFilename: filename,
        mimeType,
        folder,
      });

      return result.url;
    }
  }

  // If raw base64 without data: prefix
  if (
    typeof fileInput === "string" &&
    fileInput.length > 200 &&
    !fileInput.includes(" ") &&
    !fileInput.startsWith("http")
  ) {
    try {
      const buffer = Buffer.from(fileInput, "base64");
      const safePrefix = filePrefix.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      const ext = folder === "logos" ? "png" : "pdf";
      const mime = folder === "logos" ? "image/png" : "application/pdf";
      const filename = `${safePrefix}_${Date.now()}.${ext}`;

      const result = await uploadDocumentToBunny({
        buffer,
        originalFilename: filename,
        mimeType: mime,
        folder,
      });

      return result.url;
    } catch {
      // Continue to fallback
    }
  }

  // Fallback if plain string or filename
  if (typeof fileInput === "string" && fileInput.trim().length > 0) {
    const cleanName = sanitizeBunnyFilename(fileInput);
    return `${cdnBaseUrl}/${folder}/${cleanName}`;
  }

  return null;
}

