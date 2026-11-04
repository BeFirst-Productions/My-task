"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  Building2,
  Wallet,
  Receipt,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  User as UserIcon,
} from "lucide-react";
import {
  ClientData,
  fetchClients,
  generateClientProforma,
  updateClient,
  deleteClient,
  fetchSalesStaff,
  SalesStaffMember,
} from "@/services/client.service";
import { ProformaInvoiceData } from "@/services/proforma.service";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";

interface ClientListViewProps {
  orgId?: string;
  orgSubdomain?: string;
  userRole?: string;
  onAddNewClient: () => void;
  onSelectClient: (client: ClientData) => void;
}

export function ClientListView({
  orgId,
  orgSubdomain,
  userRole: userRoleProp,
  onAddNewClient,
  onSelectClient,
}: ClientListViewProps) {
  const { user } = useAuth();
  const effectiveRole = userRoleProp || user?.role;

  // Role-based permissions:
  // - SUPER_ADMIN & PLATFORM_OWNER: Entire unconstrained access (both Proforma and Client Actions)
  // - ADMIN: Full management access (both Proforma and Client Actions)
  // - ACCOUNTANT: Financial management (Proforma & Client Dashboard access for Wallet Top-Up and Convert to Work)
  // - SALES_STAFF: Intake & commercial quotes (Proforma generation/preview, but NO Client Dashboard)
  // - STAFF: Operational task execution only (neither proforma nor dashboard)
  const isSuperAdmin = effectiveRole === "SUPER_ADMIN" || effectiveRole === "PLATFORM_OWNER";
  const isAdmin = effectiveRole === "ADMIN";
  const isSalesStaff = effectiveRole === "SALES_STAFF";
  const isAccountant = effectiveRole === "ACCOUNTANT";

  // Dashboard & actions access check:
  // Super Admin, Platform Owner, Admin, and Accountant (Accounts Manager) have client dashboard access
  const canAccessDashboard = effectiveRole ? (isSuperAdmin || isAdmin || isAccountant) : true;
  const canEditClient = effectiveRole ? (isSuperAdmin || isAdmin) : true;
  const canDeleteClient = effectiveRole ? (isSuperAdmin || isAdmin) : true;

  // Proforma invoice management access:
  // Super Admin, Admin, Sales Staff, and Accountant can generate & view proforma invoices
  const canManageProforma = effectiveRole ? (isSuperAdmin || isAdmin || isSalesStaff || isAccountant) : true;

  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // 3-dots action dropdown state
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit client modal state
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [salesStaffList, setSalesStaffList] = useState<SalesStaffMember[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    companyName: "",
    contactPerson: "",
    phoneNumber: "",
    whatsappNumber: "",
    email: "",
    trnNumber: "",
    address: "",
    salesStaffId: "",
    status: "WORK_PENDING_PAYMENT",
  });

  // Delete client confirmation modal state
  const [deletingClient, setDeletingClient] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Selected Proforma for popup preview
  const [previewProformaId, setPreviewProformaId] = useState<string | null>(null);
  const [previewProformaData, setPreviewProformaData] = useState<ProformaInvoiceData | null>(null);
  const [generatingClientId, setGeneratingClientId] = useState<string | null>(null);

  // Auto-dismiss feedback notification after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`[data-dropdown-container="${activeDropdownId}"]`)) {
        setActiveDropdownId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdownId(null);
      }
    };

    if (activeDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdownId]);

  // Fetch sales staff for assignment dropdown
  useEffect(() => {
    fetchSalesStaff(orgId || orgSubdomain).then((staff) => {
      if (Array.isArray(staff)) setSalesStaffList(staff);
    });
  }, [orgId, orgSubdomain]);

  const handleGenerateProforma = async (clientId: string) => {
    setGeneratingClientId(clientId);
    try {
      const res = await generateClientProforma(clientId);
      if (res.success && res.data) {
        setClients((prev) =>
          prev.map((c) => {
            if (c.id === clientId) {
              return {
                ...c,
                proformaInvoices: [res.data, ...(c.proformaInvoices || [])],
              };
            }
            return c;
          })
        );
        // Open proforma modal preview immediately with full data
        setPreviewProformaId(res.data.id);
        setPreviewProformaData(res.data);
      } else {
        alert(res.message || "Failed to generate proforma invoice.");
      }
    } catch (err: any) {
      console.error("Failed to generate proforma invoice:", err);
      alert(err.message || "An unexpected error occurred while generating proforma invoice.");
    } finally {
      setGeneratingClientId(null);
    }
  };

  // Helper to determine if work has started for a client
  const isWorkStarted = useCallback((client: ClientData) => {
    if (client.status === "IN_PROGRESS" || client.status === "COMPLETED") {
      return true;
    }
    const hasWorkInProgressOrDone = client.services?.some(
      (s) => s.status === "ASSIGNED" || s.status === "IN_PROGRESS" || s.status === "COMPLETED"
    );
    return Boolean(hasWorkInProgressOrDone);
  }, []);

  const openEditModal = (client: ClientData) => {
    if (isWorkStarted(client)) {
      setFeedback({
        type: "error",
        message: "Client cannot be edited because work has already commenced or is completed.",
      });
      return;
    }
    setEditingClient(client);
    setEditModalError(null);
    setEditFormData({
      companyName: client.companyName || "",
      contactPerson: client.contactPerson || "",
      phoneNumber: client.phoneNumber || "",
      whatsappNumber: client.whatsappNumber || "",
      email: client.email || "",
      trnNumber: client.trnNumber || "",
      address: client.address || "",
      salesStaffId: client.salesStaffId || "",
      status: client.status || "WORK_PENDING_PAYMENT",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (!editFormData.companyName.trim()) {
      setEditModalError("Company Name is required.");
      return;
    }
    if (!editFormData.contactPerson.trim()) {
      setEditModalError("Contact Person name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditModalError(null);
    try {
      const res = await updateClient(editingClient.id, {
        companyName: editFormData.companyName.trim(),
        contactPerson: editFormData.contactPerson.trim(),
        phoneNumber: editFormData.phoneNumber.trim(),
        whatsappNumber: editFormData.whatsappNumber.trim(),
        email: editFormData.email.trim(),
        trnNumber: editFormData.trnNumber.trim(),
        address: editFormData.address.trim(),
        salesStaffId: editFormData.salesStaffId || null,
        status: editFormData.status,
      });

      if (res.success && res.data) {
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? { ...c, ...res.data } : c))
        );
        setEditingClient(null);
        setFeedback({
          type: "success",
          message: `Client "${editFormData.companyName.trim()}" details updated successfully.`,
        });
      } else {
        setEditModalError(res.message || "Failed to update client details.");
      }
    } catch (err: any) {
      console.error("Failed to update client:", err);
      setEditModalError(err.message || "An unexpected error occurred while updating.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    if (isWorkStarted(deletingClient)) {
      setDeleteError("Client cannot be deleted because work has already commenced or is completed.");
      return;
    }
    const clientName = deletingClient.companyName || "Client";
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteClient(deletingClient.id);
      if (res.success) {
        setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
        setDeletingClient(null);
        setFeedback({
          type: "success",
          message: `Client "${clientName}" has been permanently deleted.`,
        });
      } else {
        setDeleteError(res.message || "Failed to delete client.");
      }
    } catch (err: any) {
      console.error("Failed to delete client:", err);
      setDeleteError(err.message || "An unexpected error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchClients(orgId || orgSubdomain, searchQuery, statusFilter);
        if (mounted) setClients(data);
      } catch (err) {
        console.warn("Failed to load clients:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, searchQuery, statusFilter]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.clientNumber && c.clientNumber.toLowerCase().includes(q)) ||
        (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WORK_APPROVED":
        return {
          label: "Work Approved",
          classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          classes: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-900/50",
        };
      case "COMPLETED":
        return {
          label: "Completed",
          classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300",
        };
      case "WORK_PENDING_PAYMENT":
      default:
        return {
          label: "Pending Payment",
          classes: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
        };
    }
  };

  // Dynamic column count calculation for loading & empty states
  const totalColumns = 8 + (canManageProforma ? 1 : 0) + (canAccessDashboard ? 1 : 0);

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* 1. Header with Title & Action Button */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Client Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Directory of corporate clients, financial wallets, proforma invoicing, and service execution.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNewClient}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Client & Service Intake</span>
        </button>
      </div>

      {/* Feedback Toast Notification */}
      {feedback && (
        <div
          className={`mb-5 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Search & Status Filter Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#12141c] p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, contact, or CLI number..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          {["ALL", "WORK_PENDING_PAYMENT", "WORK_APPROVED", "IN_PROGRESS", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/60"
              }`}
            >
              {st === "ALL" ? "All Clients" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Clients Table */}
      <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#161924] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3.5 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[180px]">Company</th>
                <th className="py-3 px-4 min-w-[110px] text-center">Client ID</th>
                <th className="py-3 px-4 min-w-[160px]">Contact Person</th>
                <th className="py-3 px-4 min-w-[130px]">Sales Staff</th>
                <th className="py-3 px-4 min-w-[90px] text-center">Services</th>
                <th className="py-3 px-4 min-w-[130px] text-right">Wallet Balance</th>
                <th className="py-3 px-4 min-w-[120px] text-center">Status</th>
                {canManageProforma && (
                  <th className="py-3 px-4 min-w-[170px] text-center">Proforma Invoice</th>
                )}
                {canAccessDashboard && (
                  <th className={`py-3 px-4 ${isAccountant ? "min-w-[120px]" : "min-w-[80px]"} text-center`}>Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={totalColumns} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <p className="mt-2 text-xs">Loading clients directory...</p>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={totalColumns} className="py-16 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No clients found</p>
                    <p className="text-xs text-slate-400 mt-1">Start by onboarding a client with service package.</p>
                    <button
                      type="button"
                      onClick={onAddNewClient}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Onboard First Client</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => {
                  const statusInfo = getStatusBadge(client.status);
                  const walletBalance = Number(client.wallet?.balance || 0);
                  const latestProforma = client.proformaInvoices?.[0];
                  const workStarted = isWorkStarted(client);

                  return (
                    <tr
                      key={client.id}
                      onClick={() => {
                        if (canAccessDashboard) {
                          onSelectClient(client);
                        }
                      }}
                      className={`transition-colors ${
                        canAccessDashboard
                          ? "hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer group"
                          : "hover:bg-slate-50/40 dark:hover:bg-slate-800/20"
                      }`}
                    >
                      {/* # */}
                      <td className="py-3.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black text-xs shrink-0">
                            {client.companyName ? client.companyName[0].toUpperCase() : "C"}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white truncate block">
                            {client.companyName}
                          </span>
                        </div>
                      </td>

                      {/* Client ID */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg inline-block">
                          {client.clientNumber || "CLI-AUTO"}
                        </span>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{client.contactPerson}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>{client.phoneNumber}</span>
                          {client.whatsappNumber && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                              • WA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales Staff */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {client.salesStaff ? (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {client.salesStaff.fullName || client.salesStaff.username}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Services Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {client.services?.length || 0} Task(s)
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                            walletBalance > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <Wallet className="h-3 w-3" />
                          <span>AED {walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.classes}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Column: Proforma Invoice (Role-aware: Super Admin, Admin, Sales Staff, Accountant) */}
                      {canManageProforma && (
                        <td
                          className="py-3.5 px-4 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()} // Prevent row click
                        >
                          {latestProforma ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewProformaId(latestProforma.id);
                                setPreviewProformaData(null);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-slate-950 dark:text-amber-400 dark:hover:text-slate-950 font-bold text-[11px] border border-amber-500/30 transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap group/pf"
                              title="View & Download Proforma Invoice"
                            >
                              <Receipt className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover/pf:text-slate-950 transition-colors" />
                              <span className="whitespace-nowrap font-mono">{latestProforma.proformaNumber}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={generatingClientId === client.id}
                              onClick={() => handleGenerateProforma(client.id)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-[11px] shadow-sm shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              title="Generate official Proforma Invoice"
                            >
                              {generatingClientId === client.id ? (
                                <>
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent shrink-0" />
                                  <span className="whitespace-nowrap">Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                                  <span className="whitespace-nowrap">Generate Proforma</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      )}

                      {/* Column: Action (For Accountant: Direct Dashboard button; For Super Admin/Admin: 3-dots Menu) */}
                      {canAccessDashboard && (
                        <td
                          className="py-3.5 px-4 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()} // Prevent row click
                        >
                          {isAccountant ? (
                            <button
                              type="button"
                              onClick={() => onSelectClient(client)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-slate-950 dark:text-amber-400 dark:hover:text-slate-950 font-bold text-[11px] border border-amber-500/30 transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap group/dash"
                              title="Open Client Dashboard"
                            >
                              <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover/dash:text-slate-950 transition-colors" />
                              <span className="whitespace-nowrap font-bold">Dashboard &gt;</span>
                            </button>
                          ) : (
                            <div
                              className="relative inline-block text-left"
                              data-dropdown-container={client.id}
                            >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId((prev) => (prev === client.id ? null : client.id));
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                activeDropdownId === client.id
                                  ? "text-amber-500 bg-amber-500/10"
                                  : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-[#1b1f2e]"
                              }`}
                              title="Client actions"
                              aria-label="Client actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeDropdownId === client.id && (
                              <>
                                {/* Fixed transparent backdrop to capture clicks anywhere outside */}
                                <div
                                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                  }}
                                />

                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className={`absolute right-0 ${
                                    idx >= filteredClients.length - 1 && filteredClients.length > 2
                                      ? "bottom-full mb-1"
                                      : "top-full mt-1"
                                  } w-44 rounded-xl bg-white dark:bg-[#161822] border border-slate-200 dark:border-slate-800 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 text-left`}
                                >
                                  {/* 1. Dashboard - Always accessible */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      onSelectClient(client);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                  >
                                    <LayoutDashboard className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span>Dashboard</span>
                                  </button>

                                  {/* 2. Edit - Only before work starts (Admin / Super Admin) */}
                                  {canEditClient && (
                                    <button
                                      type="button"
                                      disabled={workStarted}
                                      onClick={() => {
                                        if (workStarted) return;
                                        setActiveDropdownId(null);
                                        openEditModal(client);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                                        workStarted
                                          ? "text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed opacity-50 select-none"
                                          : "text-slate-700 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                      }`}
                                      title={
                                        workStarted
                                          ? "Client details cannot be edited once work is in progress or completed"
                                          : "Edit client information"
                                      }
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <Edit2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        <span>Edit</span>
                                      </div>
                                      {workStarted && (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                          Locked
                                        </span>
                                      )}
                                    </button>
                                  )}

                                  {/* 3. Delete - Only before work starts (Admin / Super Admin) */}
                                  {canDeleteClient && (
                                    <>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <button
                                        type="button"
                                        disabled={workStarted}
                                        onClick={() => {
                                          if (workStarted) return;
                                          setActiveDropdownId(null);
                                          setDeleteError(null);
                                          setDeletingClient(client);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                                          workStarted
                                            ? "text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed opacity-50 select-none"
                                            : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                        }`}
                                        title={
                                          workStarted
                                            ? "Client cannot be deleted once work is in progress or completed"
                                            : "Permanently delete client"
                                        }
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                          <span>Delete</span>
                                        </div>
                                        {workStarted && (
                                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                            Locked
                                          </span>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="relative w-full max-w-xl bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 my-8 animate-in fade-in zoom-in-95 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Edit Client: {editingClient.companyName}
                    </h3>
                    <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                      {editingClient.clientNumber || "CLI-AUTO"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update corporate client information and assigned personnel.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              {/* Error message banner inside modal */}
              {editModalError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{editModalError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.companyName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, companyName: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.contactPerson}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, contactPerson: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phoneNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phoneNumber: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={editFormData.whatsappNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, whatsappNumber: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* TRN Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    TRN Number (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={editFormData.trnNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, trnNumber: e.target.value })
                    }
                    placeholder="e.g. 100-xxxx-xxxx"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Sales Staff & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sales Staff Assignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned Sales Staff
                  </label>
                  <select
                    value={editFormData.salesStaffId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, salesStaffId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {salesStaffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName || s.name || s.username} ({s.department || "Sales"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Client Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="WORK_PENDING_PAYMENT">Pending Payment</option>
                    <option value="WORK_APPROVED">Work Approved</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Business / Registered Address
                </label>
                <textarea
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, address: e.target.value })
                  }
                  placeholder="Office address, building, city, UAE"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {deletingClient && (
        <ConfirmationModal
          isOpen={!!deletingClient}
          onClose={() => {
            setDeletingClient(null);
            setDeleteError(null);
          }}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          title="Delete Corporate Client"
          subtitle="Are you sure you want to permanently delete this corporate client?"
          variant="danger"
          confirmText="Delete Client"
          cancelText="Cancel"
          isLoading={isDeleting}
          entityPreview={{
            avatarText: deletingClient.companyName ? deletingClient.companyName[0].toUpperCase() : "C",
            title: deletingClient.companyName || "Client",
            subtitle: `${deletingClient.clientNumber || "CLI-AUTO"} • ${deletingClient.contactPerson || "Contact"}`,
            badges: [
              { text: deletingClient.status || "ACTIVE", variant: "warning" },
            ],
          }}
          consequences={[
            {
              text: "All associated services, work order tasks and proforma invoices will be removed.",
              type: "danger",
            },
            {
              text: "Client wallet and transaction records will be permanently deleted.",
              type: "danger",
            },
          ]}
        />
      )}

      {/* Pop-up Proforma Invoice Preview Modal */}
      {previewProformaId && (
        <ProformaInvoiceModal
          isOpen={Boolean(previewProformaId)}
          proformaId={previewProformaId}
          initialData={previewProformaData}
          onClose={() => {
            setPreviewProformaId(null);
            setPreviewProformaData(null);
          }}
        />
      )}
    </div>
  );
}
