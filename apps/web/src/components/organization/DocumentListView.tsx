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
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Layers,
  UploadCloud,
  X,
  FileCheck2,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";
import { getAuthHeaders } from "@/services/auth.service";
import { DOCUMENT_TYPES } from "./DocumentCreateView";

interface DocumentItem {
  id: string;
  documentName: string;
  documentType: string;
  assignedPerson?: string | null;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    fullName?: string | null;
    username?: string | null;
    role?: string | null;
  } | null;
  organisation?: {
    id: string;
    companyName: string;
    subdomain: string;
  };
  client?: {
    id: string;
    name?: string;
    assignedPerson?: string;
    companyName?: string;
    clientNumber?: string;
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

export function DocumentListView({
  orgId,
  orgName = "International Business Hub",
  orgSubdomain = "ibh",
  onAddNewDocument,
}: DocumentListViewProps) {
  const { user, setAvailability } = useAuth();
  const isStaffOffline = user?.role === "STAFF" && user?.isAvailable === false;
  const [offlineUploadPrompt, setOfflineUploadPrompt] = useState<{
    type: "NEW_DOC" | "QUICK_ADD";
    companyName?: string;
    clientId?: string;
  } | null>(null);
  const [isGoingOnline, setIsGoingOnline] = useState(false);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // View Mode: "flat" (All documents detailed table - latest on top) vs "company" (Grouped by Company folders)
  const [viewMode, setViewMode] = useState<"flat" | "company">("flat");

  // Expanded Company Folders state (stores company names that are expanded)
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  // Quick Add Document Modal State
  const [quickAddCompany, setQuickAddCompany] = useState<{
    companyName: string;
    clientId?: string;
  } | null>(null);
  const [quickAddType, setQuickAddType] = useState("TRADE_LICENSE");
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddAuthority, setQuickAddAuthority] = useState("");
  const [quickAddIssueDate, setQuickAddIssueDate] = useState("");
  const [quickAddExpiryDate, setQuickAddExpiryDate] = useState("");
  const [quickAddFile, setQuickAddFile] = useState<{ name: string; size: string; url: string } | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Edit Document Modal State
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocType, setEditDocType] = useState("TRADE_LICENSE");
  const [editDocAuthority, setEditDocAuthority] = useState("");
  const [editDocIssueDate, setEditDocIssueDate] = useState("");
  const [editDocExpiryDate, setEditDocExpiryDate] = useState("");
  const [editDocStatus, setEditDocStatus] = useState("ACTIVE");
  const [editDocFile, setEditDocFile] = useState<{ name: string; size: string; url: string } | null>(null);
  const [isUpdatingDoc, setIsUpdatingDoc] = useState(false);
  const [editDocError, setEditDocError] = useState<string | null>(null);

  // Deletion State
  const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const queryOrg = orgId || orgSubdomain || "";
      const params = new URLSearchParams();
      if (queryOrg) params.append("organisationId", queryOrg);
      if (user?.id) params.append("userId", user.id);
      if (user?.role) params.append("userRole", user.role);
      params.append("limit", "500");

      const qs = params.toString();
      const url = qs ? `/api/documents?${qs}` : "/api/documents";
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setDocuments(data.data);
        } else {
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.warn("Failed to fetch documents:", err);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, orgSubdomain, user?.id, user?.role]);

  useEffect(() => {
    const handleDocumentCreated = () => {
      fetchDocs();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("org-document-created", handleDocumentCreated);
      return () => {
        window.removeEventListener("org-document-created", handleDocumentCreated);
      };
    }
  }, []);

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
      setDeleteError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle company accordion
  const toggleCompany = (company: string) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [company]: !prev[company],
    }));
  };

  // Expiry badge helper
  const getExpiryBadge = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          No Expiry
        </span>
      );
    }
    const expiry = new Date(expiryDateStr).getTime();
    const diffDays = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" /> Expired
        </span>
      );
    }
    if (diffDays <= 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 animate-pulse">
          <Clock className="h-3 w-3 shrink-0 text-rose-600" /> 1 Day Left!
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
          <Clock className="h-3 w-3 shrink-0 text-amber-600" /> 3 Days Left
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50">
          <Clock className="h-3 w-3 shrink-0 text-orange-600" /> 7 Days Left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /> Valid ({diffDays}d)
      </span>
    );
  };

  // Helper to reliably extract numeric timestamp for sorting (most recent first)
  const getDocTimestamp = (doc?: DocumentItem | null): number => {
    if (!doc) return 0;
    if (doc.createdAt) {
      const t = new Date(doc.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // Helper to format added / created date with time
  const formatAddedDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      const now = Date.now();
      const diffMs = now - d.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Expiry calculations
  const expiryCounts = useMemo(() => {
    const now = Date.now();
    let expiring1Day = 0;
    let expiring3Days = 0;
    let expiring7Days = 0;
    let expired = 0;
    let active = 0;

    documents.forEach((d) => {
      if (!d.expiryDate) {
        active++;
        return;
      }
      const diff = Math.ceil((new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      if (diff < 0) {
        expired++;
      } else {
        active++;
        if (diff <= 1) expiring1Day++;
        if (diff <= 3) expiring3Days++;
        if (diff <= 7) expiring7Days++;
      }
    });

    return { active, expiring1Day, expiring3Days, expiring7Days, expired };
  }, [documents]);

  // Filtered documents - strictly sorted by most recently added first (last added on top)
  const filteredDocs = useMemo(() => {
    return documents
      .filter((doc) => {
        // If user is staff, only show documents added by that staff member
        if (user && (user.role === "STAFF" || user.role === "SALES_STAFF")) {
          const isOwner =
            doc.uploadedById === user.id ||
            doc.uploadedBy?.id === user.id ||
            (doc.uploadedBy?.username && doc.uploadedBy.username === user.username);
          if (!isOwner) {
            return false;
          }
        }

        const compName =
          doc.client?.companyName ||
          doc.assignedPerson ||
          doc.organisation?.companyName ||
          "";
        const authorName = doc.uploadedBy?.fullName || doc.uploadedBy?.username || "";
        const matchesSearch =
          doc.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          compName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      })
      .sort((a, b) => {
        const timeA = getDocTimestamp(a);
        const timeB = getDocTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || "").localeCompare(a.id || "");
      });
  }, [documents, searchQuery, filterType, filterStatus, user]);

  // Group documents by Company (most recent companies & items on top)
  const companyGroups = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        companyName: string;
        clientNumber?: string;
        clientId?: string;
        assignedPerson?: string;
        documents: DocumentItem[];
        total: number;
        active: number;
        expiringSoon: number;
        expired: number;
        latestCreatedAt: number;
      }
    >();

    filteredDocs.forEach((doc) => {
      const comp =
        doc.client?.companyName ||
        doc.assignedPerson ||
        doc.organisation?.companyName ||
        "General / Unassigned Company";

      const docTime = getDocTimestamp(doc);

      if (!groupsMap.has(comp)) {
        groupsMap.set(comp, {
          companyName: comp,
          clientNumber: doc.client?.clientNumber,
          clientId: doc.client?.id,
          assignedPerson: doc.client?.assignedPerson || doc.assignedPerson || undefined,
          documents: [],
          total: 0,
          active: 0,
          expiringSoon: 0,
          expired: 0,
          latestCreatedAt: docTime,
        });
      }

      const grp = groupsMap.get(comp)!;
      grp.documents.push(doc);
      grp.total++;
      if (docTime > grp.latestCreatedAt) {
        grp.latestCreatedAt = docTime;
      }

      if (doc.expiryDate) {
        const diff = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          grp.expired++;
        } else if (diff <= 7) {
          grp.expiringSoon++;
          grp.active++;
        } else {
          grp.active++;
        }
      } else {
        grp.active++;
      }
    });

    // Sort documents inside each company folder strictly by recent first (last added on top)
    groupsMap.forEach((grp) => {
      grp.documents.sort((a, b) => {
        const timeA = getDocTimestamp(a);
        const timeB = getDocTimestamp(b);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || "").localeCompare(a.id || "");
      });
    });

    // Sort company folders strictly by most recent document on top
    return Array.from(groupsMap.values()).sort((a, b) => b.latestCreatedAt - a.latestCreatedAt);
  }, [filteredDocs]);

  // Open Quick Add Modal for a company
  const handleOpenQuickAdd = (companyName: string, clientId?: string) => {
    setQuickAddCompany({ companyName, clientId });
    setQuickAddType("TRADE_LICENSE");
    setQuickAddName("");
    setQuickAddAuthority("");
    setQuickAddIssueDate("");
    setQuickAddExpiryDate("");
    setQuickAddFile(null);
  };

  const handleProceedUploadFromOffline = async () => {
    if (!offlineUploadPrompt) return;
    setIsGoingOnline(true);
    const success = await setAvailability(true);
    setIsGoingOnline(false);

    if (!success) {
      alert("Failed to switch status to Online. Please try again.");
      setOfflineUploadPrompt(null);
      return;
    }

    const { type, companyName, clientId } = offlineUploadPrompt;
    setOfflineUploadPrompt(null);

    if (type === "NEW_DOC") {
      onAddNewDocument();
    } else if (type === "QUICK_ADD" && companyName) {
      handleOpenQuickAdd(companyName, clientId);
    }
  };

  const handleAttemptAddNewDocument = () => {
    if (isStaffOffline) {
      setOfflineUploadPrompt({ type: "NEW_DOC" });
      return;
    }
    onAddNewDocument();
  };

  const handleAttemptOpenQuickAdd = (companyName: string, clientId?: string) => {
    if (isStaffOffline) {
      setOfflineUploadPrompt({ type: "QUICK_ADD", companyName, clientId });
      return;
    }
    handleOpenQuickAdd(companyName, clientId);
  };

  // Submit Quick Add to Company
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddCompany || !quickAddName.trim() || !quickAddFile) {
      alert("Please enter document name and upload a file.");
      return;
    }

    setIsQuickAdding(true);
    try {
      const payload = {
        organisationId: orgId || orgSubdomain || "default",
        clientId: quickAddCompany.clientId || undefined,
        companyName: quickAddCompany.companyName,
        clientName: quickAddCompany.companyName,
        assignedPerson: quickAddCompany.companyName,
        userId: user?.id,
        uploadedByName: user?.fullName || user?.username,
        uploadedByRole: user?.role,
        documentType: quickAddType,
        documentName: quickAddName.trim(),
        issuingAuthority: quickAddAuthority.trim() || undefined,
        issueDate: quickAddIssueDate || undefined,
        expiryDate: quickAddExpiryDate || undefined,
        status: "ACTIVE",
        documentUrl: quickAddFile.url,
      };

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDocuments((prev) => [json.data, ...prev]);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("org-document-created", {
              detail: { companyName: quickAddCompany.companyName, count: 1 },
            })
          );
        }
        setQuickAddCompany(null);
        // Ensure this company is expanded so user sees the new doc
        setExpandedCompanies((prev) => ({ ...prev, [quickAddCompany.companyName]: true }));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Failed to add document to company.");
      }
    } catch (err: any) {
      alert(err.message || "Network error. Please try again.");
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Open Edit Modal for a document
  const handleStartEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditDocName(doc.documentName || "");
    setEditDocType(doc.documentType || "TRADE_LICENSE");
    setEditDocAuthority(doc.issuingAuthority || "");

    const toDateInput = (val?: string | null) => {
      if (!val) return "";
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    setEditDocIssueDate(toDateInput(doc.issueDate));
    setEditDocExpiryDate(toDateInput(doc.expiryDate));
    setEditDocStatus(doc.status || "ACTIVE");
    setEditDocFile(null);
    setEditDocError(null);
  };

  // Submit Document Updates
  const handleUpdateDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    if (!editDocName.trim()) {
      setEditDocError("Document title is required.");
      return;
    }

    setIsUpdatingDoc(true);
    setEditDocError(null);

    try {
      const payload: any = {
        documentName: editDocName.trim(),
        documentType: editDocType,
        issuingAuthority: editDocAuthority.trim() || undefined,
        issueDate: editDocIssueDate || undefined,
        expiryDate: editDocExpiryDate || undefined,
        status: editDocStatus,
      };

      if (editDocFile?.url) {
        payload.documentUrl = editDocFile.url;
      }

      const queryOrg = orgId || orgSubdomain || "";
      const res = await fetch(`/api/documents/${editingDoc.id}?organisationId=${encodeURIComponent(queryOrg)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update document.");
      }

      const updated = json.data;
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d))
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("org-document-created", {
            detail: {
              companyName: editingDoc.client?.companyName || editingDoc.assignedPerson,
              count: 1,
            },
          })
        );
      }

      setEditingDoc(null);
    } catch (err: any) {
      setEditDocError(err.message || "Failed to save document changes.");
    } finally {
      setIsUpdatingDoc(false);
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* ── Top Header & Actions Bar ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Document Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage corporate licenses, tenancy contracts, visas, and certificates grouped by company or in all-documents list.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: All Documents (default) vs By Company */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "flat"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>All Documents ({filteredDocs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("company")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "company"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>By Company ({companyGroups.length})</span>
            </button>
          </div>

          {/* Add New Document button */}
          <button
            type="button"
            onClick={handleAttemptAddNewDocument}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Document</span>
          </button>
        </div>
      </div>

      {/* ── Offline Status Warning Banner for Staff ── */}
      {isStaffOffline && (
        <div className="mb-6 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>You are currently Offline (Off Duty)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  Staff Status
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                You must switch your status to Online to upload client documents to the Document Vault.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isGoingOnline}
            onClick={async () => {
              setIsGoingOnline(true);
              await setAvailability(true);
              setIsGoingOnline(false);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all shrink-0"
          >
            {isGoingOnline ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            <span>Go Online Now</span>
          </button>
        </div>
      )}

      {/* ── KPI Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Documents</span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{isLoading ? "—" : documents.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across {isLoading ? "—" : companyGroups.length} companies</p>
        </div>

        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Licenses</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{isLoading ? "—" : expiryCounts.active}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Fully compliant &amp; valid</p>
        </div>

        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expiring in 7 Days</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{isLoading ? "—" : expiryCounts.expiring7Days}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Urgent renewal required</p>
        </div>

        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expired Documents</span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{isLoading ? "—" : expiryCounts.expired}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Action overdue</p>
        </div>

        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Company Folders</span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{isLoading ? "—" : companyGroups.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Client accounts stored</p>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3 bg-white dark:bg-[#12141c] p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by document name, company, or authority..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Document Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Document Types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Expiry / Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">All Expiry Windows</option>
          <option value="EXPIRING_1_DAY">Expiring in 1 Day ({expiryCounts.expiring1Day})</option>
          <option value="EXPIRING_3_DAYS">Expiring in 3 Days ({expiryCounts.expiring3Days})</option>
          <option value="EXPIRING_7_DAYS">Expiring in 7 Days ({expiryCounts.expiring7Days})</option>
          <option value="EXPIRED">Expired ({expiryCounts.expired})</option>
          <option value="ACTIVE">Active &amp; Compliant</option>
        </select>

        {/* Reset button */}
        {(searchQuery || filterType !== "ALL" || filterStatus !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterType("ALL");
              setFilterStatus("ALL");
            }}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline px-2"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PERSPECTIVE 1: GROUPED BY COMPANY (COMPANY DOCUMENT FOLDERS)      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-16 text-center shadow-2xs">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading documents from database...</p>
        </div>
      ) : viewMode === "company" ? (
        <div className="space-y-4">
          {companyGroups.length === 0 ? (
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-12 text-center">
              <FolderOpen className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No companies found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery || filterType !== "ALL" || filterStatus !== "ALL"
                  ? "Try adjusting your search query or filters."
                  : "Add your first corporate document package under a company."}
              </p>
              <button
                type="button"
                onClick={handleAttemptAddNewDocument}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Documents</span>
              </button>
            </div>
          ) : (
            companyGroups.map((grp, idx) => {
              const isExpanded = expandedCompanies[grp.companyName] ?? (idx === 0);
              const initials = grp.companyName
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={grp.companyName}
                  className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Company Folder Header Bar */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                    <div
                      className="flex items-center gap-3.5 cursor-pointer select-none min-w-0"
                      onClick={() => toggleCompany(grp.companyName)}
                    >
                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-transform"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-xs shrink-0">
                        {initials || "C"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {grp.companyName}
                          </h3>
                          {grp.clientNumber && (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {grp.clientNumber}
                            </span>
                          )}
                        </div>
                        {grp.assignedPerson && grp.assignedPerson !== grp.companyName && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Contact: {grp.assignedPerson}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Pills & Quick "+ Add Document to this Company" button */}
                    <div className="flex items-center gap-2.5 ml-auto sm:ml-0 flex-wrap">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {grp.documents.length} Document{grp.documents.length !== 1 ? "s" : ""}
                      </span>

                      {grp.expiringSoon > 0 && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {grp.expiringSoon} Expiring Soon
                        </span>
                      )}

                      {grp.expired > 0 && (
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {grp.expired} Expired
                        </span>
                      )}

                      {/* "+ Add Document to Company" Action Button */}
                      <button
                        type="button"
                        onClick={() => handleAttemptOpenQuickAdd(grp.companyName, grp.clientId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-slate-950 dark:text-amber-400 font-bold text-xs border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
                        title={`Add another document to ${grp.companyName}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Document</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Company Documents Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/30 dark:bg-slate-900/20">
                            <th className="py-2.5 px-4 w-10 text-center">#</th>
                            <th className="py-2.5 px-4 min-w-[200px]">Document Title</th>
                            <th className="py-2.5 px-4 min-w-[160px]">Document Type</th>
                            <th className="py-2.5 px-4 min-w-[150px]">Issuing Authority</th>
                            <th className="py-2.5 px-4 min-w-[130px]">Added On</th>
                            <th className="py-2.5 px-4 min-w-[120px]">Issue Date</th>
                            <th className="py-2.5 px-4 min-w-[150px]">Expiry &amp; Validity</th>
                            <th className="py-2.5 px-4 min-w-[100px] text-center">Status</th>
                            <th className="py-2.5 px-4 min-w-[130px]">Added By</th>
                            <th className="py-2.5 px-4 w-28 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {grp.documents.map((doc, idx) => {
                            const typeMeta =
                              DOCUMENT_TYPES.find((t) => t.value === doc.documentType) ||
                              DOCUMENT_TYPES[0];

                            return (
                              <tr
                                key={doc.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                                  {idx + 1}
                                </td>

                                {/* Document Title */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                      {doc.documentName}
                                    </span>
                                  </div>
                                </td>

                                {/* Document Type */}
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${typeMeta.color}`}
                                  >
                                    {typeMeta.label}
                                  </span>
                                </td>

                                {/* Issuing Authority */}
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                  {doc.issuingAuthority || "—"}
                                </td>

                                {/* Added On */}
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                      {formatAddedDate(doc.createdAt)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                                    </span>
                                  </div>
                                </td>

                                {/* Issue Date */}
                                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                  {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "—"}
                                </td>

                                {/* Expiry & Validity */}
                                <td className="py-3 px-4">
                                  {getExpiryBadge(doc.expiryDate)}
                                </td>

                                {/* Status */}
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      doc.status === "ACTIVE"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200"
                                        : doc.status === "EXPIRING_SOON"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                  >
                                    {doc.status}
                                  </span>
                                </td>

                                {/* Added By */}
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                      <User className="h-3 w-3" />
                                    </div>
                                    <span
                                      className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[120px]"
                                      title={doc.uploadedBy?.fullName || doc.uploadedBy?.username || "Admin / Staff"}
                                    >
                                      {doc.uploadedBy?.fullName || doc.uploadedBy?.username || "Admin / Staff"}
                                    </span>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {doc.documentUrl && (
                                      <a
                                        href={doc.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="View / Download file"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(doc)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                      title="Edit document"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingDoc(doc)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                      title="Delete document"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : viewMode === "flat" ? (
        <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50 dark:bg-slate-900/40">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[200px]">Document Name</th>
                  <th className="py-3 px-4 min-w-[180px]">Company / Client</th>
                  <th className="py-3 px-4 min-w-[150px]">Document Type</th>
                  <th className="py-3 px-4 min-w-[150px]">Issuing Authority</th>
                  <th className="py-3 px-4 min-w-[130px]">Added On</th>
                  <th className="py-3 px-4 min-w-[140px]">Expiry &amp; Countdown</th>
                  <th className="py-3 px-4 min-w-[110px] text-center">Status</th>
                  <th className="py-3 px-4 min-w-[130px]">Added By</th>
                  <th className="py-3 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No documents found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc, idx) => {
                    const comp =
                      doc.client?.companyName ||
                      doc.assignedPerson ||
                      doc.organisation?.companyName ||
                      "—";
                    const typeMeta =
                      DOCUMENT_TYPES.find((t) => t.value === doc.documentType) || DOCUMENT_TYPES[0];

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Document Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {doc.documentName}
                            </span>
                          </div>
                        </td>

                        {/* Company / Client */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {comp}
                          </div>
                          {doc.client?.clientNumber && (
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              {doc.client.clientNumber}
                            </span>
                          )}
                        </td>

                        {/* Document Type */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${typeMeta.color}`}
                          >
                            {typeMeta.label}
                          </span>
                        </td>

                        {/* Issuing Authority */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {doc.issuingAuthority || "—"}
                        </td>

                        {/* Added On */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {formatAddedDate(doc.createdAt)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </td>

                        {/* Expiry */}
                        <td className="py-3 px-4">
                          {getExpiryBadge(doc.expiryDate)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              doc.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>

                        {/* Added By */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3" />
                            </div>
                            <span
                              className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[120px]"
                              title={doc.uploadedBy?.fullName || doc.uploadedBy?.username || "Admin / Staff"}
                            >
                              {doc.uploadedBy?.fullName || doc.uploadedBy?.username || "Admin / Staff"}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {doc.documentUrl && (
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View / Download file"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                              title="Edit document"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingDoc(doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* QUICK ADD DOCUMENT DIRECTLY UNDER A COMPANY MODAL                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {quickAddCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add Document to Company
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Directly attaching under <span className="font-bold text-amber-600 dark:text-amber-400">{quickAddCompany.companyName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddCompany(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={quickAddType}
                  onChange={(e) => {
                    setQuickAddType(e.target.value);
                    const label = DOCUMENT_TYPES.find((t) => t.value === e.target.value)?.label;
                    if (!quickAddName && label) {
                      setQuickAddName(label.replace(/\s+/g, "_"));
                    }
                  }}
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
                  Document Title / File Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="e.g. Trade_License_2026"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={quickAddAuthority}
                    onChange={(e) => setQuickAddAuthority(e.target.value)}
                    placeholder="e.g. DED Dubai / DLD"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={quickAddExpiryDate}
                    onChange={(e) => setQuickAddExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document File <span className="text-rose-500">*</span>
                </label>
                {quickAddFile ? (
                  <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {quickAddFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400">({quickAddFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickAddFile(null)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50">
                    <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Upload PDF or Image</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Max 5MB</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          alert("File exceeds maximum allowed size of 5 MB.");
                          return;
                        }
                        const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
                        const reader = new FileReader();
                        reader.onload = () => {
                          setQuickAddFile({
                            name: file.name,
                            size: fileSizeStr,
                            url: reader.result as string,
                          });
                          if (!quickAddName) {
                            setQuickAddName(file.name.replace(/\.[^/.]+$/, ""));
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickAddCompany(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuickAdding || !quickAddFile}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {isQuickAdding ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Save Document to {quickAddCompany.companyName}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* EDIT DOCUMENT MODAL                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Document
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Updating document under{" "}
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {editingDoc.client?.companyName || editingDoc.assignedPerson || editingDoc.organisation?.companyName || "Company"}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editDocError && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{editDocError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateDocumentSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editDocType}
                    onChange={(e) => setEditDocType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
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
                    Status
                  </label>
                  <select
                    value={editDocStatus}
                    onChange={(e) => setEditDocStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRING_SOON">Expiring Soon</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="RENEWAL_IN_PROGRESS">Renewal In Progress</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title / File Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  placeholder="e.g. Trade_License_2026"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Issuing Authority
                </label>
                <input
                  type="text"
                  value={editDocAuthority}
                  onChange={(e) => setEditDocAuthority(e.target.value)}
                  placeholder="e.g. DED Dubai / DLD / MOHRE"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={editDocIssueDate}
                    onChange={(e) => setEditDocIssueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={editDocExpiryDate}
                    onChange={(e) => setEditDocExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Current File Display */}
              {editingDoc.documentUrl && !editDocFile && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                      Current Attached File
                    </span>
                  </div>
                  <a
                    href={editingDoc.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                  >
                    <span>View File</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* File upload / replacement */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Replace File <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                {editDocFile ? (
                  <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {editDocFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400">({editDocFile.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditDocFile(null)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                    <UploadCloud className="h-5 w-5 text-slate-400 mb-1" />
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      Choose replacement file (PDF or Image)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Leave empty to keep existing file</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          alert("File exceeds maximum allowed size of 5 MB.");
                          return;
                        }
                        const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
                        const reader = new FileReader();
                        reader.onload = () => {
                          setEditDocFile({
                            name: file.name,
                            size: fileSizeStr,
                            url: reader.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingDoc}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                >
                  {isUpdatingDoc ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Edit className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDoc && (
        <ConfirmationModal
          isOpen={Boolean(deletingDoc)}
          title="Delete Document"
          subtitle={`Are you sure you want to permanently delete "${deletingDoc.documentName}"? This action cannot be undone.`}
          confirmText={isDeleting ? "Deleting..." : "Delete Document"}
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingDoc(null)}
        />
      )}

      {/* Staff Offline Upload Guard Modal */}
      {offlineUploadPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <WifiOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    You Are Currently Offline
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Staff Status: Off Duty
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOfflineUploadPrompt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Online Status Required to Upload Documents
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90 text-[11px] leading-relaxed">
                  You are currently marked as Offline (Off Duty). You must switch your status to Online to upload documents to the Document Vault.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOfflineUploadPrompt(null)}
                  disabled={isGoingOnline}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Stay Offline
                </button>

                <button
                  type="button"
                  disabled={isGoingOnline}
                  onClick={handleProceedUploadFromOffline}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isGoingOnline ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Switching to Online...</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 text-slate-950" />
                      <span>Go Online &amp; Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
