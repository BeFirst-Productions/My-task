"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Globe,
  Wrench,
  CreditCard,
  Lightbulb,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Shield,
  Building2,
  Unlock,
  Sparkles,
} from "lucide-react";
import {
  SupportToken,
  TokenCategory,
  TokenStatus,
  fetchPlatformTokens,
  updateTokenStatus,
} from "@/services/token.service";
import { TokenDetailModal } from "../tokens/TokenDetailModal";

export function PlatformTokensView() {
  const [tokens, setTokens] = useState<SupportToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);

  const loadTokens = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchPlatformTokens({
        status: statusFilter,
        category: categoryFilter,
      });
      setTokens(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load platform tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [statusFilter, categoryFilter]);

  const filteredTokens = tokens.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.tokenNumber.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.organisation?.companyName || "").toLowerCase().includes(q) ||
      (t.organisation?.subdomain || "").toLowerCase().includes(q)
    );
  });

  // Summary Metrics
  const totalCount = tokens.length;
  const pendingDomainCount = tokens.filter(
    (t) => t.category === "DOMAIN_CHANGE" && (t.status === "OPEN" || t.status === "IN_REVIEW")
  ).length;
  const openCount = tokens.filter((t) => t.status === "OPEN" || t.status === "IN_REVIEW").length;
  const approvedCount = tokens.filter((t) => t.status === "APPROVED" || t.status === "RESOLVED").length;

  const handleQuickApproveDomain = async (token: SupportToken, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickApprovingId(token.id);
    try {
      await updateTokenStatus(
        token.id,
        "APPROVED",
        "Domain change approved by Platform Owner directly.",
        true
      );
      await loadTokens();
    } catch (err: any) {
      alert(err.message || "Failed to approve domain change");
    } finally {
      setQuickApprovingId(null);
    }
  };

  const getCategoryIcon = (cat: TokenCategory) => {
    switch (cat) {
      case "DOMAIN_CHANGE":
        return <Globe className="h-4 w-4 text-blue-500" />;
      case "TECHNICAL_SUPPORT":
        return <Wrench className="h-4 w-4 text-rose-500" />;
      case "BILLING_PLAN":
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case "FEATURE_REQUEST":
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getStatusBadge = (status: TokenStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
      case "RESOLVED":
        return "bg-cyan-500/15 text-cyan-500 border-cyan-500/30";
      case "IN_REVIEW":
        return "bg-indigo-500/15 text-indigo-500 border-indigo-500/30";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-500 border-rose-500/30";
      case "CLOSED":
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
      case "OPEN":
      default:
        return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return "bg-red-600 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-500";
      case "LOW":
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-[#1e2330] bg-[#10121a] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Support Center
              </h1>
              <p className="text-xs text-slate-400">
                Bidirectional ticket communication, issue tracking, and domain change approvals across all tenant organisations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadTokens}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-800 bg-[#151722] text-slate-300 hover:text-amber-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-[#1c1f2d]">
          <div className="p-3.5 rounded-2xl bg-[#141724] border border-[#222638]">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Requests</span>
            <span className="text-xl font-black text-white mt-1 block">{totalCount}</span>
          </div>

          <div
            onClick={() => {
              setCategoryFilter("DOMAIN_CHANGE");
              setStatusFilter("OPEN");
            }}
            className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/15 transition-all"
          >
            <span className="text-[11px] font-semibold text-blue-400 block">Pending Domain Changes</span>
            <span className="text-xl font-black text-blue-400 mt-1 block">{pendingDomainCount}</span>
          </div>

          <div
            onClick={() => setStatusFilter("OPEN")}
            className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition-all"
          >
            <span className="text-[11px] font-semibold text-amber-400 block">Open / In Review</span>
            <span className="text-xl font-black text-amber-400 mt-1 block">{openCount}</span>
          </div>

          <div
            onClick={() => setStatusFilter("APPROVED")}
            className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/15 transition-all"
          >
            <span className="text-[11px] font-semibold text-emerald-400 block">Approved / Resolved</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">{approvedCount}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 pt-5 border-t border-[#1c1f2d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "OPEN", "IN_REVIEW", "APPROVED", "REJECTED", "RESOLVED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-[#161822] text-slate-400 hover:text-white"
                }`}
              >
                {status === "ALL" ? "All Statuses" : status.replace("_", " ")}
              </button>
            ))}

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#161822] border border-slate-800 text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">All Categories</option>
              <option value="DOMAIN_CHANGE">Domain Change</option>
              <option value="TECHNICAL_SUPPORT">Technical Support</option>
              <option value="BILLING_PLAN">Billing & Plan</option>
              <option value="FEATURE_REQUEST">Feature Request</option>
              <option value="CUSTOM">Custom / Other</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organisation or token #..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-800 bg-[#151722] text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Error msg */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tokens List */}
      {loading && tokens.length === 0 ? (
        <div className="rounded-3xl border border-[#1e2330] bg-[#10121a] p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Loading platform tokens...</span>
          </div>
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="rounded-3xl border border-[#1e2330] bg-[#10121a] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-[#151722] border border-[#222636] flex items-center justify-center mx-auto text-slate-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Tokens Match Criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All tickets and domain change requests across organizations will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredTokens.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTokenId(t.id)}
              className="p-5 rounded-2xl border border-[#1e2330] bg-[#10121a] hover:border-amber-500/50 hover:shadow-lg transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Org Logo / Avatar */}
                <div className="h-11 w-11 rounded-xl bg-[#151724] border border-[#242838] flex items-center justify-center shrink-0 overflow-hidden">
                  {t.organisation?.logo ? (
                    <img src={t.organisation.logo} alt="" className="max-h-full max-w-full object-contain p-1" />
                  ) : (
                    <Building2 className="h-5 w-5 text-amber-500" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-500">
                      {t.tokenNumber}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {t.subject}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {t.organisation?.companyName || "Unknown Org"}
                    </span>
                    <span className="text-[10px] font-mono text-amber-500/80 bg-amber-500/10 px-1.5 py-0.2 rounded">
                      {t.organisation?.subdomain}
                    </span>
                    <span>•</span>
                    <span className="line-clamp-1">{t.description}</span>
                  </div>

                  {/* Domain Change Request Pill */}
                  {t.category === "DOMAIN_CHANGE" && t.requestedDomain && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-blue-400 font-mono flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        {t.currentDomain || `${t.organisation?.subdomain}.mytask.com`}
                        <ArrowRight className="h-3 w-3 text-amber-500" />
                        <span className="font-bold underline text-amber-400">{t.requestedDomain}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                {/* Quick Approve Domain Button */}
                {t.category === "DOMAIN_CHANGE" && t.status !== "APPROVED" && t.status !== "RESOLVED" && (
                  <button
                    type="button"
                    disabled={quickApprovingId === t.id}
                    onClick={(e) => handleQuickApproveDomain(t, e)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {quickApprovingId === t.id ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    <span>Quick Approve</span>
                  </button>
                )}

                <div className="text-right text-[11px] text-slate-400">
                  <div>{new Date(t.createdAt).toLocaleDateString()}</div>
                  <div className="text-[10px] text-slate-500">
                    {t.messages?.length || 1} messages
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#151722] text-slate-400 hover:text-amber-500 border border-slate-800 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail and Chat Modal */}
      {selectedTokenId && (
        <TokenDetailModal
          isOpen={Boolean(selectedTokenId)}
          onClose={() => setSelectedTokenId(null)}
          tokenId={selectedTokenId}
          isPlatformOwner={true}
          onStatusChanged={() => loadTokens()}
        />
      )}
    </div>
  );
}
