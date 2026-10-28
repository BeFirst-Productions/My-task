"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Edit,
  ArrowUpDown,
  Building2,
  User,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface DocumentItem {
  id: string;
  documentName: string;
  documentType: string;
  assignedPerson?: string | null;
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
  };
  client?: {
    id: string;
    name: string;
    assignedPerson: string;
  } | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: string;
  documentUrl: string;
  createdAt: string;
}

interface DocumentListViewProps {
  orgId?: string;
  orgName?: string;
  orgSubdomain?: string;
  onAddNewDocument: () => void;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-1",
    documentName: "Trade_License_ABC_2026.pdf",
    documentType: "TRADE_LICENSE",
    assignedPerson: "Al-Noor Logistics Ltd",
    issuingAuthority: "Ministry of Economy",
    issueDate: "2026-10-15",
    expiryDate: "2027-10-14",
    status: "ACTIVE",
    documentUrl: "https://mytask.b-cdn.net/clientdocuments/Trade_License_ABC_2026.pdf",
    createdAt: "2026-10-15T10:00:00Z",
  },
  {
    id: "doc-2",
    documentName: "Ejari_Office_Floor_14.pdf",
    documentType: "TENANCY_CONTRACT",
    assignedPerson: "Quantum Capital LLC",
    issuingAuthority: "Dubai Land Department (DLD)",
    issueDate: "2026-01-10",
    expiryDate: "2026-10-25", // 3 days away!
    status: "EXPIRING_SOON",
    documentUrl: "https://mytask.b-cdn.net/clientdocuments/Ejari_Office_Floor_14.pdf",
    createdAt: "2026-01-10T09:00:00Z",
  },
  {
    id: "doc-3",
    documentName: "Marcus_Chen_Residency_Visa.pdf",
    documentType: "VISA",
    assignedPerson: "Marcus Chen",
    issuingAuthority: "GDRFA Dubai",
    issueDate: "2024-10-23",
    expiryDate: "2026-10-23", // 1 day away!
    status: "EXPIRING_SOON",
    documentUrl: "https://mytask.b-cdn.net/clientdocuments/Marcus_Chen_Residency_Visa.pdf",
    createdAt: "2024-10-23T11:00:00Z",
  },
  {
    id: "doc-4",
    documentName: "FTA_Tax_Registration_TRN.pdf",
    documentType: "TAX_REGISTRATION_CERTIFICATE",
    assignedPerson: "Global First Trading",
    issuingAuthority: "Federal Tax Authority (FTA)",
    issueDate: "2025-05-12",
    expiryDate: "2026-10-29", // 7 days away!
    status: "EXPIRING_SOON",
    documentUrl: "https://mytask.b-cdn.net/clientdocuments/FTA_Tax_Registration_TRN.pdf",
    createdAt: "2025-05-12T08:30:00Z",
  },
  {
    id: "doc-5",
    documentName: "Corporate_Health_Insurance_Policy.pdf",
    documentType: "INSURANCE_POLICY",
    assignedPerson: "Zenith Advisory FZ",
    issuingAuthority: "Dubai Health Authority",
    issueDate: "2025-09-01",
    expiryDate: "2026-09-01",
    status: "EXPIRED",
    documentUrl: "https://mytask.b-cdn.net/clientdocuments/Corporate_Health_Insurance_Policy.pdf",
    createdAt: "2025-09-01T14:20:00Z",
  },
];

export function DocumentListView({
  orgId,
  orgName = "International Business Hub",
  orgSubdomain = "ibh",
  onAddNewDocument,
}: DocumentListViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>(DEFAULT_DOCUMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const queryOrg = orgId || orgSubdomain || "";
      const url = queryOrg
        ? `/api/documents?organisationId=${encodeURIComponent(queryOrg)}`
        : "/api/documents";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setDocuments(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch documents, using defaults:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, orgSubdomain]);

  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleRequestDelete = (doc: DocumentItem) => {
    setDeletingDoc(doc);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/documents/${deletingDoc.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
        setDeletingDoc(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.message || "Failed to delete document from storage.");
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      setDeleteError("Error deleting document. Please check your connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Expiry calculation helper
  const getExpiryBadge = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) return null;
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80">
          <AlertTriangle className="h-3 w-3 shrink-0" /> Expired
        </span>
      );
    }
    if (diffDays <= 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
          <Clock className="h-3 w-3 shrink-0 text-rose-600 animate-pulse" /> 1 Day Left!
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
          <Clock className="h-3 w-3 shrink-0 text-amber-600" /> 3 Days Left
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800/80">
          <Clock className="h-3 w-3 shrink-0 text-orange-600" /> 7 Days Left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /> Valid ({diffDays}d)
      </span>
    );
  };

  // 7, 3, 1 Days Expiry Calculation
  const expiryCounts = useMemo(() => {
    const now = Date.now();
    let expiring1Day = 0;
    let expiring3Days = 0;
    let expiring7Days = 0;
    let expired = 0;

    documents.forEach((d) => {
      if (!d.expiryDate) return;
      const diff = Math.ceil((new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      if (diff < 0) {
        expired++;
      } else {
        if (diff <= 1) expiring1Day++;
        if (diff <= 3) expiring3Days++;
        if (diff <= 7) expiring7Days++;
      }
    });

    return { expiring1Day, expiring3Days, expiring7Days, expired };
  }, [documents]);

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.assignedPerson && doc.assignedPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.issuingAuthority && doc.issuingAuthority.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === "ALL" || doc.documentType === filterType;

    let matchesStatus = true;
    if (filterStatus === "EXPIRING_1_DAY") {
      if (!doc.expiryDate) return false;
      const diff = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      matchesStatus = diff >= 0 && diff <= 1;
    } else if (filterStatus === "EXPIRING_3_DAYS") {
      if (!doc.expiryDate) return false;
      const diff = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      matchesStatus = diff >= 0 && diff <= 3;
    } else if (filterStatus === "EXPIRING_7_DAYS") {
      if (!doc.expiryDate) return false;
      const diff = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      matchesStatus = diff >= 0 && diff <= 7;
    } else if (filterStatus !== "ALL") {
      matchesStatus = doc.status === filterStatus;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="w-full pb-20 select-none animate-fade-in">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1.5">
            <span className="text-slate-600">Super Admin</span>
            <span>&gt;</span>
            <span className="text-slate-900 font-semibold">Document Management</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Document Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage company compliance files, client agreements, and automated 7/3/1 day expiry alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDocs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#12141c] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors shadow-xs"
            title="Refresh documents list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-orange-500" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onAddNewDocument}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-all shadow-md shadow-orange-600/30"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Document</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Documents</span>
            <FolderOpen className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {documents.length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active &amp; Compliant</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {documents.filter((d) => d.status === "ACTIVE").length}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === "EXPIRING_7_DAYS" ? "ALL" : "EXPIRING_7_DAYS")}
          className={`text-left rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
            filterStatus === "EXPIRING_7_DAYS" || filterStatus === "EXPIRING_3_DAYS" || filterStatus === "EXPIRING_1_DAY"
              ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-[#12141c] border-amber-500/30 dark:border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50"
          }`}
          title="Click to filter documents expiring in 7, 3, or 1 days"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Expiring Soon (7/3/1d)
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {expiryCounts.expiring7Days}
            </span>
            {expiryCounts.expiring1Day > 0 && (
              <span className="text-[11px] font-bold text-rose-500 animate-pulse">
                ({expiryCounts.expiring1Day} urgent)
              </span>
            )}
          </div>
        </button>

        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-rose-200 dark:border-rose-900/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-500">Expired</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {documents.filter((d) => d.status === "EXPIRED").length}
          </div>
        </div>
      </div>

      {/* 7/3/1 Days Document Expiry Alert Banner */}
      {expiryCounts.expiring7Days > 0 && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Compliance Alert: Document Renewal Required</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  {expiryCounts.expiring7Days} Upcoming
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                System expiry check active: showing documents 7, 3, and 1 day before expiry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {expiryCounts.expiring1Day > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === "EXPIRING_1_DAY" ? "ALL" : "EXPIRING_1_DAY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterStatus === "EXPIRING_1_DAY"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white/90 dark:bg-slate-800/90 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                <span>🚨 1 Day Left:</span>
                <span className="font-mono font-bold">{expiryCounts.expiring1Day}</span>
              </button>
            )}

            {expiryCounts.expiring3Days > 0 && (
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === "EXPIRING_3_DAYS" ? "ALL" : "EXPIRING_3_DAYS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterStatus === "EXPIRING_3_DAYS"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "bg-white/90 dark:bg-slate-800/90 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <span>⚠️ 3 Days Left:</span>
                <span className="font-mono font-bold">{expiryCounts.expiring3Days}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === "EXPIRING_7_DAYS" ? "ALL" : "EXPIRING_7_DAYS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterStatus === "EXPIRING_7_DAYS"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-white/90 dark:bg-slate-800/90 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/80 hover:bg-orange-50 dark:hover:bg-orange-950/40"
              }`}
            >
              <span>ℹ️ 7 Days Left:</span>
              <span className="font-mono font-bold">{expiryCounts.expiring7Days}</span>
            </button>

            {filterStatus.startsWith("EXPIRING_") && (
              <button
                type="button"
                onClick={() => setFilterStatus("ALL")}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by client name, number..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Document Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All Document Types</option>
            <option value="TRADE_LICENSE">Trade License</option>
            <option value="COMMERCIAL_PERMIT">Commercial Permit</option>
            <option value="VISA">Visa</option>
            <option value="PASSPORT">Passport</option>
            <option value="EMIRATES_ID">Emirates ID</option>
            <option value="TENANCY_CONTRACT">Tenancy Contract</option>
            <option value="MEMORANDUM_OF_ASSOCIATION">MOA</option>
            <option value="TAX_REGISTRATION_CERTIFICATE">TRN Certificate</option>
            <option value="LABOUR_ESTABLISHMENT_CARD">Labour Card</option>
            <option value="INSURANCE_POLICY">Insurance Policy</option>
            <option value="POWER_OF_ATTORNEY">POA</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="EXPIRING_1_DAY">🚨 Expiring in 1 Day (Critical)</option>
            <option value="EXPIRING_3_DAYS">⚠️ Expiring in 3 Days (Warning)</option>
            <option value="EXPIRING_7_DAYS">ℹ️ Expiring in 7 Days (Notice)</option>
            <option value="ACTIVE">Active &amp; Compliant</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#171a24] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Document Name</th>
                <th className="py-3.5 px-4">Client / Assigned Person</th>
                <th className="py-3.5 px-4">Issuing Authority</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Status &amp; Alert</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <FolderOpen className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No documents found</p>
                      <p className="text-xs text-slate-400 mt-1">Upload client compliance certificates, visas, or contracts directly to Bunny Storage.</p>
                      <button
                        type="button"
                        onClick={onAddNewDocument}
                        className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Upload First Document</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[220px]">
                            {doc.documentName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {doc.documentType.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {doc.assignedPerson || doc.client?.assignedPerson || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {doc.issuingAuthority || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getExpiryBadge(doc.expiryDate)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                          title="Open document from Bunny CDN"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View CDN</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRequestDelete(doc)}
                          className="inline-flex items-center p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 text-slate-400 dark:text-slate-500 transition-colors"
                          title="Delete document and remove from Bunny Storage"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Document Confirmation Modal */}
      {deletingDoc && (
        <ConfirmationModal
          isOpen={!!deletingDoc}
          onClose={() => {
            if (!isDeleting) {
              setDeletingDoc(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Document?"
          subtitle="This action is permanent and will permanently delete the file from Storage."
          variant="danger"
          icon={<Trash2 className="h-5 w-5 text-rose-500" />}
          confirmText="Yes, Delete Document"
          cancelText="Cancel"
          isLoading={isDeleting}
          error={deleteError}
          entityPreview={{
            avatarText: (deletingDoc.documentName || "D").charAt(0).toUpperCase(),
            avatarBg: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
            title: deletingDoc.documentName,
            subtitle: `${deletingDoc.documentType.replace(/_/g, " ")} • Client: ${
              deletingDoc.assignedPerson || deletingDoc.client?.assignedPerson || "Unassigned"
            }`,
            badges: [
              {
                text: deletingDoc.status || "ACTIVE",
                variant: deletingDoc.status === "EXPIRED" ? "danger" : "default",
              },
              ...(deletingDoc.expiryDate
                ? [
                    {
                      text: `Expires: ${new Date(deletingDoc.expiryDate).toLocaleDateString()}`,
                      variant: "warning" as const,
                    },
                  ]
                : []),
            ],
          }}
          consequences={[
          
            {
              text: `All metadata, expiry tracking, and document records in the database will be erased.`,
              type: "danger",
            },
            {
              text: `Any scheduled email/WhatsApp reminder alerts for this document will be cancelled.`,
              type: "warning",
            },
          ]}
        />
      )}
    </div>
  );
}
