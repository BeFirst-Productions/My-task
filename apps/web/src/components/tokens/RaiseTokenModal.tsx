"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Globe,
  Wrench,
  CreditCard,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  TokenCategory,
  TokenPriority,
  createSupportToken,
  SupportToken,
} from "@/services/token.service";

interface RaiseTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgSubdomain: string;
  orgName: string;
  initialCategory?: TokenCategory;
  initialCurrentDomain?: string;
  initialRequestedPrefix?: string;
  onTokenCreated?: (token: SupportToken) => void;
}

const CATEGORY_OPTIONS: {
  category: TokenCategory;
  label: string;
  desc: string;
  icon: any;
  color: string;
}[] = [
  {
    category: "DOMAIN_CHANGE",
    label: "Domain Name Change",
    desc: "Request to modify your organisation's official website URL prefix.",
    icon: Globe,
    color: "from-blue-500/20 to-cyan-500/10 text-blue-500 border-blue-500/30",
  },
  {
    category: "TECHNICAL_SUPPORT",
    label: "Technical Issue / Bug",
    desc: "Report errors, UI glitches, or broken operational functionality.",
    icon: Wrench,
    color: "from-rose-500/20 to-orange-500/10 text-rose-500 border-rose-500/30",
  },
  {
    category: "BILLING_PLAN",
    label: "Billing & Plan Upgrade",
    desc: "Inquire about user limits, module tiers, or enterprise expansion.",
    icon: CreditCard,
    color: "from-purple-500/20 to-pink-500/10 text-purple-500 border-purple-500/30",
  },
  {
    category: "FEATURE_REQUEST",
    label: "Feature Request",
    desc: "Suggest system improvements or custom workflow configurations.",
    icon: Lightbulb,
    color: "from-amber-500/20 to-yellow-500/10 text-amber-500 border-amber-500/30",
  },
  {
    category: "CUSTOM",
    label: "Custom Issue / Other",
    desc: "Raise any general administrative, compliance or custom request.",
    icon: HelpCircle,
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-500 border-emerald-500/30",
  },
];

export function RaiseTokenModal({
  isOpen,
  onClose,
  orgSubdomain,
  orgName,
  initialCategory = "DOMAIN_CHANGE",
  initialCurrentDomain,
  initialRequestedPrefix = "",
  onTokenCreated,
}: RaiseTokenModalProps) {
  const [category, setCategory] = useState<TokenCategory>(initialCategory);
  const [customCategory, setCustomCategory] = useState("");
  const [priority, setPriority] = useState<TokenPriority>("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // Domain change specific fields
  const [requestedPrefix, setRequestedPrefix] = useState(initialRequestedPrefix);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      if (initialCategory === "DOMAIN_CHANGE") {
        setSubject(`Domain Change Request for ${orgName}`);
        setDescription(`We request Platform Owner authorization to update our website URL prefix.`);
      } else {
        setSubject("");
        setDescription("");
      }
      setRequestedPrefix(initialRequestedPrefix);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialCategory, orgName, initialRequestedPrefix]);

  if (!isOpen) return null;

  const currentPrefix = initialCurrentDomain
    ? initialCurrentDomain.replace(/^https?:\/\//i, "").replace(/\.mytask\.com.*$/i, "").replace(/\..*$/, "")
    : orgSubdomain;

  const cleanRequestedPrefix = requestedPrefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (category === "DOMAIN_CHANGE") {
      if (!cleanRequestedPrefix) {
        setErrorMsg("Please enter the requested domain prefix.");
        return;
      }
      if (cleanRequestedPrefix === currentPrefix) {
        setErrorMsg("Requested prefix must be different from the current domain prefix.");
        return;
      }
    }

    if (!subject.trim()) {
      setErrorMsg("Please enter a subject for this token.");
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg("Please provide a detailed description (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const fullRequestedDomain =
        category === "DOMAIN_CHANGE" ? `https://${cleanRequestedPrefix}.mytask.com` : undefined;
      const fullCurrentDomain =
        category === "DOMAIN_CHANGE" ? `https://${currentPrefix}.mytask.com` : undefined;

      const created = await createSupportToken(orgSubdomain, {
        category,
        customCategory: category === "CUSTOM" ? customCategory : undefined,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        currentDomain: fullCurrentDomain,
        requestedDomain: fullRequestedDomain,
      });

      setSuccessMsg(`Token #${created.tokenNumber} has been successfully raised to the Platform Owner.`);
      if (onTokenCreated) {
        onTokenCreated(created);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to raise support token.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-[#222636] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-[#1c1f2d] bg-slate-50/50 dark:bg-[#12141f]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Raise Token to Platform Owner
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-500">
                  {orgSubdomain.toUpperCase()}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct official request pipeline to the platform administrator.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181a26] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Category Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              1. Select Request / Issue Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = category === opt.category;
                return (
                  <button
                    key={opt.category}
                    type="button"
                    onClick={() => {
                      setCategory(opt.category);
                      if (opt.category === "DOMAIN_CHANGE") {
                        setSubject(`Domain Change Request for ${orgName}`);
                        setDescription(`We request Platform Owner authorization to update our website URL prefix.`);
                      }
                    }}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/40"
                        : "border-slate-200 dark:border-[#1e2230] bg-slate-50/60 dark:bg-[#13151f] hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 border ${opt.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {opt.label}
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Category Input if Custom */}
          {category === "CUSTOM" && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Custom Category Name
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Compliance Audit, Integration Support"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* 2. Special Domain Change Interactive Section */}
          {category === "DOMAIN_CHANGE" && (
            <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  Website URL Domain Transition Details
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                  Platform Owner Approval Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Current Domain */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Current Active Prefix
                  </label>
                  <div className="flex items-center px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-black/40 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                    <Lock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    <span>{currentPrefix}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-normal">.mytask.com</span>
                  </div>
                </div>

                {/* Requested Domain */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Requested New Prefix <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                    <span className="px-2.5 py-2 text-xs font-mono text-slate-400 bg-slate-100 dark:bg-[#10121a] border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
                      https://
                    </span>
                    <input
                      type="text"
                      value={requestedPrefix}
                      onChange={(e) => setRequestedPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="newprefix"
                      className="w-full px-2.5 py-2 text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="px-2.5 py-2 text-xs font-mono text-amber-500 font-bold bg-amber-500/10 border-l border-slate-200 dark:border-slate-800 shrink-0 select-none">
                      .mytask.com
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview banner */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-1 border-t border-blue-500/20">
                <span>Domain Preview:</span>
                <span className="font-mono text-slate-400">https://{currentPrefix}.mytask.com</span>
                <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="font-mono font-bold text-amber-500">
                  https://{cleanRequestedPrefix || "yourprefix"}.mytask.com
                </span>
              </div>
            </div>
          )}

          {/* 3. Priority & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-8 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Subject / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of request or issue"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TokenPriority)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="LOW">Low (General)</option>
                <option value="MEDIUM">Medium (Standard)</option>
                <option value="HIGH">High (Urgent)</option>
                <option value="URGENT">Urgent (Critical)</option>
              </select>
            </div>
          </div>

          {/* 4. Description / Reason */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Detailed Request / Reason <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Visible to Platform Owner</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the background, reason, or technical circumstances for this token..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1c1f2d]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a1d2b] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Submitting Token...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Token to Platform Owner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
