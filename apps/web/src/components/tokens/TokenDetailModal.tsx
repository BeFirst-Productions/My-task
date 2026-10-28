"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Globe,
  Clock,
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  Check,
} from "lucide-react";
import {
  SupportToken,
  TokenStatus,
  fetchTokenDetails,
  updateTokenStatus,
  sendTokenMessage,
} from "@/services/token.service";

interface TokenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
  isPlatformOwner?: boolean;
  onStatusChanged?: () => void;
}

export function TokenDetailModal({
  isOpen,
  onClose,
  tokenId,
  isPlatformOwner = false,
  onStatusChanged,
}: TokenDetailModalProps) {
  const [token, setToken] = useState<SupportToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reply message
  const [replyText, setReplyText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDetails = async () => {
    if (!tokenId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchTokenDetails(tokenId);
      setToken(data);
      if (data.resolutionNotes) {
        setResolutionNote(data.resolutionNotes);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load token details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tokenId) {
      loadDetails();
      const interval = setInterval(loadDetails, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, tokenId]);

  useEffect(() => {
    if (token?.messages && token.messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [token?.messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingMsg || !token) return;

    setSendingMsg(true);
    try {
      const newMsg = await sendTokenMessage(token.id, replyText.trim());
      setToken((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), newMsg],
            }
          : null
      );
      setReplyText("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send message");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TokenStatus, approveDomain = false) => {
    if (!token || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const updated = await updateTokenStatus(
        token.id,
        newStatus,
        resolutionNote.trim() || undefined,
        approveDomain
      );
      setToken(updated);
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update token status");
    } finally {
      setStatusUpdating(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-[#222636] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[850px]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1c1f2d] bg-slate-50/80 dark:bg-[#12141f] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              {token?.category === "DOMAIN_CHANGE" ? (
                <Globe className="h-5 w-5" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-500 px-2 py-0.5 rounded-md bg-amber-500/10">
                  {token?.tokenNumber || "Token"}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {token?.subject || "Loading request..."}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <Building2 className="h-3 w-3" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {token?.organisation?.companyName || "Organisation"}
                </span>
                <span>•</span>
                <span>Raised {token ? new Date(token.createdAt).toLocaleDateString() : ""}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {token && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(token.status)}`}>
                {token.status}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181a26] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && !token ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
              <span className="text-xs text-slate-400">Loading conversation thread...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Domain Change Banner / Action Panel */}
            {token?.category === "DOMAIN_CHANGE" && (
              <div className="p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-amber-500/5 border-b border-blue-500/20 shrink-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Requested Website Domain Prefix
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Postfix: .mytask.com
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white/70 dark:bg-[#131622] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Current Domain</span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-slate-400" />
                      {token.currentDomain || `${token.organisation?.subdomain}.mytask.com`}
                    </span>
                  </div>

                  <ArrowRight className="h-4 w-4 text-amber-500 shrink-0" />

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Requested Domain</span>
                    <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-amber-500" />
                      {token.requestedDomain || "Not specified"}
                    </span>
                  </div>

                  {/* If Platform Owner: Approval Action */}
                  {isPlatformOwner && token.status !== "APPROVED" && token.status !== "RESOLVED" && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => handleUpdateStatus("APPROVED", true)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Approve & Unlock Domain</span>
                      </button>
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => handleUpdateStatus("REJECTED")}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {token.status === "APPROVED" && (
                    <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Domain Edit Unlocked for SuperAdmin</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Platform Owner Status Management Strip */}
            {isPlatformOwner && token && (
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#11131c] border-b border-slate-100 dark:border-[#1a1d28] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Platform Action:
                  </span>
                  <select
                    value={token.status}
                    disabled={statusUpdating}
                    onChange={(e) =>
                      handleUpdateStatus(
                        e.target.value as TokenStatus,
                        e.target.value === "APPROVED" && token.category === "DOMAIN_CHANGE"
                      )
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181a26] font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="OPEN">Status: OPEN</option>
                    <option value="IN_REVIEW">Status: IN REVIEW</option>
                    <option value="APPROVED">Status: APPROVED</option>
                    <option value="REJECTED">Status: REJECTED</option>
                    <option value="RESOLVED">Status: RESOLVED</option>
                    <option value="CLOSED">Status: CLOSED</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Priority:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadge(token.priority)}`}>
                    {token.priority}
                  </span>
                </div>
              </div>
            )}

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40 dark:bg-[#0b0c10] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
              {token?.messages?.map((msg) => {
                const isPlatformSender = msg.senderRole === "PLATFORM_OWNER";
                const isCurrentUser = isPlatformOwner ? isPlatformSender : !isPlatformSender;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {msg.senderName}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isPlatformSender
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-blue-500/15 text-blue-500"
                        }`}
                      >
                        {isPlatformSender ? "Platform Owner" : "Organisation"}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                        isCurrentUser
                          ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none"
                          : "bg-white dark:bg-[#161824] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#232736] rounded-tl-none"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-3.5 bg-white dark:bg-[#12141f] border-t border-slate-100 dark:border-[#1c1f2d] flex items-center gap-2.5 shrink-0"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isPlatformOwner
                    ? "Reply to organization SuperAdmin..."
                    : "Add message or question for Platform Owner..."
                }
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#181a26] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingMsg}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {sendingMsg ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Reply</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
