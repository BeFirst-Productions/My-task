"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  FileText,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  FolderPlus,
  X,
} from "lucide-react";

interface ClientOption {
  id: string;
  assignedPerson: string;
  companyName?: string;
  email?: string;
}

interface DocumentCreateViewProps {
  orgId?: string;
  orgName?: string;
  orgSubdomain?: string;
  onBackToList?: () => void;
  onSuccess?: () => void;
}

export const DOCUMENT_TYPES = [
  { value: "TRADE_LICENSE", label: "Trade License", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "TENANCY_CONTRACT", label: "Tenancy Contract (Ejari)", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "MEMORANDUM_OF_ASSOCIATION", label: "Memorandum of Association (MOA)", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "TAX_REGISTRATION_CERTIFICATE", label: "Tax Registration Certificate (TRN)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "COMMERCIAL_PERMIT", label: "Commercial Permit", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { value: "VISA", label: "Residence / Employment Visa", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "PASSPORT", label: "Passport Copy", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "EMIRATES_ID", label: "Emirates ID (EID)", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "LABOUR_ESTABLISHMENT_CARD", label: "Labour Establishment Card", color: "bg-slate-50 text-slate-700 border-slate-200" },
  { value: "INSURANCE_POLICY", label: "Corporate Health / Liability Insurance", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "POWER_OF_ATTORNEY", label: "Power of Attorney (POA)", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "OTHER", label: "Other Corporate Document", color: "bg-slate-100 text-slate-700 border-slate-300" },
];

const DEFAULT_CLIENTS: ClientOption[] = [
  { id: "client-1", assignedPerson: "Al-Noor Logistics Ltd", companyName: "Al-Noor Logistics Ltd", email: "contact@alnoor.ae" },
  { id: "client-2", assignedPerson: "Quantum Capital Partners", companyName: "Quantum Capital LLC", email: "info@quantumcap.com" },
  { id: "client-3", assignedPerson: "Marcus Chen", companyName: "Apex Global Trading", email: "m.chen@apex.ae" },
  { id: "client-4", assignedPerson: "Sarah Jenkins", companyName: "Zenith Advisory FZ", email: "s.jenkins@zenith.ae" },
  { id: "client-5", assignedPerson: "Global First Trading LLC", companyName: "Global First Trading", email: "admin@globalfirst.ae" },
];

export interface CompanyPackageDocItem {
  id: string;
  documentType: string;
  documentName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: string;
  description: string;
  file: {
    name: string;
    size: string;
    url: string; // Base64 or Bunny URL
    previewUrl?: string;
  } | null;
}

export function DocumentCreateView({
  orgId,
  orgName = "International Business Hub",
  orgSubdomain = "ibh",
  onBackToList,
  onSuccess,
}: DocumentCreateViewProps) {
  // Company / Client Details
  const [companyName, setCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [assignedPerson, setAssignedPerson] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Documents under this company (defaults to 1 empty slot)
  const [packageDocs, setPackageDocs] = useState<CompanyPackageDocItem[]>([
    {
      id: "doc-init-1",
      documentType: "TRADE_LICENSE",
      documentName: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      status: "ACTIVE",
      description: "",
      file: null,
    },
  ]);

  const [availableClients, setAvailableClients] = useState<ClientOption[]>(DEFAULT_CLIENTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load clients from API
  useEffect(() => {
    async function loadClients() {
      try {
        const query = orgId || orgSubdomain ? `?organisationId=${orgId || orgSubdomain}` : "";
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

  // Handle client selection from datalist / picker
  const handleSelectClient = (name: string) => {
    setClientName(name);
    const matched = availableClients.find(
      (c) =>
        c.assignedPerson.toLowerCase() === name.toLowerCase() ||
        (c.companyName && c.companyName.toLowerCase() === name.toLowerCase())
    );
    if (matched) {
      setSelectedClientId(matched.id);
      if (matched.companyName) setCompanyName(matched.companyName);
      if (matched.assignedPerson) setAssignedPerson(matched.assignedPerson);
    } else {
      setSelectedClientId(null);
      if (!companyName || companyName === orgName) {
        setCompanyName(name);
      }
      if (!assignedPerson) {
        setAssignedPerson(name);
      }
    }
  };

  // Document Slots Handlers
  const handleAddDocToPackage = () => {
    const newDoc: CompanyPackageDocItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      documentType: "TRADE_LICENSE",
      documentName: "",
      issuingAuthority: "",
      issueDate: "",
      expiryDate: "",
      status: "ACTIVE",
      description: "",
      file: null,
    };
    setPackageDocs((prev) => [...prev, newDoc]);
  };

  const handleUpdatePackageDoc = (
    id: string,
    field: keyof Omit<CompanyPackageDocItem, "id" | "file">,
    value: string
  ) => {
    setPackageDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handlePackageDocFileUpload = (id: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 5 MB.");
      return;
    }
    const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    const localBlobUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setPackageDocs((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          return {
            ...d,
            documentName: d.documentName || file.name.replace(/\.[^/.]+$/, ""),
            file: {
              name: file.name,
              size: fileSizeStr,
              url: base64Data,
              previewUrl: localBlobUrl,
            },
          };
        })
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePackageDoc = (id: string) => {
    if (packageDocs.length === 1) {
      alert("At least one document is required.");
      return;
    }
    setPackageDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Submit documents grouped under the company
  const handlePackageSubmit = async () => {
    const targetComp = companyName.trim() || clientName.trim();
    if (!targetComp) {
      setFeedback({
        type: "error",
        message: "Please enter the Company Name for these documents.",
      });
      return;
    }

    const missingFiles = packageDocs.filter((d) => !d.file);
    if (missingFiles.length > 0) {
      setFeedback({
        type: "error",
        message: `Please upload a file for each document slot (${missingFiles.length} missing file).`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const targetAssign = assignedPerson.trim() || clientName.trim() || targetComp;

    const payload = {
      organisationId: orgId || orgSubdomain || "default",
      clientId: selectedClientId || undefined,
      companyName: targetComp,
      clientName: clientName.trim() || targetComp,
      assignedPerson: targetAssign,
      documents: packageDocs.map((d) => ({
        documentType: d.documentType,
        documentName: d.documentName.trim(),
        issuingAuthority: d.issuingAuthority.trim() || undefined,
        issueDate: d.issueDate || undefined,
        expiryDate: d.expiryDate || undefined,
        status: d.status || "ACTIVE",
        description: d.description.trim() || undefined,
        documentUrl: d.file!.url,
      })),
    };

    try {
      // 1. Try batch endpoint
      const batchRes = await fetch("/api/documents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (batchRes.ok) {
        setFeedback({
          type: "success",
          message: `Successfully saved ${packageDocs.length} document(s) under "${targetComp}"!`,
        });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          else if (onBackToList) onBackToList();
        }, 1500);
        return;
      }

      // 2. Fallback: upload each document sequentially
      let successCount = 0;
      for (const d of packageDocs) {
        const singlePayload = {
          organisationId: orgId || orgSubdomain || "default",
          clientId: selectedClientId || undefined,
          companyName: targetComp,
          clientName: clientName.trim() || targetAssign,
          assignedPerson: targetAssign,
          documentType: d.documentType,
          documentName: d.documentName.trim(),
          issuingAuthority: d.issuingAuthority.trim() || undefined,
          issueDate: d.issueDate || undefined,
          expiryDate: d.expiryDate || undefined,
          status: d.status || "ACTIVE",
          description: d.description.trim() || undefined,
          documentUrl: d.file!.url,
        };
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(singlePayload),
        });
        if (res.ok) successCount++;
      }

      setFeedback({
        type: "success",
        message: `Successfully saved ${successCount} document(s) under "${targetComp}"!`,
      });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onBackToList) onBackToList();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to save company documents.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* ── Top Header Bar ── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Add Company Documents
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Upload and organize documents grouped under a company.
            </p>
          </div>
        </div>
      </div>

      {/* ── Feedback Alert ── */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Company Information Card ── */}
      <div className="mb-6 bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-2xs">
        <div className="flex items-start gap-3.5 mb-5">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Company &amp; Account Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specify the company under which the document(s) will be stored.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="companies-datalist"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Company ABC or Al-Noor Logistics"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
            />
            <datalist id="companies-datalist">
              {availableClients.map((c) => (
                <option key={c.id} value={c.companyName || c.assignedPerson} />
              ))}
            </datalist>
          </div>

          {/* Client / Contact Person */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Client / Contact Person
            </label>
            <input
              type="text"
              list="clients-datalist"
              value={clientName}
              onChange={(e) => handleSelectClient(e.target.value)}
              placeholder="e.g. Ali Ramez"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
            />
            <datalist id="clients-datalist">
              {availableClients.map((c) => (
                <option key={c.id} value={c.assignedPerson} />
              ))}
            </datalist>
          </div>

          {/* Assigned Staff */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Assigned Staff / Representative
            </label>
            <input
              type="text"
              value={assignedPerson}
              onChange={(e) => setAssignedPerson(e.target.value)}
              placeholder="e.g. Ahmed Rameez"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Document Slots Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Document Attachments
          </h3>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {packageDocs.length} Document{packageDocs.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Document Cards List */}
        <div className="space-y-4">
          {packageDocs.map((doc, index) => {
            const typeMeta = DOCUMENT_TYPES.find((t) => t.value === doc.documentType) || DOCUMENT_TYPES[0];
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs relative transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">
                      #{index + 1}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${typeMeta.color}`}>
                      {typeMeta.label}
                    </span>
                  </div>

                  {packageDocs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePackageDoc(doc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove document slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left: Metadata (7 cols) */}
                  <div className="md:col-span-7 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Document Type
                        </label>
                        <select
                          value={doc.documentType}
                          onChange={(e) =>
                            handleUpdatePackageDoc(doc.id, "documentType", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                        >
                          {DOCUMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Document Name / Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={doc.documentName}
                          onChange={(e) =>
                            handleUpdatePackageDoc(doc.id, "documentName", e.target.value)
                          }
                          placeholder="e.g. Trade_License_2026.pdf"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Issuing Authority
                        </label>
                        <input
                          type="text"
                          value={doc.issuingAuthority}
                          onChange={(e) =>
                            handleUpdatePackageDoc(doc.id, "issuingAuthority", e.target.value)
                          }
                          placeholder="e.g. DET Dubai / DLD"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={doc.issueDate}
                          onChange={(e) =>
                            handleUpdatePackageDoc(doc.id, "issueDate", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={doc.expiryDate}
                          onChange={(e) =>
                            handleUpdatePackageDoc(doc.id, "expiryDate", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Notes &amp; Description
                      </label>
                      <input
                        type="text"
                        value={doc.description}
                        onChange={(e) =>
                          handleUpdatePackageDoc(doc.id, "description", e.target.value)
                        }
                        placeholder="Optional remarks, license activities or terms..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Right: Upload Box (5 cols) */}
                  <div className="md:col-span-5 flex flex-col justify-center">
                    {doc.file ? (
                      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            ✓
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {doc.file.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{doc.file.size}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPackageDocs((prev) =>
                              prev.map((d) => (d.id === doc.id ? { ...d, file: null } : d))
                            )
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                          title="Replace file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50">
                        <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Upload File (PDF / Image)
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Max 5MB per document</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePackageDocFileUpload(doc.id, f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Another Document Button & Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => handleAddDocToPackage()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4 text-amber-500" />
            <span>+ Add Another Document Slot</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onBackToList && (
              <button
                type="button"
                onClick={onBackToList}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePackageSubmit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Saving {packageDocs.length} Document(s)...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  <span>
                    {packageDocs.length > 1
                      ? `Save All ${packageDocs.length} Documents Under ${companyName || "Company"}`
                      : `Save Document Under ${companyName || "Company"}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
