"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  UserCheck,
  Building2,
  FileText,
  Calendar,
  UploadCloud,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  QrCode,
  ShieldCheck,
  Search,
  ChevronDown,
  CalendarDays,
  Sparkles,
} from "lucide-react";

interface ClientOption {
  id: string;
  assignedPerson: string;
  companyName?: string;
  email?: string;
}

interface CompanyOption {
  id: string;
  companyName: string;
  subdomain: string;
}

interface DocumentCreateViewProps {
  orgId?: string;
  orgName?: string;
  orgSubdomain?: string;
  onBackToList?: () => void;
  onSuccess?: () => void;
}

const DOCUMENT_TYPES = [
  { value: "TRADE_LICENSE", label: "Trade License" },
  { value: "COMMERCIAL_PERMIT", label: "Commercial Permit" },
  { value: "VISA", label: "Residence / Employment Visa" },
  { value: "PASSPORT", label: "Passport Copy" },
  { value: "EMIRATES_ID", label: "Emirates ID (EID)" },
  { value: "TENANCY_CONTRACT", label: "Tenancy Contract (Ejari)" },
  { value: "MEMORANDUM_OF_ASSOCIATION", label: "Memorandum of Association (MOA)" },
  { value: "TAX_REGISTRATION_CERTIFICATE", label: "Tax Registration Certificate (TRN)" },
  { value: "LABOUR_ESTABLISHMENT_CARD", label: "Labour Establishment Card" },
  { value: "INSURANCE_POLICY", label: "Corporate Health / Liability Insurance" },
  { value: "POWER_OF_ATTORNEY", label: "Power of Attorney (POA)" },
  { value: "OTHER", label: "Other Corporate Document" },
];

const DEFAULT_CLIENTS: ClientOption[] = [
  { id: "client-1", assignedPerson: "Al-Noor Logistics Ltd", companyName: "Al-Noor Logistics Ltd", email: "contact@alnoor.ae" },
  { id: "client-2", assignedPerson: "Quantum Capital Partners", companyName: "Quantum Capital LLC", email: "info@quantumcap.com" },
  { id: "client-3", assignedPerson: "Marcus Chen", companyName: "Apex Global Trading", email: "m.chen@apex.ae" },
  { id: "client-4", assignedPerson: "Sarah Jenkins", companyName: "Zenith Advisory FZ", email: "s.jenkins@zenith.ae" },
  { id: "client-5", assignedPerson: "Global First Trading LLC", companyName: "Global First Trading", email: "admin@globalfirst.ae" },
];

export function DocumentCreateView({
  orgId,
  orgName = "International Business Hub",
  orgSubdomain = "ibh",
  onBackToList,
  onSuccess,
}: DocumentCreateViewProps) {
  // Form State
  const [clientName, setClientName] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [companyName, setCompanyName] = useState(orgName || "");
  const [documentType, setDocumentType] = useState("TRADE_LICENSE");
  const [documentName, setDocumentName] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [description, setDescription] = useState("");

  // Upload State (null by default so no trade license pill shows below upload)
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    url: string;
    previewUrl?: string;
    type?: string;
  } | null>(null);

  const [availableClients, setAvailableClients] = useState<ClientOption[]>(DEFAULT_CLIENTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync default company name when orgName changes
  useEffect(() => {
    if (orgName && (!companyName || companyName === "International Business Hub")) {
      setCompanyName(orgName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgName]);

  // Load clients for the organisation from API
  useEffect(() => {
    async function loadClients() {
      try {
        const query = (orgId || orgSubdomain) ? `?organisationId=${orgId || orgSubdomain}` : "";
        const res = await fetch(`/api/documents/clients${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setAvailableClients(data.data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch clients list:", err);
      }
    }
    loadClients();
  }, [orgId, orgSubdomain]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "File exceeds maximum allowed size of 5 MB." });
      return;
    }

    const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    const localBlobUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setUploadedFile({
        name: file.name,
        size: fileSizeStr,
        url: base64Data,
        previewUrl: localBlobUrl,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);

    if (!documentName) {
      setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
    }

    setFeedback(null);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (isDraft = false) => {
    if (!clientName.trim() && !assignedPerson.trim()) {
      setFeedback({ type: "error", message: "Client name is required." });
      return;
    }

    if (!assignedPerson.trim()) {
      setFeedback({ type: "error", message: "Assigned person name is required." });
      return;
    }

    if (!companyName.trim()) {
      setFeedback({ type: "error", message: "Company name is required." });
      return;
    }

    if (!documentName.trim()) {
      setFeedback({ type: "error", message: "Document Name is required." });
      return;
    }

    if (!uploadedFile) {
      setFeedback({ type: "error", message: "Please upload a copy of the document." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const payload = {
      organisationId: orgId || orgSubdomain || "ibh",
      companyName: companyName.trim(),
      clientName: clientName.trim() || assignedPerson.trim(),
      assignedPerson: assignedPerson.trim(),
      documentType,
      documentName: documentName.trim(),
      issuingAuthority: issuingAuthority.trim() || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      status: isDraft ? "DRAFT" : status,
      description: description.trim() || undefined,
      documentUrl: uploadedFile.url,
    };

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create document");
      }

      setFeedback({
        type: "success",
        message: isDraft
          ? "Document saved as Draft successfully!"
          : "Document created successfully! Expiry notifications (7, 3, 1 days) have been scheduled.",
      });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onBackToList) onBackToList();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error creating document. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-20 select-none">
      {/* Top Header Breadcrumb & Actions Bar (matches screenshot) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Add New Document
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload and register a new document for a client and company.
          </p>
        </div>

       
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Client & Company Details */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="h-10 w-10 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Client &amp; Company Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the client and company for this document.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Client Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Client <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="clients-datalist"
                  required
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (!assignedPerson) setAssignedPerson(e.target.value);
                  }}
                  placeholder="Enter or select client"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
                <datalist id="clients-datalist">
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.companyName || c.assignedPerson}>
                      {c.companyName ? `${c.companyName} — ${c.assignedPerson}` : c.assignedPerson}
                    </option>
                  ))}
                </datalist>

                {/* Quick Client Suggestions */}
                {availableClients.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">Suggestions:</span>
                    {availableClients.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientName(c.companyName || c.assignedPerson);
                          setAssignedPerson(c.assignedPerson);
                          if (c.companyName) setCompanyName(c.companyName);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition-colors"
                      >
                        + {c.assignedPerson}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned Person Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Assigned Person <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assignedPerson}
                  onChange={(e) => setAssignedPerson(e.target.value)}
                  placeholder="Enter assigned person (e.g. John Doe, Director)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>

              {/* Company Input */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Company <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Document Information */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="h-10 w-10 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Document Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter the document details.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Row 1: Document Type & Document Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Document Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all cursor-pointer"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Document Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Enter document name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Issuing Authority & Issue Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={issuingAuthority}
                    onChange={(e) => setIssuingAuthority(e.target.value)}
                    placeholder="Enter issuing authority"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Issue Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Expiry Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Expiry Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="DRAFT">Draft</option>
                      <option value="EXPIRING_SOON">Expiring Soon</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="RENEWAL_IN_PROGRESS">Renewal in Progress</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any remarks or notes about this document..."
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Upload & Preview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 3: Document Upload */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0 shadow-sm">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Document Upload
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload a clear copy of the document. This is{" "}
                  <span className="text-orange-600 font-semibold">required.</span>
                </p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/20 hover:bg-orange-50/40 p-6 text-center transition-all duration-200"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/70 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-6 w-6" />
              </div>

              <div className="mt-3">
                <span className="text-xs font-bold text-orange-600 hover:underline">
                  Click to upload
                </span>
                <span className="text-xs text-slate-600"> or drag and drop</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG (Max 5 MB)</p>
            </div>

            {/* Uploaded File Preview Pill (matching screenshot) */}
            {uploadedFile && (
              <div className="mt-4 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-9 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs shrink-0 flex items-center justify-center text-slate-500">
                    <FileCheck2 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate" title={uploadedFile.name}>
                      {uploadedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {uploadedFile.size}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                  title="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

       
        </div>
      </div>

      {/* Bottom Sticky Action Bar (matches screenshot) */}
      <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3.5 bg-white/80 backdrop-blur-md sticky bottom-0 py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-t-2xl z-20">
        <button
          type="button"
          onClick={onBackToList}
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl border border-orange-500/80 bg-orange-50/40 hover:bg-orange-50 text-orange-600 font-semibold text-xs transition-colors shadow-xs"
        >
          Save as Draft
        </button>

        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Document...</span>
            </>
          ) : (
            <span>Create Document</span>
          )}
        </button>
      </div>
    </div>
  );
}
