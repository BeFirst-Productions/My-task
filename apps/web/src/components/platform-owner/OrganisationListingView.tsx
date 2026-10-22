"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Search,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  FileText,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  Trash2,
  Edit3,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Upload,
} from "lucide-react";
import {
  getOrganisations,
  deleteOrganisation,
  updateOrganisationStatus,
  type OrganisationListItem,
} from "@/services/organization.service";
import { EditOrganisationView } from "./EditOrganisationView";

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

interface OrganisationListingViewProps {
  onCreateClick: () => void;
}

export function OrganisationListingView({
  onCreateClick,
}: OrganisationListingViewProps) {
  const [organisations, setOrganisations] = useState<OrganisationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Edit State
  const [editingOrg, setEditingOrg] = useState<OrganisationListItem | null>(null);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrganisations({
        limit: 50,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      if (data.success && data.data) {
        setOrganisations(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch organisations:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrganisations();
  };

  // Toggle Organisation Status (ACTIVE <-> INACTIVE)
  const handleToggleStatus = async (org: OrganisationListItem) => {
    const nextStatus = org.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const previousStatus = org.status;

    // Optimistic update
    setOrganisations((prev) =>
      prev.map((item) => (item.id === org.id ? { ...item, status: nextStatus } : item))
    );
    setTogglingId(org.id);

    try {
      await updateOrganisationStatus(org.id, nextStatus);
      setFeedbackMessage({
        type: "success",
        text: `Status for "${org.companyName || org.name}" updated to ${nextStatus}.`,
      });
    } catch (err) {
      // Rollback on error
      setOrganisations((prev) =>
        prev.map((item) => (item.id === org.id ? { ...item, status: previousStatus } : item))
      );
      const msg = err instanceof Error ? err.message : "Failed to update status";
      setFeedbackMessage({ type: "error", text: msg });
    } finally {
      setTogglingId(null);
    }
  };

  // Edit Organisation
  const openEditModal = (org: OrganisationListItem) => {
    setEditingOrg(org);
  };

  const handleDelete = async (org: OrganisationListItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete organisation "${org.companyName || org.name}"?\n\nThis will permanently drop its dedicated database and wipe all associated tenant data.`
    );
    if (!confirmed) return;

    setDeletingId(org.id);
    setFeedbackMessage(null);
    try {
      const result = await deleteOrganisation(org.id);
      setFeedbackMessage({
        type: "success",
        text: result.message || `Organisation "${org.companyName}" deleted successfully.`,
      });
      setOrganisations((prev) => prev.filter((o) => o.id !== org.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete organisation";
      setFeedbackMessage({ type: "error", text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  if (editingOrg) {
    return (
      <EditOrganisationView
        organisation={editingOrg}
        onBack={() => setEditingOrg(null)}
        onSuccess={() => {
          const orgName = editingOrg.companyName || editingOrg.name;
          setEditingOrg(null);
          fetchOrganisations();
          setFeedbackMessage({
            type: "success",
            text: `Organisation "${orgName}" updated successfully.`,
          });
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-[1750px] mx-auto pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f232e] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Registered Organisations</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {organisations.length} Total
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage tenant organisations, verification documents, super admin credentials, and live account statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrganisations}
            disabled={loading}
            className="p-2 rounded-lg bg-[#151720] border border-[#232733] text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <button
            onClick={onCreateClick}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:brightness-110 transition-all flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Organisation</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
            feedbackMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="underline hover:text-white font-medium ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#12141a] p-3 rounded-xl border border-[#1f232e]">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company name, subdomain, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181a24] border border-[#262a38] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#181a24] border border-[#262a38] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Organisations Table */}
      <div className="bg-[#12141a] rounded-xl border border-[#1f232e] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#161822] text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-[#1f232e]">
              <tr>
                <th className="px-5 py-3.5">Organisation &amp; Subdomain</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Verification Document</th>
                <th className="px-4 py-3.5">Super Admin</th>
                <th className="px-4 py-3.5">Notifications</th>
                <th className="px-4 py-3.5">Status (Toggle)</th>
                <th className="px-4 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f232e]/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading registered organisations...</span>
                  </td>
                </tr>
              ) : organisations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Building2 className="h-8 w-8 mx-auto text-slate-600 mb-1" />
                      <p className="text-slate-300 font-semibold text-sm">No organisations found</p>
                      <p className="text-xs text-slate-500">
                        {search || statusFilter
                          ? "Try adjusting your search query or filter."
                          : "Get started by creating your first organisation."}
                      </p>
                      <button
                        onClick={onCreateClick}
                        className="mt-3 px-4 py-1.5 rounded-lg bg-[#800020] hover:bg-[#991b1b] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Create Organisation</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                organisations.map((org) => {
                  const resolvedName = org.companyName || org.name || "Unnamed Organisation";
                  const isDeleting = deletingId === org.id;
                  const isToggling = togglingId === org.id;
                  const isActive = org.status === "ACTIVE";

                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-[#161822]/70 transition-colors group"
                    >
                      {/* Organisation Name & Subdomain */}
                      <td className="px-5 py-4 min-w-[240px]">
                        <div className="flex items-center gap-3">
                          {org.logo ? (
                            <img
                              src={org.logo}
                              alt={resolvedName}
                              className="h-10 w-10 rounded-xl object-contain bg-[#161924] border border-[#282d3e] p-1 shrink-0 shadow-inner"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-[#800020]/25 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                              {resolvedName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-bold text-white text-sm block truncate group-hover:text-amber-400 transition-colors"
                              title={resolvedName}
                            >
                              {resolvedName}
                            </span>
                            <a
                              href={`http://${org.subdomain}.localhost:3000`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:text-sky-300 hover:underline truncate mt-0.5"
                              title={`${org.subdomain}.mytask.com`}
                            >
                              <Globe className="h-3 w-3 shrink-0 text-slate-500" />
                              <span>{org.subdomain}.mytask.com</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Primary Location */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                          <span>{org.primaryLocation || "—"}</span>
                        </div>
                      </td>

                      {/* Verification Document */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {org.document || org.tradeLicenceDocument ? (
                          <a
                            href={(org.document || org.tradeLicenceDocument) as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                            title="Open verification document in Bunny CDN"
                          >
                            <FileText className="h-3.5 w-3.5 text-amber-400" />
                            <span>View PDF</span>
                            <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs italic">No document</span>
                        )}
                      </td>

                      {/* Super Admin */}
                      <td className="px-4 py-4 min-w-[220px]">
                        {org.superAdmin ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-100 text-xs flex items-center gap-1.5">
                              <span>{org.superAdmin.fullName || org.superAdmin.username}</span>
                              <span className="text-[10px] font-mono text-sky-400">
                                @{org.superAdmin.username}
                              </span>
                            </div>
                            <div
                              className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]"
                              title={org.superAdmin.email}
                            >
                              <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate">{org.superAdmin.email}</span>
                            </div>
                            {org.superAdmin.phoneNumber && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                                <span>{org.superAdmin.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">No admin configured</span>
                        )}
                      </td>

                      {/* Notifications */}
                      <td className="px-4 py-4 min-w-[190px]">
                        {org.notificationConfig ? (
                          <div className="space-y-0.5">
                            {org.notificationConfig.primaryWhatsAppNumber && (
                              <div
                                className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono font-medium"
                                title="Primary WhatsApp"
                              >
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span>{org.notificationConfig.primaryWhatsAppNumber}</span>
                              </div>
                            )}
                            {org.notificationConfig.notificationEmail && (
                              <div
                                className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[180px]"
                                title={`Notification email: ${org.notificationConfig.notificationEmail}`}
                              >
                                <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate">{org.notificationConfig.notificationEmail}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            role="switch"
                            id={`toggle-status-btn-${org.id}`}
                            data-testid="status-toggle-button"
                            aria-checked={isActive}
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(org)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 ${
                              isActive ? "bg-emerald-500" : "bg-[#282d3e]"
                            }`}
                            title={`Click to set status to ${isActive ? "INACTIVE" : "ACTIVE"}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                isActive ? "translate-x-5" : "translate-x-0"
                              }`}
                            >
                              {isToggling && (
                                <Loader2 className="h-3 w-3 text-slate-700 animate-spin" />
                              )}
                            </span>
                          </button>
                          <span
                            className={`text-[11px] font-bold ${
                              isActive ? "text-emerald-400" : "text-slate-400"
                            }`}
                          >
                            {org.status}
                          </span>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                        {org.createdAt
                          ? new Date(org.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {/* Edit Button */}
                          <button
                            type="button"
                            id={`edit-org-btn-${org.id}`}
                            data-testid="edit-organisation-button"
                            onClick={() => openEditModal(org)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#32394d] bg-[#1a1e2c] hover:bg-[#252b3e] text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm"
                            title="Edit organisation details"
                          >
                            <Edit3 className="h-3 w-3 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(org)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all disabled:opacity-50"
                            title="Delete organisation and drop dedicated database"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            <span>Delete</span>
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
    </div>
  );
}
