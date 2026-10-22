"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Settings,
  Shield,
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
} from "lucide-react";
import { createTenantUser, type CreateTenantUserPayload } from "@/services/user.service";

interface OrgCreateUserViewProps {
  orgName: string;
  orgSubdomain: string;
  onBack: () => void;
  onSuccess: () => void;
}

type RoleType = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";

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

const DEPARTMENTS = [
  "Operations",
  "Business Consulting",
  "Client Relations",
  "Finance & Accounts",
  "Legal & Compliance",
  "Human Resources",
  "Technology & Support",
];

const ALL_PERMISSIONS = [
  { id: "dashboard", label: "Dashboard Access" },
  { id: "clients", label: "Client Management" },
  { id: "tasks", label: "Task Management" },
  { id: "documents", label: "Document Management" },
  { id: "alerts", label: "Alerts Management" },
  { id: "invoices", label: "Invoice Management" },
  { id: "users", label: "User Management" },
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
  const [department, setDepartment] = useState("Operations");
  const [isActive, setIsActive] = useState(true);

  // Role state
  const [selectedRole, setSelectedRole] = useState<RoleType>("SUPER_ADMIN");

  // Passwords
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live password requirement checks
  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  }, [password]);

  // Permissions calculation based on selected role
  const permissionsAllowed = useMemo(() => {
    switch (selectedRole) {
      case "SUPER_ADMIN":
        return ["dashboard", "clients", "tasks", "documents", "alerts", "invoices", "users"];
      case "ADMIN":
        return ["dashboard", "clients", "tasks", "documents", "alerts", "invoices", "users"];
      case "MANAGER":
        return ["dashboard", "clients", "tasks", "documents", "alerts"];
      case "EMPLOYEE":
        return ["dashboard", "tasks", "documents"];
      default:
        return ["dashboard", "tasks"];
    }
  }, [selectedRole]);

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
      // Map UI role to backend role & designation
      let backendRole: "SUPER_ADMIN" | "ADMIN" | "STAFF" = "STAFF";
      let designation = "Employee";

      if (selectedRole === "SUPER_ADMIN") {
        backendRole = "SUPER_ADMIN";
        designation = "Super Admin";
      } else if (selectedRole === "ADMIN") {
        backendRole = "ADMIN";
        designation = "Administrator";
      } else if (selectedRole === "MANAGER") {
        backendRole = "ADMIN";
        designation = "Team Manager";
      } else {
        backendRole = "STAFF";
        designation = "Executive";
      }

      const fullPhone = `${dialCode} ${phoneNumber.trim()}`;

      const payload: CreateTenantUserPayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: fullPhone,
        password,
        role: backendRole,
        status: isActive ? "ACTIVE" : "INACTIVE",
        department,
        designation,
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
            Add a new user to your organisation with appropriate role and permissions.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================================================================ */}
        {/* SECTION 1: BASIC INFORMATION (75%) & STATUS (25%) */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Basic Information Card */}
          <div className="lg:col-span-9 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Basic Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the user's basic details.
                </p>
              </div>
            </div>

            {/* Inputs Grid */}
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

              {/* Phone Number with UAE Flag prefix */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500 overflow-hidden transition-all">
                  <div className="flex items-center gap-1 px-3 py-2.5 bg-slate-50 dark:bg-[#1a1e2b] border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs shrink-0">
                    <span className="text-base">🇦🇪</span>
                    <span>{dialCode}</span>
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 appearance-none transition-all cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Status Card */}
          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full min-h-[220px]">
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Settings className="h-5 w-5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Status
                </h3>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                    isActive ? "bg-[#c25e00] dark:bg-amber-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6 leading-relaxed">
              Inactive users will not be able to login to the system.
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SECTION 2: ROLE & ACCESS (65%) & ROLE PERMISSIONS (35%) */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Role & Access Card */}
          <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Role & Access
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select user role and access level. Permissions will be automatically assigned based on the selected role.
                  </p>
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="mb-6 max-w-md">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm mb-1.5">
                  Role <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as RoleType)}
                    className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#171a24] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 appearance-none transition-all cursor-pointer"
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 4 Role Selection Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Super Admin */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("SUPER_ADMIN")}
                  className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    selectedRole === "SUPER_ADMIN"
                      ? "border-amber-500 bg-[#fffdf7] dark:bg-[#1a1711] ring-1 ring-amber-500/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#151722]/50 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Crown className="h-6 w-6 text-amber-500 mb-2" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Super Admin
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Full system access
                  </span>
                </button>

                {/* 2. Admin */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("ADMIN")}
                  className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    selectedRole === "ADMIN"
                      ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#151722]/50 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Building2 className="h-6 w-6 text-blue-500 mb-2" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Admin
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Office-wide management
                  </span>
                </button>

                {/* 3. Manager */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("MANAGER")}
                  className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    selectedRole === "MANAGER"
                      ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#151722]/50 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Users className="h-6 w-6 text-blue-500 mb-2" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Manager
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Team and task oversight
                  </span>
                </button>

                {/* 4. Employee */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("EMPLOYEE")}
                  className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    selectedRole === "EMPLOYEE"
                      ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-500/40 shadow-sm"
                      : "border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#151722]/50 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <User className="h-6 w-6 text-blue-500 mb-2" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Employee
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Limited access
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Role Permissions Card */}
          <div className="lg:col-span-4 rounded-2xl bg-[#fffbf2] dark:bg-[#171510] border border-amber-200/70 dark:border-amber-900/40 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Role Permissions
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Permissions will be set automatically based on the selected role.
                  </p>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-2.5 mt-4">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = permissionsAllowed.includes(perm.id);

                  return (
                    <div key={perm.id} className="flex items-center gap-2.5 text-xs sm:text-sm">
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-[#c25e00] dark:bg-amber-500 text-white"
                            : "bg-slate-200 dark:bg-slate-800 text-transparent"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                      <span
                        className={`font-medium ${
                          isChecked
                            ? "text-slate-800 dark:text-slate-200"
                            : "text-slate-400 dark:text-slate-600 line-through"
                        }`}
                      >
                        {perm.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SECTION 3: ACCOUNT DETAILS (65%) & PASSWORD REQUIREMENTS (35%) */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Account Details Card */}
          <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Account Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set login credentials for the user.
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
          </div>

          {/* Right: Password Requirements Card */}
          <div className="lg:col-span-4 rounded-2xl bg-[#f0f7ff] dark:bg-[#0c1424] border border-blue-200/70 dark:border-blue-900/40 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                <Info className="h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Password Requirements
                </h3>
              </div>

              {/* Requirements Checklist */}
              <div className="space-y-2 mt-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      passwordChecks.minLength
                        ? "bg-blue-600 text-white"
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
                        ? "bg-blue-600 text-white"
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
                        ? "bg-blue-600 text-white"
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
                        ? "bg-blue-600 text-white"
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
        </div>

        {/* ================================================================ */}
        {/* BOTTOM ACTIONS BAR */}
        {/* ================================================================ */}
        <div className="flex items-center justify-end gap-3 pt-3">
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
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#c25e00] hover:bg-[#a85200] active:scale-95 transition-all shadow-md shadow-amber-900/20 disabled:opacity-50"
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
      </form>
    </div>
  );
}
