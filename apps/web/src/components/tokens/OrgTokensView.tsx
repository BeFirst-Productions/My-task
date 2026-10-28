"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
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
  Sparkles,
} from "lucide-react";
import {
  SupportToken,
  TokenCategory,
  TokenStatus,
  fetchOrgTokens,
} from "@/services/token.service";
import { RaiseTokenModal } from "./RaiseTokenModal";
import { TokenDetailModal } from "./TokenDetailModal";

interface OrgTokensViewProps {
  orgSubdomain: string;
  orgName: string;
  onNavigateToSettings?: () => void;
}

export function OrgTokensView({
  orgSubdomain,
  orgName,
  onNavigateToSettings,
}: OrgTokensViewProps) {
  const [tokens, setTokens] = useState<SupportToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const loadTokens = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchOrgTokens(orgSubdomain, {
        status: statusFilter,
        category: categoryFilter,
      });
      setTokens(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, [orgSubdomain, statusFilter, categoryFilter]);

  const filteredTokens = tokens.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.tokenNumber.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Support Center
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Raise domain changes, technical tickets, and communicate directly with the Platform Owner.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadTokens}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setRaiseModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Raise New Token</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#1a1d28] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "OPEN", "IN_REVIEW", "APPROVED", "RESOLVED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-slate-100 dark:bg-[#161822] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {status === "ALL" ? "All Tokens" : status.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token # or subject..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Token List */}
      {loading && tokens.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Loading your organisation's tokens...</span>
          </div>
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-[#151722] border border-slate-200 dark:border-[#222636] flex items-center justify-center mx-auto text-slate-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Tokens Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "No tokens matched your search query."
              : "No support or domain change requests have been raised yet."}
          </p>
          <button
            type="button"
            onClick={() => setRaiseModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Raise First Token</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredTokens.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTokenId(t.id)}
              className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#151722] border border-slate-200 dark:border-slate-800 shrink-0">
                  {getCategoryIcon(t.category)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-500">
                      {t.tokenNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {t.subject}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {t.description}
                  </p>

                  {t.category === "DOMAIN_CHANGE" && t.requestedDomain && (
                    <div className="text-[11px] font-mono text-blue-500 flex items-center gap-1.5 pt-0.5">
                      <span>Transition to:</span>
                      <span className="font-bold underline">{t.requestedDomain}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:self-center">
                <div className="text-right text-[11px] text-slate-400">
                  <div>{new Date(t.createdAt).toLocaleDateString()}</div>
                  <div className="text-[10px] text-slate-500">
                    {t.messages?.length || 1} {t.messages?.length === 1 ? "message" : "messages"}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#151722] text-slate-400 group-hover:text-amber-500 border border-slate-200 dark:border-slate-800">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise Modal */}
      <RaiseTokenModal
        isOpen={raiseModalOpen}
        onClose={() => setRaiseModalOpen(false)}
        orgSubdomain={orgSubdomain}
        orgName={orgName}
        onTokenCreated={() => loadTokens()}
      />

      {/* Detail & Chat Modal */}
      {selectedTokenId && (
        <TokenDetailModal
          isOpen={Boolean(selectedTokenId)}
          onClose={() => setSelectedTokenId(null)}
          tokenId={selectedTokenId}
          isPlatformOwner={false}
          onStatusChanged={() => loadTokens()}
        />
      )}
    </div>
  );
}
