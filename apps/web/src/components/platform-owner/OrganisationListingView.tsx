"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Database,
  Search,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Users,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface OrganisationListingViewProps {
  onCreateClick: () => void;
}

export function OrganisationListingView({
  onCreateClick,
}: OrganisationListingViewProps) {
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      let url = "http://localhost:4000/api/organisations?limit=50";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await fetch(url);
      const data = await res.json();
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
            Overview of tenant companies, dedicated PostgreSQL databases, and super admins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrganisations}
            className="p-2 rounded-lg bg-[#151720] border border-[#232733] text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#12141a] p-3 rounded-xl border border-[#1f232e]">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company, licence, or database..."
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
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Organisations Table */}
      <div className="bg-[#12141a] rounded-xl border border-[#1f232e] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#161822] text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-[#1f232e]">
              <tr>
                <th className="px-5 py-3.5">Organisation Name</th>
                <th className="px-5 py-3.5">Dedicated Tenant DB</th>
                <th className="px-5 py-3.5">Trade Licence</th>
                <th className="px-5 py-3.5">Issuing Authority</th>
                <th className="px-5 py-3.5">Super Admin</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f232e]/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading registered organisations...
                  </td>
                </tr>
              ) : organisations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No organisations found. Click &quot;Create Organisation&quot; to add one.
                  </td>
                </tr>
              ) : (
                organisations.map((org) => (
                  <tr key={org.id} className="hover:bg-[#161822]/60 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{org.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {org.companyType}
                      </div>
                    </td>

                    {/* Dedicated Database */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181a24] border border-[#2b3040] text-amber-400 font-mono text-[11px] font-semibold">
                        <Database className="h-3 w-3 text-amber-500" />
                        <span>{org.databaseName || "tenant_default"}</span>
                      </div>
                    </td>

                    {/* Licence */}
                    <td className="px-5 py-4">
                      <div className="text-slate-300 font-medium">
                        {org.tradeLicenceNumber || "—"}
                      </div>
                      {org.tradeLicenceDocument && (
                        <a
                          href={org.tradeLicenceDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 underline font-mono mt-0.5"
                          title="Open document in Bunny CDN"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Doc</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </td>

                    {/* Authority */}
                    <td className="px-5 py-4">
                      <span className="text-slate-400">
                        {org.issuingAuthority || "—"}
                      </span>
                    </td>

                    {/* Super Admin */}
                    <td className="px-5 py-4">
                      {org.superAdmin ? (
                        <div>
                          <div className="font-medium text-slate-200">
                            {org.superAdmin.fullName}
                          </div>
                          <div className="text-[10px] text-sky-400 font-mono">
                            @{org.superAdmin.username}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          org.status === "ACTIVE"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : org.status === "PENDING"
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 cursor-pointer transition-colors">
                        <span>Manage</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
