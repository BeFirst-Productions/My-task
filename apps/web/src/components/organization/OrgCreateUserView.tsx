"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Settings,
  Shield,
  ShieldCheck,
  Crown,
  Users,
  Key,
  Lock,
  Eye,
  EyeOff,
  Info,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Sliders,
  RotateCcw,
  Sparkles,
  CheckCheck,
  Layers,
  FileText,
  Boxes,
} from "lucide-react";
import {
  createTenantUser,
  fetchAvailableRoles,
  type CreateTenantUserPayload,
  ORGANISATION_AVAILABLE_ROLES,
  CRM_MODULES,
  ROLE_DEFAULT_PERMISSIONS,
  type OrgRole,
  type CrmModule,
  type ModuleAction,
  type ModuleActionDef,
  type RoleDefinition,
} from "@/services/user.service";
import { Tooltip } from "@/components/ui/Tooltip";

interface OrgCreateUserViewProps {
  orgName: string;
  orgSubdomain: string;
  onBack: () => void;
  onSuccess: () => void;
}

const UAE_DIAL_CODES = [
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+91", country: "India", flag: "🇮🇳" },
];

export function OrgCreateUserView({
  orgName,
  orgSubdomain,
  onBack,
  onSuccess,
}: OrgCreateUserViewProps) {
  // Form fields state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Dynamic Organization Roles & Modules
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>(ORGANISATION_AVAILABLE_ROLES);
  const [availableModules, setAvailableModules] = useState<CrmModule[]>(CRM_MODULES);
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, Record<string, ModuleAction[]>>>(ROLE_DEFAULT_PERMISSIONS);

  // Selected role
  const [selectedRole, setSelectedRole] = useState<OrgRole>("STAFF");

  // Permission customization state
  const [isCustomized, setIsCustomized] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Record<string, ModuleAction[]>>(() => {
    return JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS.STAFF));
  });

  // Category filter for the permission matrix
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Passwords
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch dynamic organization modules & role definitions on mount
  useEffect(() => {
    fetchAvailableRoles()
      .then((data) => {
        if (data.roles?.length) setAvailableRoles(data.roles);
        if (data.modules?.length) setAvailableModules(data.modules);
        if (data.roleDefaultPermissions) {
          setRolePermissionsMap(data.roleDefaultPermissions);
          if (!isCustomized) {
            const defaults = data.roleDefaultPermissions[selectedRole] || ROLE_DEFAULT_PERMISSIONS[selectedRole] || {};
            setCustomPermissions(JSON.parse(JSON.stringify(defaults)));
          }
        }
      })
      .catch((err) => {
        console.warn("Could not load organization modules dynamically:", err);
      });
  }, []);

  // When selectedRole changes, sync defaults if not currently in customized mode
  const handleRoleChange = (role: OrgRole) => {
    setSelectedRole(role);
    if (!isCustomized) {
      const defaults = rolePermissionsMap[role] || ROLE_DEFAULT_PERMISSIONS[role] || {};
      setCustomPermissions(JSON.parse(JSON.stringify(defaults)));
    }
  };

  // Reset customizations to canonical role defaults
  const handleResetToRoleDefaults = () => {
    const defaults = rolePermissionsMap[selectedRole] || ROLE_DEFAULT_PERMISSIONS[selectedRole] || {};
    setCustomPermissions(JSON.parse(JSON.stringify(defaults)));
    setIsCustomized(false);
  };

  // Switch to custom mode
  const handleEnableCustomization = () => {
    if (!isCustomized) {
      const defaults = rolePermissionsMap[selectedRole] || ROLE_DEFAULT_PERMISSIONS[selectedRole] || {};
      setCustomPermissions(JSON.parse(JSON.stringify(defaults)));
      setIsCustomized(true);
    }
  };

  // Toggle individual action for a module
  const handleToggleModuleAction = (moduleId: string, action: ModuleAction) => {
    setIsCustomized(true);
    setCustomPermissions((prev) => {
      const current = prev[moduleId] ? [...prev[moduleId]] : [];
      const idx = current.indexOf(action);
      let updated: ModuleAction[];
      if (idx >= 0) {
        updated = current.filter((a) => a !== action);
      } else {
        updated = [...current, action];
      }
      return {
        ...prev,
        [moduleId]: updated,
      };
    });
  };

  // Toggle all available actions for a module
  const handleToggleAllModuleActions = (mod: CrmModule) => {
    setIsCustomized(true);
    const available = (mod.availableActions || []).map((a) => a.action);
    setCustomPermissions((prev) => {
      const current = prev[mod.id] || [];
      const hasAll = available.length > 0 && available.every((act) => current.includes(act));
      return {
        ...prev,
        [mod.id]: hasAll ? [] : [...available],
      };
    });
  };

  // Grant all actions across all modules
  const handleGrantAll = () => {
    setIsCustomized(true);
    const all: Record<string, ModuleAction[]> = {};
    for (const mod of availableModules) {
      all[mod.id] = (mod.availableActions || []).map((a) => a.action);
    }
    setCustomPermissions(all);
  };

  // Clear all permissions
  const handleRevokeAll = () => {
    setIsCustomized(true);
    const empty: Record<string, ModuleAction[]> = {};
    for (const mod of availableModules) {
      empty[mod.id] = [];
    }
    setCustomPermissions(empty);
  };

  // Live active permissions mapping (either custom or role default preset)
  const activePermissions = useMemo(() => {
    if (isCustomized) {
      return customPermissions;
    }
    return rolePermissionsMap[selectedRole] || ROLE_DEFAULT_PERMISSIONS[selectedRole] || {};
  }, [isCustomized, customPermissions, rolePermissionsMap, selectedRole]);

  // Derived statistics
  const activeModuleIds = useMemo(() => {
    return Object.keys(activePermissions).filter(
      (modId) => (activePermissions[modId]?.length ?? 0) > 0
    );
  }, [activePermissions]);

  const totalActionsGranted = useMemo(() => {
    return Object.values(activePermissions).reduce((acc, acts) => acc + (acts?.length || 0), 0);
  }, [activePermissions]);

  const totalPossibleActions = useMemo(() => {
    return availableModules.reduce((acc, m) => acc + (m.availableActions?.length || 0), 0);
  }, [availableModules]);

  // Distinct categories from available modules
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableModules.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [availableModules]);

  const filteredModules = useMemo(() => {
    if (selectedCategory === "ALL") return availableModules;
    return availableModules.filter((m) => m.category === selectedCategory);
  }, [availableModules, selectedCategory]);

  // Live password requirement checks
  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  }, [password]);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validations
    if (!fullName.trim()) {
      setErrorMessage("Please enter the user's full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage("Please enter a phone number.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both password fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const designation =
        selectedRole === "SUPER_ADMIN"
          ? "Super Admin"
          : selectedRole === "ADMIN"
          ? "Administrator"
          : "Staff Member";

      const fullPhone = `${dialCode} ${phoneNumber.trim()}`;

      const payload: CreateTenantUserPayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: fullPhone,
        password,
        role: selectedRole,
        status: isActive ? "ACTIVE" : "INACTIVE",
        designation,
        customPermissions: isCustomized ? customPermissions : null,
      };

      await createTenantUser(payload);

      setSuccessMessage(`User "${fullName.trim()}" successfully created! Redirecting to list...`);
      setTimeout(() => {
        onSuccess();
      }, 900);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create user");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto animate-in fade-in duration-200">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] dark:text-white tracking-tight">
            Create New User
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision team members with organization-specific module permissions and granular CRUD access.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to User List</span>
        </button>
      </div>

      {/* Notifications Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================ */}
        {/* LEFT COLUMN: MAIN FORM (8 COLUMNS) */}
        {/* ================================================================ */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 1: BASIC INFORMATION */}
          <div className="rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Basic Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter personal details for this user.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-xs sm:text-sm">
              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* Phone Number with Country Select */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500 overflow-hidden transition-all">
                  <div className="relative flex items-center shrink-0">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="h-full pl-2.5 pr-6 py-2.5 bg-slate-50 dark:bg-[#1a1e2b] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs appearance-none cursor-pointer focus:outline-none"
                    >
                      {UAE_DIAL_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.flag} {item.code}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* CARD 2: ROLE & BASE ACCESS */}
          <div className="rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Role Preset & Baseline Access
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a baseline role. You can fine-tune or customize individual module CRUD permissions below.
                </p>
              </div>
            </div>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {availableRoles.map((roleDef) => {
                const isSelected = selectedRole === roleDef.role;
                const defPermissions = rolePermissionsMap[roleDef.role] || ROLE_DEFAULT_PERMISSIONS[roleDef.role] || {};
                const modCount = Object.keys(defPermissions).length;

                return (
                  <button
                    key={roleDef.role}
                    type="button"
                    onClick={() => handleRoleChange(roleDef.role)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden group ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/[0.05] dark:bg-amber-500/[0.08] ring-2 ring-amber-500/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#151722]/50 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full mb-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                              : roleDef.role === "SUPER_ADMIN"
                              ? "bg-amber-500/10 text-amber-500"
                              : roleDef.role === "ADMIN"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {roleDef.role === "SUPER_ADMIN" ? (
                            <Crown className="h-4 w-4" />
                          ) : roleDef.role === "ADMIN" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>

                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-500 text-slate-950"
                              : "border-slate-300 dark:border-slate-700 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                        {roleDef.name}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {roleDef.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Default Modules:</span>
                      <span className="font-semibold text-amber-500">
                        {modCount} / {availableModules.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 3: GRANULAR CRUD & MODULE PERMISSIONS CUSTOMIZATION */}
          <div className="rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
            {/* Header + Mode Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Granular Module CRUD Permissions
                    </h3>
                    {isCustomized ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Customized
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Role Preset
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Super Admin can customize available CRUD actions for each module in this organization.
                  </p>
                </div>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={handleResetToRoleDefaults}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                      !isCustomized
                        ? "bg-white dark:bg-[#1f2330] text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Role Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEnableCustomization}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                      isCustomized
                        ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Customize</span>
                  </button>
                </div>

                {isCustomized && (
                  <Tooltip content="Revert all changes to match the selected role defaults">
                    <button
                      type="button"
                      onClick={handleResetToRoleDefaults}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-amber-500 hover:border-amber-500/30 transition-all text-xs"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Sub-toolbar: Category filter and Quick actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Filter:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all ${
                      selectedCategory === cat
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Batch Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleGrantAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  <CheckCheck className="h-3 w-3 text-emerald-500" />
                  <span>Grant All</span>
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  <span>Revoke All</span>
                </button>
              </div>
            </div>

            {/* Granular Modules Grid */}
            <div className="space-y-3 pt-1">
              {filteredModules.map((mod) => {
                const grantedActions = activePermissions[mod.id] || [];
                const available = mod.availableActions || [];
                const totalActions = available.length;
                const hasAllActions = totalActions > 0 && available.every((a) => grantedActions.includes(a.action));
                const isPartiallyGranted = grantedActions.length > 0 && !hasAllActions;
                const isNoneGranted = grantedActions.length === 0;

                return (
                  <div
                    key={mod.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      hasAllActions
                        ? "bg-amber-500/[0.02] border-amber-300/60 dark:border-amber-900/40"
                        : isPartiallyGranted
                        ? "bg-slate-50/50 dark:bg-[#141722]/50 border-slate-200 dark:border-slate-800"
                        : "bg-slate-50/30 dark:bg-[#12141c]/40 border-slate-200/60 dark:border-slate-800/60 opacity-80"
                    }`}
                  >
                    {/* Module Title Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                            !isNoneGranted
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-slate-200/80 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Boxes className="h-3.5 w-3.5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {mod.label}
                            </span>
                            {mod.category && (
                              <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                {mod.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quick module toggle + Action summary badge */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            hasAllActions
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : isPartiallyGranted
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {hasAllActions
                            ? "Full Access"
                            : isPartiallyGranted
                            ? `${grantedActions.length} of ${totalActions} Actions`
                            : "No Access"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleAllModuleActions(mod)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            hasAllActions
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                          }`}
                        >
                          {hasAllActions ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                    </div>

                    {/* Available Actions Row - ONLY logically available actions are rendered */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {available.length > 0 ? (
                        available.map((actDef) => {
                          const isActionActive = grantedActions.includes(actDef.action);

                          return (
                            <Tooltip
                              key={actDef.action}
                              content={`${actDef.label}: ${actDef.description}`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleModuleAction(mod.id, actDef.action)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none active:scale-95 ${
                                  isActionActive
                                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 ring-1 ring-amber-500/30 shadow-xs"
                                    : "bg-white dark:bg-[#161922] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                                }`}
                              >
                                <span
                                  className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                    isActionActive
                                      ? "bg-amber-500 text-slate-950 shadow-xs"
                                      : "bg-slate-200 dark:bg-slate-700 text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>
                                <span>{actDef.label}</span>
                              </button>
                            </Tooltip>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          No configurable actions defined for this module
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card Footer Summary */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Organization Modules Configured:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {activeModuleIds.length} of {availableModules.length} Modules Active • {totalActionsGranted} CRUD Permissions Granted
              </span>
            </div>
          </div>

          {/* CARD 4: ACCOUNT SECURITY */}
          <div className="rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Account Security
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set secure login credentials for this member.
                </p>
              </div>
            </div>

            {/* Password Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-xs sm:text-sm">
              {/* Password */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#171a24] border text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? "border-rose-400 focus:border-rose-500"
                        : "border-slate-200 dark:border-slate-800 focus:border-amber-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
                )}
              </div>
            </div>
          </div>

          {/* ACTIONS FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 active:scale-95 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Creating User...</span>
                </>
              ) : (
                <span>Create User</span>
              )}
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: CONTEXTUAL SIDEBAR (4 COLUMNS - STICKY) */}
        {/* ================================================================ */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
          {/* SIDEBAR CARD 1: ACCOUNT STATUS */}
          <div className="rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Account Status
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Control login ability
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                }`}
              >
                ● {isActive ? "Active User" : "Inactive"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#161824] border border-slate-200/70 dark:border-slate-800">
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {isActive ? "Account is Active" : "Account is Inactive"}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isActive
                    ? "User can sign in immediately"
                    : "Login blocked until activated"}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                  isActive ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SIDEBAR CARD 2: PERMITTED MODULES & ACTIONS */}
          <div className="rounded-2xl bg-[#fffbf2] dark:bg-[#171510] border border-amber-200/70 dark:border-amber-900/40 p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Permitted Modules
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live organization access matrix
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isCustomized
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                }`}
              >
                {isCustomized ? "⚡ Customized" : "🔒 Role Preset"}
              </span>
            </div>

            {/* Permissions Checklist */}
            <div className="space-y-2 mt-3 max-h-[380px] overflow-y-auto pr-1">
              {availableModules.map((mod) => {
                const allowedActions = activePermissions[mod.id] || [];
                const isPermitted = allowedActions.length > 0;
                const totalPossible = mod.availableActions?.length || 0;
                const isFull = totalPossible > 0 && allowedActions.length === totalPossible;

                return (
                  <div
                    key={mod.id}
                    className="flex flex-col gap-1 text-xs py-2 px-2.5 rounded-xl transition-colors hover:bg-amber-500/[0.04] border border-transparent hover:border-amber-200/40 dark:hover:border-amber-900/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isPermitted
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-slate-200 dark:bg-slate-800 text-transparent"
                          }`}
                        >
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                        <span
                          className={`font-semibold block truncate ${
                            isPermitted
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {mod.label}
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          !isPermitted
                            ? "bg-slate-200/50 dark:bg-slate-800/50 text-slate-400"
                            : isFull
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {!isPermitted
                          ? "No Access"
                          : isFull
                          ? "Full Access"
                          : `${allowedActions.length}/${totalPossible} Actions`}
                      </span>
                    </div>

                    {/* Action tags under module if permitted */}
                    {isPermitted && allowedActions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pl-6 pt-0.5">
                        {allowedActions.map((act) => (
                          <span
                            key={act}
                            className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300"
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Configured Access:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {activeModuleIds.length}/{availableModules.length} Modules • {totalActionsGranted} Actions
              </span>
            </div>
          </div>

          {/* SIDEBAR CARD 3: PASSWORD REQUIREMENTS */}
          <div className="rounded-2xl bg-[#f0f7ff] dark:bg-[#0c1424] border border-blue-200/70 dark:border-blue-900/40 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
              <Info className="h-4 w-4" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Password Policy
              </h3>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    passwordChecks.minLength
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-transparent"
                  }`}
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span
                  className={
                    passwordChecks.minLength
                      ? "text-slate-800 dark:text-slate-200 font-medium"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  Minimum 8 characters
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    passwordChecks.hasUpper
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-transparent"
                  }`}
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span
                  className={
                    passwordChecks.hasUpper
                      ? "text-slate-800 dark:text-slate-200 font-medium"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  At least one uppercase letter
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    passwordChecks.hasLower
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-transparent"
                  }`}
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span
                  className={
                    passwordChecks.hasLower
                      ? "text-slate-800 dark:text-slate-200 font-medium"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  At least one lowercase letter
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    passwordChecks.hasNumber
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-transparent"
                  }`}
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span
                  className={
                    passwordChecks.hasNumber
                      ? "text-slate-800 dark:text-slate-200 font-medium"
                      : "text-slate-500 dark:text-slate-400"
                  }
                >
                  At least one number
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
