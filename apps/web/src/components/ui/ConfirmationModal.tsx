"use client";

import React, { useEffect, useCallback } from "react";
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";

export type ConfirmationVariant = "danger" | "warning" | "success" | "info";

export interface EntityPreviewData {
  avatarText?: string;
  avatarBg?: string;
  title: string;
  subtitle?: string;
  badges?: Array<{
    text: string;
    variant?: "default" | "warning" | "danger" | "success" | "purple" | "blue";
  }>;
}

export interface ConsequenceItem {
  text: string;
  type?: "danger" | "warning" | "neutral" | "positive";
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  error?: string | null;
  entityPreview?: EntityPreviewData;
  consequences?: ConsequenceItem[];
  children?: React.ReactNode;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  variant = "warning",
  icon,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  error = null,
  entityPreview,
  consequences,
  children,
}: ConfirmationModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Variant styling configurations
  const variantConfig = {
    danger: {
      iconBg: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      confirmBtn:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 focus:ring-rose-500/30",
      defaultIcon: <AlertCircle className="h-5 w-5" />,
    },
    warning: {
      iconBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      confirmBtn:
        "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-amber-500/20 focus:ring-amber-500/30",
      defaultIcon: <AlertTriangle className="h-5 w-5" />,
    },
    success: {
      iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      confirmBtn:
        "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-emerald-600/20 focus:ring-emerald-500/30",
      defaultIcon: <CheckCircle2 className="h-5 w-5" />,
    },
    info: {
      iconBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      confirmBtn:
        "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 focus:ring-blue-500/30",
      defaultIcon: <Info className="h-5 w-5" />,
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/30 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#161822]/40">
          <div className="flex items-start gap-3.5 min-w-0 pr-2">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${variantConfig.iconBg}`}
            >
              {icon || variantConfig.defaultIcon}
            </div>
            <div className="min-w-0">
              <h3
                id="confirmation-modal-title"
                className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate"
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Entity Preview Card */}
          {entityPreview && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#161822] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {entityPreview.avatarText && (
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      entityPreview.avatarBg || "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {entityPreview.avatarText}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900 dark:text-white block truncate">
                    {entityPreview.title}
                  </span>
                  {entityPreview.subtitle && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      {entityPreview.subtitle}
                    </span>
                  )}
                </div>
              </div>
              {entityPreview.badges && entityPreview.badges.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {entityPreview.badges.map((b, idx) => {
                    const badgeStyles = {
                      default: "bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                      warning: "bg-amber-500/15 text-amber-500 border border-amber-500/20",
                      danger: "bg-rose-500/15 text-rose-500 border border-rose-500/20",
                      success: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
                      purple: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
                      blue: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
                    }[b.variant || "default"];

                    return (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${badgeStyles}`}
                      >
                        {b.text}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Children text or details */}
          {children}

          {/* Operational Consequences / Effect List */}
          {consequences && consequences.length > 0 && (
            <div className="rounded-xl p-3 bg-slate-50/80 dark:bg-[#151722]/60 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Impact of this action
              </p>
              <ul className="space-y-1.5">
                {consequences.map((item, idx) => {
                  const bulletColor = {
                    danger: "text-rose-500",
                    warning: "text-amber-500",
                    positive: "text-emerald-500",
                    neutral: "text-slate-400",
                  }[item.type || "neutral"];

                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 leading-normal"
                    >
                      <span className={`font-bold text-xs shrink-0 select-none ${bulletColor}`}>
                        •
                      </span>
                      <span>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#161822]/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#181a24] border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${variantConfig.confirmBtn}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
