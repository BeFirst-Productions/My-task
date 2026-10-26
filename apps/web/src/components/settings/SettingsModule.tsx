"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings,
  Palette,
  Bell,
  Users,
  Sliders,
  Database,
  Shield,
  Share2,
  FileText,
  CheckCircle2,
  Save,
  Upload,
  Volume2,
  Play,
  VolumeX,
  Sparkles,
  Plus,
  X,
  Globe,
  Building2,
  Receipt,
  Calendar,
  CheckSquare,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  Phone,
  Mail,
  ChevronDown,
} from "lucide-react";
import {
  SettingData,
  UpdateSettingPayload,
  fetchPlatformSetting,
  updatePlatformSetting,
  fetchOrganisationSetting,
  updateOrganisationSetting,
  playNotificationSoundPreview,
} from "@/services/setting.service";

interface SettingsModuleProps {
  scope: "PLATFORM" | "ORGANISATION";
  orgSubdomain?: string;
  orgId?: string;
  initialOrgName?: string;
  onBackToDashboard?: () => void;
}

const PRIMARY_COLOR_PRESETS = [
  { name: "Blue", hex: "#3B82F6" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Red", hex: "#EF4444" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Pink", hex: "#EC4899" },
];

const SECONDARY_COLOR_PRESETS = [
  { name: "Deep Navy", hex: "#1E3A8A" },
  { name: "Royal Purple", hex: "#6D2DCD" },
  { name: "Magenta", hex: "#D946EF" },
  { name: "Crimson", hex: "#DC2626" },
  { name: "Green", hex: "#059669" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Slate", hex: "#475569" },
];

const FONT_OPTIONS = [
  { label: "Inter (Default)", value: "Inter", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "Poppins", value: "Poppins", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "DM Sans", value: "DM Sans", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "Roboto", value: "Roboto", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "Outfit", value: "Outfit", sample: "The quick brown fox jumps over the lazy dog." },
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans", sample: "The quick brown fox jumps over the lazy dog." },
];

const SOUND_PRESETS = [
  { id: "subtle-bell", label: "Subtle Bell (Crisp Chime)" },
  { id: "modern-ping", label: "Modern Ping (Warm Digital)" },
  { id: "soft-ripple", label: "Soft Ripple (Mellow Drop)" },
  { id: "crystal-pop", label: "Crystal Pop (High Pitch)" },
  { id: "success-chime", label: "Success Chime (Ascending Triad)" },
  { id: "gentle-alert", label: "Gentle Alert (Double Marimba)" },
  { id: "mute", label: "Mute / Silent" },
];

export function SettingsModule({
  scope,
  orgSubdomain = "ibh",
  orgId,
  initialOrgName,
  onBackToDashboard,
}: SettingsModuleProps) {
  const [activeCategory, setActiveCategory] = useState<"general" | "customization" | "notifications" | "security">("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [settings, setSettings] = useState<SettingData | null>(null);
  const [newDocType, setNewDocType] = useState("");
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoInputUrl, setLogoInputUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Settings
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        let data: SettingData;
        if (scope === "PLATFORM") {
          data = await fetchPlatformSetting();
        } else {
          data = await fetchOrganisationSetting(orgSubdomain);
        }
        setSettings(data);
        if (data.logo) {
          setLogoInputUrl(data.logo);
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        setErrorMsg(err.message || "Failed to load settings from server");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [scope, orgSubdomain]);

  // Update setting field helper
  const updateField = <K extends keyof SettingData>(key: K, value: SettingData[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    setSaveSuccess(false);
  };

  // Save handler
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const payload: UpdateSettingPayload = {
        displayName: settings.displayName,
        tagline: settings.tagline,
        websiteUrl: settings.websiteUrl,
        companyAddress: settings.companyAddress,
        logo: settings.logo,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultLanguage: settings.defaultLanguage,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        defaultCurrency: settings.defaultCurrency,
        weekStart: settings.weekStart,
        defaultExpiryReminderDays: settings.defaultExpiryReminderDays,
        documentTypes: settings.documentTypes,
        defaultDocumentStatus: settings.defaultDocumentStatus,
        allowDocumentUploads: settings.allowDocumentUploads,
        enableDocAutoNumbering: settings.enableDocAutoNumbering,
        invoicePrefix: settings.invoicePrefix,
        startingInvoiceNumber: settings.startingInvoiceNumber,
        defaultDueDays: settings.defaultDueDays,
        invoiceCurrency: settings.invoiceCurrency,
        taxVatRate: settings.taxVatRate,
        enableVat: settings.enableVat,
        autoGenerateInvoiceNumber: settings.autoGenerateInvoiceNumber,
        defaultTaskPriority: settings.defaultTaskPriority,
        defaultTaskDueDays: settings.defaultTaskDueDays,
        autoAssignTasks: settings.autoAssignTasks,
        enableTaskEmailNotifications: settings.enableTaskEmailNotifications,
        showOverdueTasksOnDashboard: settings.showOverdueTasksOnDashboard,
        themeMode: settings.themeMode,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        primaryFont: settings.primaryFont,
        secondaryFont: settings.secondaryFont,
        headingFont: settings.headingFont,
        customCss: settings.customCss,
        notificationSound: settings.notificationSound,
        soundVolume: settings.soundVolume,
        deliveryMode: settings.deliveryMode,
        enableSystemPush: settings.enableSystemPush,
        enableDashboardToast: settings.enableDashboardToast,
        enableSound: settings.enableSound,
        remind7DaysBefore: settings.remind7DaysBefore,
        remind3DaysBefore: settings.remind3DaysBefore,
        remind1DayBefore: settings.remind1DayBefore,
        remindExpiredToday: settings.remindExpiredToday,
        enableWhatsAppAlerts: settings.enableWhatsAppAlerts,
        primaryWhatsAppNumber: settings.primaryWhatsAppNumber,
        secondaryWhatsAppNumbers: settings.secondaryWhatsAppNumbers,
        enableEmailAlerts: settings.enableEmailAlerts,
        notificationEmail: settings.notificationEmail,
        quietHoursEnabled: settings.quietHoursEnabled,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        autoDismissSeconds: settings.autoDismissSeconds,
      };

      let updated: SettingData;
      if (scope === "PLATFORM") {
        updated = await updatePlatformSetting(payload);
      } else {
        updated = await updateOrganisationSetting(orgSubdomain, payload);
      }

      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Add document type tag
  const handleAddDocType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocType.trim() || !settings) return;
    const currentTypes = settings.documentTypes || [];
    if (!currentTypes.includes(newDocType.trim())) {
      updateField("documentTypes", [...currentTypes, newDocType.trim()]);
    }
    setNewDocType("");
  };

  // Remove document type tag
  const handleRemoveDocType = (typeToRemove: string) => {
    if (!settings) return;
    const currentTypes = settings.documentTypes || [];
    updateField(
      "documentTypes",
      currentTypes.filter((t) => t !== typeToRemove)
    );
  };

  // Handle local file upload for logo
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        updateField("logo", base64);
        setLogoInputUrl(base64);
        setShowLogoModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading settings suite...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-400">
        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
        <p>Unable to load configuration. {errorMsg}</p>
      </div>
    );
  }

  const isPlatform = scope === "PLATFORM";

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 font-sans select-none overflow-hidden">
      {/* Top Main Heading & Floating Action Bar (Fixed at top) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#1e2330]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeCategory === "general" && (isPlatform ? "Platform General Settings" : "Organisation Settings")}
              {activeCategory === "customization" && "Theme & Appearance Customization"}
              {activeCategory === "notifications" && "Notification & Alert Settings"}
              {activeCategory === "security" && "Security & Access Controls"}
            </h1>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                isPlatform
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/30"
              }`}
            >
              {isPlatform ? "Platform Owner Scope" : `Tenant: ${orgSubdomain.toUpperCase()}`}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {activeCategory === "general" &&
              "Configure your platform information, default regional values, document rules and invoice preferences."}
            {activeCategory === "customization" &&
              "Personalize the dashboard appearance with themes, brand colors, typography pairings and live preview."}
            {activeCategory === "notifications" &&
              "Tune interactive notification sounds, delivery channels, WhatsApp alerts and expiry reminders."}
            {activeCategory === "security" &&
              "Configure multi-tenant isolation, role-based controls, session timeouts and authentication policies."}
          </p>
        </div>

        {/* Save button & status */}
        <div className="flex items-center gap-3 shrink-0">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-fade-in">
              <Check className="h-4 w-4" />
              Saved successfully!
            </span>
          )}
          {errorMsg && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
              <AlertCircle className="h-4 w-4" />
              {errorMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout: Fixed Category Sidebar + Scrollable Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start min-h-0 overflow-hidden pt-4">
        {/* Left Sidebar Category Tabs (Fixed on Desktop, does not scroll with right section) */}
        <div className="w-full lg:w-72 shrink-0 space-y-1 rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-3 shadow-sm lg:sticky lg:top-0 lg:max-h-full lg:overflow-y-auto">
          {/* 1. General Settings */}
          <button
            type="button"
            onClick={() => setActiveCategory("general")}
            className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
              activeCategory === "general"
                ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181b26]"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                activeCategory === "general" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">General Settings</div>
              <div className="text-[11px] opacity-75">Basic {isPlatform ? "platform" : "organisation"} configuration</div>
            </div>
          </button>

          {/* 2. Customization (Theme, Colors & Fonts) */}
          <button
            type="button"
            onClick={() => setActiveCategory("customization")}
            className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
              activeCategory === "customization"
                ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181b26]"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                activeCategory === "customization" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">Customization</div>
              <div className="text-[11px] opacity-75">Theme, colours and fonts</div>
            </div>
          </button>

          {/* 3. Notification Settings */}
          <button
            type="button"
            onClick={() => setActiveCategory("notifications")}
            className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
              activeCategory === "notifications"
                ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181b26]"
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                activeCategory === "notifications" ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold">Notification Settings</div>
              <div className="text-[11px] opacity-75">Sounds, WhatsApp and templates</div>
            </div>
          </button>

          {/* Nav Links from reference screenshot */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory("general")}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181b26] text-left text-xs transition-colors"
            >
              <Users className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">User Preferences</div>
                <div className="text-[10px] text-slate-400">Language, timezone and date format</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("general")}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181b26] text-left text-xs transition-colors"
            >
              <Sliders className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">System Configuration</div>
                <div className="text-[10px] text-slate-400">Business rules and defaults</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("security")}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#181b26] text-left text-xs transition-colors"
            >
              <Shield className="h-4 w-4 shrink-0 text-slate-500" />
              <div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">Security</div>
                <div className="text-[10px] text-slate-400">Login and access control</div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Content Area: Independently scrollable */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto pr-3 pb-24 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
          {/* ========================================================================= */}
          {/* TAB 1: GENERAL SETTINGS (Matching Reference Image 1)                      */}
          {/* ========================================================================= */}
          {activeCategory === "general" && (
            <div className="space-y-6">
              {/* Row 1: Platform/Org Info + Regional Settings */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Card 1: Platform / Organisation Information */}
                <div className="xl:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isPlatform ? "Platform Information" : "Organisation Information"}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Basic details about your {isPlatform ? "platform and system identity" : "organisation workspace"}.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Platform Name */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isPlatform ? "Platform Name" : "Organisation Name"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) => updateField("displayName", e.target.value)}
                        placeholder="e.g. Invest First Business Platform"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Tagline */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tagline</label>
                      <input
                        type="text"
                        value={settings.tagline || ""}
                        onChange={(e) => updateField("tagline", e.target.value)}
                        placeholder="e.g. Grow Manage Succeed Together"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Website URL */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website URL</label>
                      <input
                        type="text"
                        value={settings.websiteUrl || ""}
                        onChange={(e) => updateField("websiteUrl", e.target.value)}
                        placeholder="https://www.investfirst.ae"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Company Address */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Address</label>
                      <input
                        type="text"
                        value={settings.companyAddress || ""}
                        onChange={(e) => updateField("companyAddress", e.target.value)}
                        placeholder="Office 102, Business Tower, Dubai, UAE"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Logo Section */}
                    <div className="sm:col-span-2 p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-[#13151f] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-28 rounded-lg bg-white/90 dark:bg-black/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 overflow-hidden shadow-inner">
                          {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <div className="flex items-center gap-1 text-amber-500 font-black text-xl">
                              <span className="p-1 rounded bg-amber-500/10">b</span>
                              <span className="text-xs font-bold text-slate-400">ibh</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {isPlatform ? "Platform Logo" : "Organisation Logo"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Recommended size: 200 × 50 px (PNG, JPG, SVG)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowLogoModal(true)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1b1e2b] border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Change Logo
                        </button>
                        {settings.logo && (
                          <button
                            type="button"
                            onClick={() => updateField("logo", null)}
                            className="p-2 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Remove logo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Support Contact Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Support Contact Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={settings.supportEmail || ""}
                        onChange={(e) => updateField("supportEmail", e.target.value)}
                        placeholder="support@investfirst.ae"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Support Contact Phone */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Support Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                        <span className="flex items-center gap-1 px-2.5 text-xs font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800 shrink-0">
                          🇦🇪 +971
                        </span>
                        <input
                          type="text"
                          value={settings.supportPhone || ""}
                          onChange={(e) => updateField("supportPhone", e.target.value)}
                          placeholder="50 123 4567"
                          className="w-full px-3 py-2 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Regional Settings */}
                <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Regional Settings</h3>
                      <p className="text-[11px] text-slate-400">Set your system language, timezone, date and currency.</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Default Language */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Language</label>
                      <select
                        value={settings.defaultLanguage}
                        onChange={(e) => updateField("defaultLanguage", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="en">English</option>
                        <option value="ar">Arabic (العربية)</option>
                        <option value="fr">French (Français)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="es">Spanish (Español)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                      </select>
                    </div>

                    {/* Timezone */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateField("timezone", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Asia/Dubai">Asia/Dubai (GMT +4)</option>
                        <option value="UTC">UTC (Universal Time Coordinated)</option>
                        <option value="Europe/London">Europe/London (GMT +1)</option>
                        <option value="America/New_York">America/New York (EST)</option>
                        <option value="Asia/Riyadh">Asia/Riyadh (GMT +3)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (GMT +5:30)</option>
                      </select>
                    </div>

                    {/* Date Format & Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date Format</label>
                        <select
                          value={settings.dateFormat}
                          onChange={(e) => updateField("dateFormat", e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="MMM DD, YYYY">Oct 01, 2026</option>
                          <option value="DD/MM/YYYY">01/10/2026</option>
                          <option value="MM/DD/YYYY">10/01/2026</option>
                          <option value="YYYY-MM-DD">2026-10-01</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Currency</label>
                        <select
                          value={settings.defaultCurrency}
                          onChange={(e) => {
                            updateField("defaultCurrency", e.target.value);
                            updateField("invoiceCurrency", e.target.value);
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="AED">AED (د.إ)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="SAR">SAR (﷼)</option>
                          <option value="QAR">QAR (ر.ق)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                      </div>
                    </div>

                    {/* Week Start */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Week Start</label>
                      <select
                        value={settings.weekStart}
                        onChange={(e) => updateField("weekStart", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Sunday">Sunday (GCC Default)</option>
                        <option value="Monday">Monday (International)</option>
                        <option value="Saturday">Saturday</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Document Settings + Invoice Settings + Task Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 3: Document Settings */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Settings</h3>
                      <p className="text-[11px] text-slate-400">Set default values for document management.</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Default Document Expiry Reminder Days */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Default Expiry Reminder (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={settings.defaultExpiryReminderDays}
                        onChange={(e) => updateField("defaultExpiryReminderDays", Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Document Types tag list */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Types</label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#13151f]">
                        {(settings.documentTypes || []).map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                          >
                            {type}
                            <button
                              type="button"
                              onClick={() => handleRemoveDocType(type)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <form onSubmit={handleAddDocType} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newDocType}
                          onChange={(e) => setNewDocType(e.target.value)}
                          placeholder="Add new document type..."
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:brightness-110"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>

                    {/* Default Document Status */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Document Status</label>
                      <select
                        value={settings.defaultDocumentStatus}
                        onChange={(e) => updateField("defaultDocumentStatus", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Under Review">Under Review</option>
                      </select>
                    </div>

                    {/* Allow Document Uploads toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Allow Document Uploads</div>
                        <div className="text-[10px] text-slate-400">Enable file uploads for {isPlatform ? "all organisations" : "users"}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("allowDocumentUploads", !settings.allowDocumentUploads)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.allowDocumentUploads ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.allowDocumentUploads ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Enable Document Auto-Numbering toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Document Auto-Numbering</div>
                        <div className="text-[10px] text-slate-400">Automatically generate document tracking numbers</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("enableDocAutoNumbering", !settings.enableDocAutoNumbering)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.enableDocAutoNumbering ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.enableDocAutoNumbering ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 4: Invoice Settings (Crucial requirement from prompt) */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invoice Settings</h3>
                      <p className="text-[11px] text-slate-400">Configure default invoice numbering and tax preferences.</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Invoice Prefix & Starting Number */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Prefix</label>
                        <input
                          type="text"
                          value={settings.invoicePrefix}
                          onChange={(e) => updateField("invoicePrefix", e.target.value.toUpperCase())}
                          placeholder="INV"
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Starting Number</label>
                        <input
                          type="number"
                          min={1}
                          value={settings.startingInvoiceNumber}
                          onChange={(e) => updateField("startingInvoiceNumber", Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Default Due Days & Currency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Due Days</label>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={settings.defaultDueDays}
                          onChange={(e) => updateField("defaultDueDays", Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Currency</label>
                        <select
                          value={settings.invoiceCurrency}
                          onChange={(e) => updateField("invoiceCurrency", e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="AED">AED (د.إ)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="SAR">SAR (﷼)</option>
                        </select>
                      </div>
                    </div>

                    {/* Tax (VAT) rate */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tax (VAT)</label>
                      <select
                        value={settings.taxVatRate}
                        onChange={(e) => updateField("taxVatRate", Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={0}>0% (Zero Rated)</option>
                        <option value={5}>5% (UAE Standard VAT)</option>
                        <option value={10}>10%</option>
                        <option value={15}>15% (KSA Standard VAT)</option>
                        <option value={20}>20%</option>
                      </select>
                    </div>

                    {/* Enable VAT toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable VAT</div>
                        <div className="text-[10px] text-slate-400">Apply VAT to all invoices by default</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("enableVat", !settings.enableVat)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.enableVat ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.enableVat ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Auto Generate Invoice Number toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto Generate Invoice Number</div>
                        <div className="text-[10px] text-slate-400">Automatically generate incremental numbers</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("autoGenerateInvoiceNumber", !settings.autoGenerateInvoiceNumber)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.autoGenerateInvoiceNumber ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.autoGenerateInvoiceNumber ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 5: Task Settings */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Task Settings</h3>
                      <p className="text-[11px] text-slate-400">Configure default task assignment and notifications.</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Default Task Priority */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Task Priority</label>
                      <select
                        value={settings.defaultTaskPriority}
                        onChange={(e) => updateField("defaultTaskPriority", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Default Due Days */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Due Days</label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={settings.defaultTaskDueDays}
                        onChange={(e) => updateField("defaultTaskDueDays", Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Auto Assign Tasks */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto Assign Tasks</div>
                        <div className="text-[10px] text-slate-400">Automatically assign tasks to staff</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("autoAssignTasks", !settings.autoAssignTasks)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.autoAssignTasks ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.autoAssignTasks ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Enable Task Email Notifications */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Task Email Notifications</div>
                        <div className="text-[10px] text-slate-400">Notify assigned staff via email</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("enableTaskEmailNotifications", !settings.enableTaskEmailNotifications)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.enableTaskEmailNotifications ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.enableTaskEmailNotifications ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Show Overdue Tasks on Dashboard */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Show Overdue on Dashboard</div>
                        <div className="text-[10px] text-slate-400">Display overdue alert badge in dashboard</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("showOverdueTasksOnDashboard", !settings.showOverdueTasksOnDashboard)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.showOverdueTasksOnDashboard ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.showOverdueTasksOnDashboard ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CUSTOMIZATION (Matching Reference Image 2)                         */}
          {/* ========================================================================= */}
          {activeCategory === "customization" && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-6 shadow-sm space-y-8">
              {/* 1. Theme Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">1. Theme Selection</span>
                  <span className="text-xs text-slate-400">Choose a theme style for the platform.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Theme Card */}
                  <div
                    onClick={() => updateField("themeMode", "light")}
                    className={`relative cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      settings.themeMode === "light"
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-md"
                        : "border-slate-200 dark:border-[#222636] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#141724]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Light Theme</div>
                        <div className="text-[11px] text-slate-400">Light and clean design</div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          settings.themeMode === "light" ? "border-amber-500 bg-amber-500" : "border-slate-400"
                        }`}
                      >
                        {settings.themeMode === "light" && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    {/* Visual mini card mockup */}
                    <div className="h-20 rounded-xl bg-white border border-slate-200 p-2 flex gap-2 overflow-hidden shadow-sm">
                      <div className="w-6 rounded bg-slate-100 flex flex-col gap-1 p-1">
                        <div className="h-2 w-full rounded bg-blue-500" />
                        <div className="h-1.5 w-full rounded bg-slate-300" />
                        <div className="h-1.5 w-full rounded bg-slate-300" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-1/2 rounded bg-slate-200" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 rounded bg-slate-100" />
                          <div className="h-8 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dark Theme Card */}
                  <div
                    onClick={() => updateField("themeMode", "dark")}
                    className={`relative cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      settings.themeMode === "dark"
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-md"
                        : "border-slate-200 dark:border-[#222636] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#141724]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Dark Theme</div>
                        <div className="text-[11px] text-slate-400">Modern dark appearance</div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          settings.themeMode === "dark" ? "border-amber-500 bg-amber-500" : "border-slate-400"
                        }`}
                      >
                        {settings.themeMode === "dark" && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    {/* Visual mini card mockup */}
                    <div className="h-20 rounded-xl bg-[#0d0e13] border border-[#222636] p-2 flex gap-2 overflow-hidden shadow-sm">
                      <div className="w-6 rounded bg-[#161822] flex flex-col gap-1 p-1">
                        <div className="h-2 w-full rounded bg-amber-500" />
                        <div className="h-1.5 w-full rounded bg-slate-700" />
                        <div className="h-1.5 w-full rounded bg-slate-700" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-1/2 rounded bg-slate-700" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 rounded bg-[#161822]" />
                          <div className="h-8 rounded bg-[#161822]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Theme Card */}
                  <div
                    onClick={() => updateField("themeMode", "custom")}
                    className={`relative cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                      settings.themeMode === "custom"
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-md"
                        : "border-slate-200 dark:border-[#222636] hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#141724]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Custom Theme</div>
                        <div className="text-[11px] text-slate-400">Use your own color scheme</div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          settings.themeMode === "custom" ? "border-amber-500 bg-amber-500" : "border-slate-400"
                        }`}
                      >
                        {settings.themeMode === "custom" && <div className="h-2 w-2 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    {/* Visual mini card mockup with custom colors */}
                    <div className="h-20 rounded-xl bg-slate-950 border border-slate-800 p-2 flex gap-2 overflow-hidden shadow-sm">
                      <div
                        className="w-6 rounded flex flex-col gap-1 p-1"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        <div className="h-2 w-full rounded bg-white/70" />
                        <div className="h-1.5 w-full rounded bg-white/40" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-1/2 rounded bg-slate-800" />
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 rounded border border-white/10" style={{ backgroundColor: `${settings.secondaryColor}20` }} />
                          <div className="h-8 rounded border border-white/10" style={{ backgroundColor: `${settings.primaryColor}20` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Primary Color */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">2. Primary Color</span>
                    <p className="text-xs text-slate-400">Select the main brand color for the platform.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                      className="w-24 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateField("primaryColor", e.target.value)}
                      className="h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer overflow-hidden p-0"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {PRIMARY_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateField("primaryColor", preset.hex)}
                      className={`h-9 w-9 rounded-full transition-transform flex items-center justify-center shadow-sm ${
                        settings.primaryColor.toLowerCase() === preset.hex.toLowerCase()
                          ? "ring-4 ring-amber-500/30 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    >
                      {settings.primaryColor.toLowerCase() === preset.hex.toLowerCase() && (
                        <Check className="h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const input = prompt("Enter custom primary hex color (e.g. #F59E0B):", settings.primaryColor);
                      if (input && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input)) {
                        updateField("primaryColor", input);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Custom
                  </button>
                </div>
              </div>

              {/* 3. Secondary Color */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">3. Secondary Color</span>
                    <p className="text-xs text-slate-400">Select a secondary color for highlights, buttons and accents.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => updateField("secondaryColor", e.target.value)}
                      className="w-24 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => updateField("secondaryColor", e.target.value)}
                      className="h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer overflow-hidden p-0"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {SECONDARY_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => updateField("secondaryColor", preset.hex)}
                      className={`h-9 w-9 rounded-full transition-transform flex items-center justify-center shadow-sm ${
                        settings.secondaryColor.toLowerCase() === preset.hex.toLowerCase()
                          ? "ring-4 ring-amber-500/30 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    >
                      {settings.secondaryColor.toLowerCase() === preset.hex.toLowerCase() && (
                        <Check className="h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const input = prompt("Enter custom secondary hex color (e.g. #6D2DCD):", settings.secondaryColor);
                      if (input && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input)) {
                        updateField("secondaryColor", input);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Custom
                  </button>
                </div>
              </div>

              {/* 4. Font Settings (Matching Reference Image 2) */}
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-black text-slate-900 dark:text-white">4. Font Settings</span>
                  <p className="text-xs text-slate-400">Choose the typography family for the platform and tenant.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Primary Font */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Primary Font</label>
                    <select
                      value={settings.primaryFont}
                      onChange={(e) => updateField("primaryFont", e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Live Font Specimen Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/50 dark:bg-[#13151f] flex items-center gap-3">
                      <span className="text-2xl font-black text-slate-900 dark:text-white shrink-0">Aa</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{settings.primaryFont}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          The quick brown fox jumps over the lazy dog.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Font */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Secondary Font</label>
                    <select
                      value={settings.secondaryFont}
                      onChange={(e) => updateField("secondaryFont", e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Live Font Specimen Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/50 dark:bg-[#13151f] flex items-center gap-3">
                      <span className="text-2xl font-black text-slate-900 dark:text-white shrink-0">Aa</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{settings.secondaryFont}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          The quick brown fox jumps over the lazy dog.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Heading Font */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Heading Font</label>
                    <select
                      value={settings.headingFont}
                      onChange={(e) => updateField("headingFont", e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Live Font Specimen Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/50 dark:bg-[#13151f] flex items-center gap-3">
                      <span className="text-2xl font-black text-slate-900 dark:text-white shrink-0">Aa</span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{settings.headingFont}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          The quick brown fox jumps over the lazy dog.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Live Preview (Section 5 from Reference Image 2) */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#1e2330]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">5. Live Preview</span>
                    <p className="text-xs text-slate-400">See how your customization looks across the platform in real time.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500">
                    Live Rendering
                  </span>
                </div>

                {/* Mini Dashboard Preview Container */}
                <div className="rounded-2xl border border-slate-300 dark:border-[#242838] bg-slate-100 dark:bg-[#090a0f] p-3 overflow-hidden shadow-inner">
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0e1017] min-h-[220px]">
                    {/* Mini Sidebar */}
                    <div className="w-48 bg-[#0b0c10] text-slate-300 p-3 flex flex-col justify-between shrink-0 border-r border-[#1e2230]">
                      <div className="space-y-3">
                        {/* Logo header */}
                        <div className="flex items-center gap-2">
                          {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className="h-6 w-auto object-contain" />
                          ) : (
                            <div
                              className="h-7 w-7 rounded-lg flex items-center justify-center font-black text-sm text-slate-950"
                              style={{ backgroundColor: settings.primaryColor }}
                            >
                              b
                            </div>
                          )}
                          <span className="text-xs font-bold truncate text-white">
                            {settings.displayName || "Invest First"}
                          </span>
                        </div>

                        {/* Navigation pill with active primary color */}
                        <div className="space-y-1 text-[11px]">
                          <div
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-950 font-bold shadow-sm"
                            style={{ backgroundColor: settings.primaryColor }}
                          >
                            <Building2 className="h-3 w-3" />
                            <span>Dashboard</span>
                          </div>
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white">
                            <Users className="h-3 w-3" />
                            <span>Clients</span>
                          </div>
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white">
                            <FileText className="h-3 w-3" />
                            <span>Documents</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-500 truncate">
                        © {settings.displayName || "SaaS Platform"}
                      </div>
                    </div>

                    {/* Mini Dashboard Content */}
                    <div className="flex-1 p-3.5 space-y-3 bg-[#f8fafc] dark:bg-[#0e1017]">
                      {/* Mini top bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2230]">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Dashboard Overview
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: settings.secondaryColor }}
                          />
                          <span className="text-[10px] font-semibold text-slate-400">
                            {isPlatform ? "Platform SuperAdmin" : "Organisation Admin"}
                          </span>
                        </div>
                      </div>

                      {/* 4 Mini KPI Cards (Matching screenshot) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Total Clients */}
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#141622] shadow-sm">
                          <span className="text-[10px] text-slate-400 block">Total Clients</span>
                          <span className="text-base font-black text-slate-900 dark:text-white block mt-0.5">248</span>
                        </div>

                        {/* Total Documents */}
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#141622] shadow-sm">
                          <span className="text-[10px] text-slate-400 block">Total Documents</span>
                          <span className="text-base font-black text-slate-900 dark:text-white block mt-0.5">542</span>
                        </div>

                        {/* Pending Tasks */}
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#141622] shadow-sm">
                          <span className="text-[10px] text-slate-400 block">Pending Tasks</span>
                          <span className="text-base font-black text-amber-500 block mt-0.5">26</span>
                        </div>

                        {/* Total Invoices */}
                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#141622] shadow-sm">
                          <span className="text-[10px] text-slate-400 block">Total Invoices</span>
                          <span className="text-base font-black text-purple-400 block mt-0.5">248</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: NOTIFICATION SETTINGS                                              */}
          {/* ========================================================================= */}
          {activeCategory === "notifications" && (
            <div className="space-y-6">
              {/* Row 1: Audio Sounds & Delivery Modes */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Notification Sound Selection */}
                <div className="xl:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Audible Notification Sounds</h3>
                      <p className="text-[11px] text-slate-400">Choose custom chimes and test audio alerts instantly.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Master sound toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#141622] border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {settings.enableSound ? (
                          <Volume2 className="h-5 w-5 text-amber-500" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Alert Sounds</div>
                          <div className="text-[10px] text-slate-400">Play pleasant chimes on incoming document expiry alerts</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("enableSound", !settings.enableSound)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.enableSound ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.enableSound ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Sound Presets Dropdown & Live Playback Button */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Select Notification Sound
                      </label>
                      <div className="flex gap-2.5">
                        <select
                          value={settings.notificationSound}
                          onChange={(e) => {
                            updateField("notificationSound", e.target.value);
                            playNotificationSoundPreview(e.target.value, settings.soundVolume);
                          }}
                          className="flex-1 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {SOUND_PRESETS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => playNotificationSoundPreview(settings.notificationSound, settings.soundVolume)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all shrink-0"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Test Sound
                        </button>
                      </div>
                    </div>

                    {/* Volume Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sound Volume</label>
                        <span className="text-xs font-bold text-amber-500">{settings.soundVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.soundVolume}
                        onChange={(e) => updateField("soundVolume", Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Channels (System vs In-App Dashboard) */}
                <div className="xl:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Mode</h3>
                      <p className="text-[11px] text-slate-400">Choose between desktop push and in-app dashboard toasts.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Delivery Mode options */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Alert Dispatch Scope</label>
                      <select
                        value={settings.deliveryMode}
                        onChange={(e) => updateField("deliveryMode", e.target.value as any)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="BOTH">Both Dashboard & System Notifications (Recommended)</option>
                        <option value="DASHBOARD_ONLY">Dashboard In-App Toasts Only</option>
                        <option value="SYSTEM_ONLY">System / Browser Push Only</option>
                      </select>
                    </div>

                    {/* System Push toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Browser Push Alerts</div>
                        <div className="text-[10px] text-slate-400">Receive alerts even when browser tab is minimized</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!settings.enableSystemPush && typeof window !== "undefined" && "Notification" in window) {
                            Notification.requestPermission();
                          }
                          updateField("enableSystemPush", !settings.enableSystemPush);
                        }}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.enableSystemPush ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.enableSystemPush ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* In-app Dashboard Toast toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Dashboard In-App Toast</div>
                        <div className="text-[10px] text-slate-400">Show floating animated alert pill inside CRM</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("enableDashboardToast", !settings.enableDashboardToast)}
                        className={`h-6 w-11 rounded-full p-1 transition-colors ${
                          settings.enableDashboardToast ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white transition-transform ${
                            settings.enableDashboardToast ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Auto Dismiss Seconds */}
                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Toast Auto-Dismiss Time
                      </label>
                      <select
                        value={settings.autoDismissSeconds}
                        onChange={(e) => updateField("autoDismissSeconds", Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value={3}>3 Seconds</option>
                        <option value={5}>5 Seconds (Default)</option>
                        <option value={10}>10 Seconds</option>
                        <option value={0}>Persistent (Manual Dismiss)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Expiry Cadence + WhatsApp + Email Channels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Expiry Cadence Reminders */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Expiry Alert Cadence
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <span>7 Days Before Expiry</span>
                      <input
                        type="checkbox"
                        checked={settings.remind7DaysBefore}
                        onChange={(e) => updateField("remind7DaysBefore", e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <span>3 Days Before Expiry</span>
                      <input
                        type="checkbox"
                        checked={settings.remind3DaysBefore}
                        onChange={(e) => updateField("remind3DaysBefore", e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <span>1 Day Before Expiry</span>
                      <input
                        type="checkbox"
                        checked={settings.remind1DayBefore}
                        onChange={(e) => updateField("remind1DayBefore", e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <span>On Expiry Day</span>
                      <input
                        type="checkbox"
                        checked={settings.remindExpiredToday}
                        onChange={(e) => updateField("remindExpiredToday", e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                    </label>
                  </div>
                </div>

                {/* WhatsApp Channel */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        WhatsApp Notifications
                      </h4>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableWhatsAppAlerts}
                      onChange={(e) => updateField("enableWhatsAppAlerts", e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Primary WhatsApp Recipient
                    </label>
                    <input
                      type="text"
                      value={settings.primaryWhatsAppNumber || ""}
                      onChange={(e) => updateField("primaryWhatsAppNumber", e.target.value)}
                      placeholder="+971501234567"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Receives instant compliance renewal alerts via WhatsApp Gateway.
                    </p>
                  </div>
                </div>

                {/* Email Channel */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1c1f2b]">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-sky-500" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Email Notifications
                      </h4>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableEmailAlerts}
                      onChange={(e) => updateField("enableEmailAlerts", e.target.checked)}
                      className="rounded text-sky-500 focus:ring-sky-500 h-4 w-4"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Notification Sender Email
                    </label>
                    <input
                      type="email"
                      value={settings.notificationEmail || ""}
                      onChange={(e) => updateField("notificationEmail", e.target.value)}
                      placeholder="alerts@investfirst.ae"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Automated digests & renewal reminders sent from this address.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SECURITY & ISOLATION                                               */}
          {/* ========================================================================= */}
          {activeCategory === "security" && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#1e2330] bg-white dark:bg-[#10121a] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1c1f2b]">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Multi-Tenant Isolation & Security
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enterprise tenancy boundaries, cryptographic session enforcement and audit logging.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/50 dark:bg-[#13151f] space-y-2">
                  <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Row-Level Tenant Isolation
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All organization queries are strictly scoped by <code className="text-amber-500 font-mono text-[11px]">organisation_id</code>. Superadmins cannot read or write data of other tenants.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#222636] bg-slate-50/50 dark:bg-[#13151f] space-y-2">
                  <div className="text-xs font-bold text-sky-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Dynamic Branding Scoping
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Changes made by Platform Owners affect platform defaults. Changes made by Organization Superadmins remain strictly scoped to their individual workspace.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Logo Modal Dialog */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#222636] bg-white dark:bg-[#12141c] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Update {isPlatform ? "Platform" : "Organisation"} Logo
              </h3>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option A: Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Image Web URL</label>
                <input
                  type="text"
                  value={logoInputUrl}
                  onChange={(e) => setLogoInputUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151722] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Option B: Upload file */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Or Upload Image File</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileUpload}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-950 file:font-bold hover:file:brightness-110 cursor-pointer"
                />
              </div>

              {/* Preset Logos */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quick Demo Presets</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateField("logo", "/ibh-logo.png");
                      setShowLogoModal(false);
                    }}
                    className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-xs font-bold text-center"
                  >
                    IBH Platform Logo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateField("logo", "/dubai_skyline.jpg");
                      setShowLogoModal(false);
                    }}
                    className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-xs font-bold text-center"
                  >
                    Burj Corporate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (logoInputUrl.trim()) {
                    updateField("logo", logoInputUrl.trim());
                  }
                  setShowLogoModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Apply Logo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
