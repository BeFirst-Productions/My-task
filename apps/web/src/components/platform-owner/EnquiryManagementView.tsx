"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Inbox,
  Search,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  FileText,
  MapPin,
  Mail,
  Phone,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Clock,
  Sparkles,
  Check,
  Building2,
  FileCheck2,
} from "lucide-react";
import {
  fetchEnquiries,
  fetchEnquiryStats,
  submitEnquiry,
  updateEnquiry,
  deleteEnquiry,
  type EnquiryItem,
  type EnquiryStats,
  type EnquiryStatus,
} from "@/services/enquiry.service";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

const STATUS_CONFIG: Record<
  EnquiryStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "Pending Review",
    badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  CONTACTED: {
    label: "Contacted",
    badgeClass: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    dotClass: "bg-sky-400",
  },
  QUALIFIED: {
    label: "Qualified",
    badgeClass: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    dotClass: "bg-indigo-400",
  },
  CONVERTED: {
    label: "Converted",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  REJECTED: {
    label: "Rejected / Closed",
    badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    dotClass: "bg-rose-400",
  },
};

export function EnquiryManagementView() {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [stats, setStats] = useState<EnquiryStats>({
    total: 0,
    pending: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    rejected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryItem | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState<EnquiryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

  // New Enquiry Form State
  const [newForm, setNewForm] = useState({
    companyName: "",
    primaryLocation: "Dubai",
    subdomain: "",
    email: "",
    mobileNumber: "",
    subscriptionPlan: "GROWTH",
    notes: "",
    document: "",
    documentName: "",
    documentSize: "",
  });
  const [newFormErrors, setNewFormErrors] = useState<Record<string, string>>({});
  const [newFormSubmitting, setNewFormSubmitting] = useState(false);
  const [newFormDragging, setNewFormDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Enquiries & Stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        fetchEnquiries({
          search: searchTerm || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          primaryLocation: locationFilter !== "ALL" ? locationFilter : undefined,
          page: currentPage,
          limit: 15,
        }),
        fetchEnquiryStats(),
      ]);

      if (listRes.success && listRes.data) {
        setEnquiries(listRes.data.items);
        setTotalPages(listRes.data.totalPages);
        setTotalCount(listRes.data.total);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Failed to load enquiries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, statusFilter, locationFilter, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Quick Status Update
  const handleStatusChange = async (enquiryId: string, newStatus: EnquiryStatus) => {
    try {
      setStatusUpdateLoading(enquiryId);
      const res = await updateEnquiry(enquiryId, { status: newStatus });
      if (res.success && res.data) {
        setEnquiries((prev) =>
          prev.map((item) => (item.id === enquiryId ? res.data! : item))
        );
        if (selectedEnquiry && selectedEnquiry.id === enquiryId) {
          setSelectedEnquiry(res.data);
        }
        // Refresh stats
        const statsRes = await fetchEnquiryStats();
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to update enquiry status:", err);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  // Delete Enquiry
  const confirmDelete = async () => {
    if (!enquiryToDelete) return;
    try {
      setIsDeleting(true);
      await deleteEnquiry(enquiryToDelete.id);
      setDeleteModalOpen(false);
      setEnquiryToDelete(null);
      loadData();
    } catch (err) {
      console.error("Failed to delete enquiry:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Process File for New Enquiry
  const handleNewFileProcess = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setNewFormErrors((prev) => ({ ...prev, document: "File exceeds 10 MB limit." }));
      return;
    }
    const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    const reader = new FileReader();
    reader.onload = () => {
      setNewForm((prev) => ({
        ...prev,
        document: reader.result as string,
        documentName: file.name,
        documentSize: sizeStr,
      }));
      setNewFormErrors((prev) => {
        const copy = { ...prev };
        delete copy.document;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  // Create Enquiry Submit
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newForm.companyName.trim()) errors.companyName = "Company Name is required.";
    if (!newForm.subdomain.trim()) errors.subdomain = "Subdomain is required.";
    if (!newForm.email.trim()) errors.email = "Email is required.";
    if (!newForm.mobileNumber.trim()) errors.mobileNumber = "Mobile Number is required.";

    if (Object.keys(errors).length > 0) {
      setNewFormErrors(errors);
      return;
    }

    try {
      setNewFormSubmitting(true);
      const res = await submitEnquiry({
        companyName: newForm.companyName.trim(),
        primaryLocation: newForm.primaryLocation,
        subdomain: newForm.subdomain.trim().toLowerCase(),
        email: newForm.email.trim().toLowerCase(),
        mobileNumber: newForm.mobileNumber.trim(),
        subscriptionPlan: newForm.subscriptionPlan,
        notes: newForm.notes.trim() || undefined,
        document: newForm.document || undefined,
        documentName: newForm.documentName || undefined,
        documentSize: newForm.documentSize || undefined,
      });

      if (res.success) {
        setCreateModalOpen(false);
        setNewForm({
          companyName: "",
          primaryLocation: "Dubai",
          subdomain: "",
          email: "",
          mobileNumber: "",
          subscriptionPlan: "GROWTH",
          notes: "",
          document: "",
          documentName: "",
          documentSize: "",
        });
        loadData();
      }
    } catch (err: any) {
      setNewFormErrors({ form: err.message || "Failed to create enquiry." });
    } finally {
      setNewFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2029]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Business Enquiries
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {stats.pending} Pending Review
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Incoming business setup inquiries from the landing page. Documents are archived in{" "}
            <span className="text-amber-400 font-mono font-medium">Bunny Storage (enquiry-docs)</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-[#161822] border border-[#232733] text-slate-300 hover:text-white hover:bg-[#1e2029] transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 stroke-[2.5]" />
            <span>New Enquiry</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-[#181a24] border-amber-500/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20"
              : "bg-[#11131a] border-[#1e2029] hover:border-[#2a2e3d]"
          }`}
        >
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
        </div>

        {/* Pending */}
        <div
          onClick={() => setStatusFilter("PENDING")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "PENDING"
              ? "bg-[#181a24] border-amber-500/40 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20"
              : "bg-[#11131a] border-[#1e2029] hover:border-[#2a2e3d]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Pending</p>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</p>
        </div>

        {/* Contacted */}
        <div
          onClick={() => setStatusFilter("CONTACTED")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "CONTACTED"
              ? "bg-[#181a24] border-sky-500/40 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/20"
              : "bg-[#11131a] border-[#1e2029] hover:border-[#2a2e3d]"
          }`}
        >
          <p className="text-[11px] font-medium text-sky-400 uppercase tracking-wider">Contacted</p>
          <p className="text-2xl font-black text-sky-400 mt-1">{stats.contacted}</p>
        </div>

        {/* Qualified */}
        <div
          onClick={() => setStatusFilter("QUALIFIED")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "QUALIFIED"
              ? "bg-[#181a24] border-indigo-500/40 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20"
              : "bg-[#11131a] border-[#1e2029] hover:border-[#2a2e3d]"
          }`}
        >
          <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Qualified</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{stats.qualified}</p>
        </div>

        {/* Converted */}
        <div
          onClick={() => setStatusFilter("CONVERTED")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "CONVERTED"
              ? "bg-[#181a24] border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
              : "bg-[#11131a] border-[#1e2029] hover:border-[#2a2e3d]"
          }`}
        >
          <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Converted</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.converted}</p>
        </div>

        {/* Rejected */}
        <div
          onClick={() => setStatusFilter("REJECTED")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "REJECTED"
              ? "bg-[#181a24] border-rose-500/40 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/20"
              : "bg-[#11131a] border-[#1e2029] hover:border-[#2a2e3d]"
          }`}
        >
          <p className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Closed</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="p-4 rounded-xl bg-[#11131a] border border-[#1e2029] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by company, email, phone, or subdomain..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#161822] border border-[#232733] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Location / Emirate Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg bg-[#161822] border border-[#232733] px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="ALL">All Emirates</option>
              {EMIRATES.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg bg-[#161822] border border-[#232733] px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="CONVERTED">Converted</option>
              <option value="REJECTED">Closed / Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Enquiries Table ── */}
      <div className="rounded-xl border border-[#1e2029] bg-[#11131a] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs">Loading enquiries...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No Enquiries Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "ALL" || locationFilter !== "ALL"
                ? "Try adjusting your search criteria or filter options."
                : "No business setup inquiries have been submitted from the landing page yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e2029] bg-[#161822]/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Company & Subdomain</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Package</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4">Bunny Document</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2029]">
                {enquiries.map((enq) => {
                  const cfg = STATUS_CONFIG[enq.status] || STATUS_CONFIG.PENDING;
                  const isUpdating = statusUpdateLoading === enq.id;

                  return (
                    <tr
                      key={enq.id}
                      className="hover:bg-[#161822]/50 transition-colors group"
                    >
                      {/* Company Name & Subdomain */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{enq.companyName}</div>
                        <div className="text-[11px] font-mono text-amber-400/90 mt-0.5">
                          {enq.subdomain}.mytask.com
                        </div>
                      </td>

                      {/* Location / Emirate */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#1a1c26] border border-[#262936] text-[11px] font-medium text-slate-300">
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {enq.primaryLocation}
                        </span>
                      </td>

                      {/* Package */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            enq.subscriptionPlan === "PREMIUM"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                              : enq.subscriptionPlan === "GROWTH"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : "bg-slate-700/30 text-slate-300 border border-slate-600/30"
                          }`}
                        >
                          {enq.subscriptionPlan}
                        </span>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="h-3 w-3 text-slate-500" />
                          <a
                            href={`mailto:${enq.email}`}
                            className="hover:text-amber-400 transition-colors truncate max-w-[160px]"
                          >
                            {enq.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <a
                            href={`tel:${enq.mobileNumber}`}
                            className="hover:text-amber-400 transition-colors"
                          >
                            {enq.mobileNumber}
                          </a>
                        </div>
                      </td>

                      {/* Document in Bunny Storage */}
                      <td className="py-3.5 px-4">
                        {enq.documentUrl ? (
                          <div className="space-y-1">
                            <a
                              href={enq.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition-colors"
                              title="Stored in Bunny Storage: enquiry-docs"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[110px]">
                                {enq.documentName || "View Document"}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </a>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Folder: enquiry-docs
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            No document attached
                          </span>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-block">
                          <select
                            value={enq.status}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleStatusChange(enq.id, e.target.value as EnquiryStatus)
                            }
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border cursor-pointer focus:outline-none transition-colors ${cfg.badgeClass}`}
                          >
                            <option value="PENDING" className="bg-[#161822] text-amber-400">
                              Pending Review
                            </option>
                            <option value="CONTACTED" className="bg-[#161822] text-sky-400">
                              Contacted
                            </option>
                            <option value="QUALIFIED" className="bg-[#161822] text-indigo-400">
                              Qualified
                            </option>
                            <option value="CONVERTED" className="bg-[#161822] text-emerald-400">
                              Converted
                            </option>
                            <option value="REJECTED" className="bg-[#161822] text-rose-400">
                              Closed / Rejected
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(enq.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedEnquiry(enq);
                              setDetailsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2029] transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEnquiryToDelete(enq);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Enquiry"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-[#1e2029] bg-[#161822]/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {enquiries.length} of {totalCount} enquiries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md hover:bg-[#1e2029] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md hover:bg-[#1e2029] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal 1: Enquiry Full Details ── */}
      {detailsModalOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#11131a] border border-[#232733] w-full max-w-xl rounded-2xl p-6 shadow-2xl relative text-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2029]">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedEnquiry.companyName}
                </h3>
                <p className="text-xs font-mono text-amber-400">
                  {selectedEnquiry.subdomain}.mytask.com
                </p>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2029]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#161822] border border-[#232733]">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Location</p>
                <p className="text-sm font-bold text-white mt-0.5">{selectedEnquiry.primaryLocation}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#161822] border border-[#232733]">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Selected Package</p>
                <p className="text-sm font-bold text-blue-400 mt-0.5">{selectedEnquiry.subscriptionPlan}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#161822] border border-[#232733]">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Email Address</p>
                <a
                  href={`mailto:${selectedEnquiry.email}`}
                  className="text-sm font-semibold text-white hover:text-amber-400 mt-0.5 block truncate"
                >
                  {selectedEnquiry.email}
                </a>
              </div>
              <div className="p-3 rounded-lg bg-[#161822] border border-[#232733]">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Mobile Number</p>
                <a
                  href={`tel:${selectedEnquiry.mobileNumber}`}
                  className="text-sm font-semibold text-white hover:text-amber-400 mt-0.5 block font-mono"
                >
                  {selectedEnquiry.mobileNumber}
                </a>
              </div>
            </div>

            {/* Document Section */}
            <div className="p-3.5 rounded-xl bg-[#161822] border border-[#232733] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Attached Verification Document</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20">
                  Bunny: enquiry-docs
                </span>
              </div>
              {selectedEnquiry.documentUrl ? (
                <div className="flex items-center justify-between pt-2 border-t border-[#1e2029]">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        {selectedEnquiry.documentName || "Trade Licence / Document"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {selectedEnquiry.documentSize || "Ready for verification"}
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedEnquiry.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open in Bunny</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <p className="text-slate-500 italic pt-1">No document uploaded with this enquiry.</p>
              )}
            </div>

            {/* Notes Section */}
            {selectedEnquiry.notes && (
              <div className="p-3.5 rounded-xl bg-[#161822] border border-[#232733] text-xs space-y-1">
                <p className="font-semibold text-slate-300">Enquiry Notes / Details</p>
                <p className="text-slate-400 leading-relaxed">{selectedEnquiry.notes}</p>
              </div>
            )}

            {/* Status Change in Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1e2029]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Status:</span>
                <select
                  value={selectedEnquiry.status}
                  onChange={(e) =>
                    handleStatusChange(selectedEnquiry.id, e.target.value as EnquiryStatus)
                  }
                  className="rounded-lg bg-[#161822] border border-[#232733] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="PENDING">Pending Review</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="REJECTED">Closed / Rejected</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1e2029] hover:bg-[#262a38] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Create Enquiry Manually ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-[#11131a] border border-[#232733] w-full max-w-xl rounded-2xl p-6 shadow-2xl relative text-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2029]">
              <div>
                <h3 className="text-lg font-bold text-white">Create New Enquiry</h3>
                <p className="text-xs text-slate-400">
                  Manually record a business inquiry. Attached file will be uploaded to Bunny Storage in folder{" "}
                  <span className="text-amber-400 font-mono">enquiry-docs</span>.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e2029]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {newFormErrors.form && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                {newFormErrors.form}
              </div>
            )}

            <form onSubmit={handleCreateEnquiry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newForm.companyName}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    placeholder="e.g. Al Qusais Business Services"
                    className="w-full rounded-lg bg-[#161822] border border-[#232733] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  {newFormErrors.companyName && (
                    <p className="text-[11px] text-rose-400 mt-1">{newFormErrors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Location <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newForm.primaryLocation}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, primaryLocation: e.target.value }))
                    }
                    className="w-full rounded-lg bg-[#161822] border border-[#232733] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {EMIRATES.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Software Subdomain <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-[#232733] overflow-hidden focus-within:border-amber-500">
                    <input
                      type="text"
                      value={newForm.subdomain}
                      onChange={(e) =>
                        setNewForm((prev) => ({
                          ...prev,
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                      placeholder="alqusais"
                      className="w-full bg-[#161822] px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                    <span className="bg-[#1e2029] px-2.5 py-2 text-xs text-slate-400 font-mono select-none">
                      .mytask.com
                    </span>
                  </div>
                  {newFormErrors.subdomain && (
                    <p className="text-[11px] text-rose-400 mt-1">{newFormErrors.subdomain}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={newForm.subscriptionPlan}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, subscriptionPlan: e.target.value }))
                    }
                    className="w-full rounded-lg bg-[#161822] border border-[#232733] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="STARTER">Starter — AED 5,500</option>
                    <option value="GROWTH">Growth (Most Popular) — AED 9,999</option>
                    <option value="PREMIUM">Premium — AED 15,999</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newForm.email}
                    onChange={(e) => setNewForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                    className="w-full rounded-lg bg-[#161822] border border-[#232733] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  {newFormErrors.email && (
                    <p className="text-[11px] text-rose-400 mt-1">{newFormErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newForm.mobileNumber}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, mobileNumber: e.target.value }))
                    }
                    placeholder="0501234567"
                    className="w-full rounded-lg bg-[#161822] border border-[#232733] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  {newFormErrors.mobileNumber && (
                    <p className="text-[11px] text-rose-400 mt-1">{newFormErrors.mobileNumber}</p>
                  )}
                </div>
              </div>

              {/* Document Upload Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Document (Bunny Storage: enquiry-docs)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleNewFileProcess(f);
                  }}
                  className="hidden"
                />

                {newForm.document ? (
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-[#161822] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-white truncate max-w-[280px]">
                        {newForm.documentName} ({newForm.documentSize})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNewForm((prev) => ({
                          ...prev,
                          document: "",
                          documentName: "",
                          documentSize: "",
                        }))
                      }
                      className="p-1 rounded text-slate-400 hover:text-rose-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setNewFormDragging(true);
                    }}
                    onDragLeave={() => setNewFormDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setNewFormDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleNewFileProcess(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                      newFormDragging
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-[#232733] hover:border-amber-500/50 hover:bg-[#161822]"
                    }`}
                  >
                    <UploadCloud className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-300">
                      Click to upload or drag & drop document
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      PDF, JPG or PNG (max 10MB) • Stored at Bunny Storage folder: enquiry-docs
                    </p>
                  </div>
                )}
                {newFormErrors.document && (
                  <p className="text-[11px] text-rose-400 mt-1">{newFormErrors.document}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enquiry Notes / Requirements
                </label>
                <textarea
                  rows={2}
                  value={newForm.notes}
                  onChange={(e) => setNewForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional context or requirements..."
                  className="w-full rounded-lg bg-[#161822] border border-[#232733] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2029]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#1e2029] hover:bg-[#262a38] text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newFormSubmitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {newFormSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Enquiry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Delete Confirmation Modal ── */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Enquiry"
        subtitle={`Are you sure you want to delete the enquiry from "${enquiryToDelete?.companyName}"? This action cannot be undone.`}
        confirmText="Delete Enquiry"
        cancelText="Cancel"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}

