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
  AlertTriangle,
} from "lucide-react";
import {
  SupportToken,
  TokenStatus,
  fetchTokenDetails,
  updateTokenStatus,
  sendTokenMessage,
} from "@/services/token.service";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const [token, setToken] = useState<SupportToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reply message
  const [replyText, setReplyText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  // Decline confirmation prompt
  const [showDeclinePrompt, setShowDeclinePrompt] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadDetails = async (isInitial = false) => {
    if (!tokenId) return;
    try {
      if (isInitial) setLoading(true);
      setErrorMsg(null);
      const data = await fetchTokenDetails(tokenId);
      setToken(data);
      if (data.resolutionNotes) {
        setResolutionNote(data.resolutionNotes);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load token details");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tokenId) {
      loadDetails(true);
      // Fast polling: 2.5 seconds while chat modal is actively open
      const interval = setInterval(() => loadDetails(false), 2500);

      const handleRefresh = () => loadDetails(false);
      const handleStorage = (e: StorageEvent) => {
        if (e.key === "mytask_token_ping") {
          loadDetails(false);
        }
      };

      window.addEventListener("token-notification-refresh", handleRefresh);
      window.addEventListener("storage", handleStorage);

      return () => {
        clearInterval(interval);
        window.removeEventListener("token-notification-refresh", handleRefresh);
        window.removeEventListener("storage", handleStorage);
      };
    }
  }, [isOpen, tokenId]);

  useEffect(() => {
    if (token?.messages && token.messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [token?.messages?.length]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingMsg || !token) return;

    setSendingMsg(true);
    try {
      const senderRole = isPlatformOwner ? "PLATFORM_OWNER" : (user?.role || "SUPER_ADMIN");
      const senderName = user?.fullName || (isPlatformOwner ? "Platform Owner" : "Super Admin");

      const newMsg = await sendTokenMessage(token.id, replyText.trim(), {
        role: senderRole,
        fullName: senderName,
      });

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

  const handleUpdateStatus = async (
    newStatus: TokenStatus,
    approveDomain = false,
    customNote?: string
  ) => {
    if (!token || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const noteToSave = customNote !== undefined ? customNote : (resolutionNote.trim() || undefined);
      const updated = await updateTokenStatus(
        token.id,
        newStatus,
        noteToSave,
        approveDomain
      );
      setToken(updated);
      setShowDeclinePrompt(false);
      setDeclineReason("");
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update token status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConfirmDecline = () => {
    const reason = declineReason.trim() || "Request declined by Platform Administration.";
    handleUpdateStatus("REJECTED", false, reason);
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

  const isRejected = token?.status === "REJECTED";
  const isApproved = token?.status === "APPROVED";
  const isResolved = token?.status === "RESOLVED";
  const isPendingReview = token?.status === "OPEN" || token?.status === "IN_REVIEW";

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
                {token.status === "REJECTED" ? "DECLINED" : token.status.replace("_", " ")}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181a26] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner (Universal across all categories) */}
        {token && isRejected && (
          <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <div>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  This token request has been Declined / Rejected by Platform Administration.
                </span>
                {token.resolutionNotes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    Reason: &ldquo;{token.resolutionNotes}&rdquo;
                  </p>
                )}
              </div>
            </div>
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-rose-500/20 text-rose-500 border border-rose-500/30 shrink-0">
              DECLINED
            </span>
          </div>
        )}

        {token && isApproved && (
          <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  This request has been Officially Approved by Platform Administration.
                </span>
                {token.category === "DOMAIN_CHANGE" ? (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Domain modification permission is unlocked in Organisation Settings.
                  </p>
                ) : token.resolutionNotes ? (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    Note: &ldquo;{token.resolutionNotes}&rdquo;
                  </p>
                ) : null}
              </div>
            </div>
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 shrink-0">
              APPROVED
            </span>
          </div>
        )}

        {token && isResolved && (
          <div className="px-6 py-3 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0" />
              <div>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  This support ticket is marked as Resolved.
                </span>
                {token.resolutionNotes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    Resolution Note: &ldquo;{token.resolutionNotes}&rdquo;
                  </p>
                )}
              </div>
            </div>
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-cyan-500/20 text-cyan-500 border border-cyan-500/30 shrink-0">
              RESOLVED
            </span>
          </div>
        )}

        {/* Decline Confirmation Prompt Card (Platform Owner action) */}
        {showDeclinePrompt && isPlatformOwner && (
          <div className="px-6 py-4 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/50 space-y-3 shrink-0 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Confirm Decline of Request #{token?.tokenNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeclinePrompt(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Provide a reason for declining. This reason will be recorded in the ticket ledger and sent to the organization SuperAdmin.
            </p>
            <textarea
              rows={2}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Domain prefix already in use, or policy non-compliant..."
              className="w-full p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#12141c] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeclinePrompt(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={handleConfirmDecline}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
              >
                {statusUpdating ? "Declining..." : "Confirm & Decline Request"}
              </button>
            </div>
          </div>
        )}

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

                  {/* Actions for Platform Owner */}
                  {isApproved ? (
                    <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Domain Edit Unlocked for SuperAdmin</span>
                    </div>
                  ) : isRejected ? (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold">
                        <XCircle className="h-4 w-4" />
                        <span>Domain Request Declined</span>
                      </div>
                      {isPlatformOwner && (
                        <button
                          type="button"
                          disabled={statusUpdating}
                          onClick={() => handleUpdateStatus("APPROVED", true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                          title="Re-open and approve domain change"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Reconsider & Approve</span>
                        </button>
                      )}
                    </div>
                  ) : isPendingReview && isPlatformOwner ? (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => handleUpdateStatus("APPROVED", true)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Approve & Unlock Domain</span>
                      </button>
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => setShowDeclinePrompt(true)}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Platform Owner Status Management Strip */}
            {isPlatformOwner && token && (
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#11131c] border-b border-slate-100 dark:border-[#1a1d28] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Platform Action:
                  </span>
                  <select
                    value={token.status}
                    disabled={statusUpdating}
                    onChange={(e) => {
                      const newSt = e.target.value as TokenStatus;
                      if (newSt === "REJECTED") {
                        setShowDeclinePrompt(true);
                      } else {
                        handleUpdateStatus(
                          newSt,
                          newSt === "APPROVED" && token.category === "DOMAIN_CHANGE"
                        );
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181a26] font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="OPEN">Status: OPEN</option>
                    <option value="IN_REVIEW">Status: IN REVIEW</option>
                    <option value="APPROVED">Status: APPROVED</option>
                    <option value="REJECTED">Status: REJECTED / DECLINED</option>
                    <option value="RESOLVED">Status: RESOLVED</option>
                    <option value="CLOSED">Status: CLOSED</option>
                  </select>

                  {/* Non-domain Quick Actions */}
                  {token.category !== "DOMAIN_CHANGE" && isPendingReview && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => handleUpdateStatus("RESOLVED")}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-600 dark:text-cyan-400 hover:text-slate-950 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => setShowDeclinePrompt(true)}
                        className="px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  )}
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
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-amber-500/20 cursor-pointer"
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
