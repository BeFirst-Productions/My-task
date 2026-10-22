"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Smartphone,
  Globe,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Contact,
  Trash2,
  ArrowLeft,
  Lock,
} from "lucide-react";
import {
  updateOrganisation,
  OrganisationApiError,
  type OrganisationListItem,
} from "@/services/organization.service";

export interface EditOrganisationViewProps {
  organisation: OrganisationListItem;
  onBack: () => void;
  onSuccess: () => void;
}

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

/**
 * Validates UAE mobile numbers.
 */
export function isValidUAEMobile(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^(?:(?:\+971|00971|0)?)(5[024568]\d{7}|5\d{8})$/.test(cleaned);
}

/**
 * Standardizes any accepted UAE mobile number to international E.164 format: +9715XXXXXXXX
 */
export function formatToUAE_E164(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+971")) {
    return cleaned;
  }
  if (cleaned.startsWith("00971")) {
    return `+971${cleaned.slice(5)}`;
  }
  if (cleaned.startsWith("0")) {
    return `+971${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("5")) {
    return `+971${cleaned}`;
  }
  return `+971${cleaned}`;
}

export function EditOrganisationView({
  organisation,
  onBack,
  onSuccess,
}: EditOrganisationViewProps) {
  const resolvedName = organisation.companyName || organisation.name || "";
  const existingLogo = organisation.logo || null;
  const existingDocument = organisation.document || (organisation as any).tradeLicenceDocument || null;
  const superAdmin = organisation.superAdmin;
  const notifConfig = organisation.notificationConfig;

  const [formData, setFormData] = useState({
    companyName: resolvedName,
    primaryLocation: organisation.primaryLocation || "Dubai",
    subdomain: organisation.subdomain || "",
    
    // Logo state
    logoName: existingLogo ? "Current Company Logo" : "",
    logoDataUrl: existingLogo || "",
    logoSize: "",
    isLogoRemoved: false,

    // Document state
    documentName: existingDocument ? "Current Verification Document" : "",
    documentDataUrl: existingDocument || "",
    documentSize: "",
    isDocumentRemoved: false,

    // Super Admin / Account Access
    email: superAdmin?.email || notifConfig?.notificationEmail || "",
    mobileNumber: superAdmin?.phoneNumber || notifConfig?.primaryWhatsAppNumber || "",
    superadminUsername: superAdmin?.username || "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverSuccessMessage, setServerSuccessMessage] = useState<string | null>(null);

  /**
   * Field-level validator
   */
  const validateField = (
    name: string,
    value: string,
    currentFormData = formData
  ): string | null => {
    switch (name) {
      case "companyName": {
        const trimmed = value.trim();
        if (!trimmed) return "Company Name is required.";
        if (trimmed.length < 2) return "Company Name must be at least 2 characters.";
        if (trimmed.length > 100) return "Company Name cannot exceed 100 characters.";
        return null;
      }
      case "primaryLocation": {
        if (!value) return "Please select a Primary Location (Emirate).";
        if (!EMIRATES.includes(value)) return "Please select a valid UAE Emirate.";
        return null;
      }
      case "email": {
        const trimmed = value.trim();
        if (!trimmed) return "Verified Email is required.";
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
          return "Please enter a valid email address (e.g. name@company.ae).";
        }
        return null;
      }
      case "mobileNumber": {
        const trimmed = value.trim();
        if (!trimmed) return "Mobile Number is required.";
        if (!isValidUAEMobile(trimmed)) {
          return "Please enter a valid UAE mobile number (e.g. 050 123 4567 or +971 50 123 4567).";
        }
        return null;
      }
      case "superadminUsername": {
        const trimmed = value.trim();
        if (!trimmed) return "Superadmin Username is required.";
        if (trimmed.length < 3) return "Username must be at least 3 characters.";
        if (trimmed.length > 30) return "Username cannot exceed 30 characters.";
        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
          return "Username can only contain alphanumeric characters, underscores, and hyphens.";
        }
        return null;
      }
      case "password": {
        if (!value) return null; // Optional on edit
        if (value.length < 8) return "New password must be at least 8 characters.";
        if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(value)) {
          return "New password must contain both letters and numbers.";
        }
        return null;
      }
      case "confirmPassword": {
        if (!currentFormData.password && !value) return null;
        if (currentFormData.password && !value) {
          return "Please confirm your new password.";
        }
        if (value !== currentFormData.password) {
          return "Passwords do not match.";
        }
        return null;
      }
      default:
        return null;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);

    if (touched[name]) {
      const fieldError = validateField(name, value, nextFormData);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError || "",
      }));

      if (name === "password" && touched.confirmPassword) {
        const confirmError = validateField(
          "confirmPassword",
          formData.confirmPassword,
          nextFormData
        );
        setErrors((prev) => ({
          ...prev,
          confirmPassword: confirmError || "",
        }));
      }
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError || "",
    }));
  };

  /**
   * Handle Logo File Upload (PNG, JPG, SVG, WebP)
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        logo: "Please upload an image file (PNG, JPG, SVG, or WebP).",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        logo: "Logo file size cannot exceed 5MB.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      setFormData((prev) => ({
        ...prev,
        logoName: file.name,
        logoDataUrl: dataUrl,
        logoSize: sizeFormatted,
        isLogoRemoved: false,
      }));
      setErrors((prev) => ({ ...prev, logo: "" }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoName: "",
      logoDataUrl: "",
      logoSize: "",
      isLogoRemoved: true,
    }));
  };

  /**
   * Handle Verification Document Upload
   */
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        document: "Document file size cannot exceed 10MB.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      setFormData((prev) => ({
        ...prev,
        documentName: file.name,
        documentDataUrl: dataUrl,
        documentSize: sizeFormatted,
        isDocumentRemoved: false,
      }));
      setErrors((prev) => ({ ...prev, document: "" }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = () => {
    setFormData((prev) => ({
      ...prev,
      documentName: "",
      documentDataUrl: "",
      documentSize: "",
      isDocumentRemoved: true,
    }));
  };

  /**
   * Submit changes
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setServerSuccessMessage(null);

    // Validate required fields
    const allTouched = {
      companyName: true,
      primaryLocation: true,
      email: true,
      mobileNumber: true,
      superadminUsername: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(allTouched);

    const newErrors: Record<string, string> = {};
    Object.keys(allTouched).forEach((field) => {
      const err = validateField(field, (formData as any)[field], formData);
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage("Please fix the validation errors marked in red below.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPhone = formatToUAE_E164(formData.mobileNumber.trim());

      // Prepare payload
      const payload: any = {
        companyName: formData.companyName.trim(),
        primaryLocation: formData.primaryLocation,
        email: formData.email.trim(),
        mobileNumber: formattedPhone,
        superadminUsername: formData.superadminUsername.trim(),
      };

      // Handle logo
      if (formData.isLogoRemoved) {
        payload.logo = null;
      } else if (formData.logoDataUrl && formData.logoDataUrl.startsWith("data:")) {
        payload.logo = formData.logoDataUrl;
      }

      // Handle document
      if (formData.isDocumentRemoved) {
        payload.document = null;
      } else if (formData.documentDataUrl && formData.documentDataUrl.startsWith("data:")) {
        payload.document = formData.documentDataUrl;
      }

      // Handle password if entered
      if (formData.password && formData.password.trim().length >= 8) {
        payload.password = formData.password.trim();
        payload.confirmPassword = formData.confirmPassword.trim();
      }

      const response = await updateOrganisation(organisation.id, payload);

      setServerSuccessMessage(
        response.message || "Organisation profile and administrator details updated successfully!"
      );

      // Notify parent after brief delay to allow viewing the success state
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: unknown) {
      console.error("Organisation update failed:", err);
      if (err instanceof OrganisationApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while saving organisation changes.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPhoneValid = isValidUAEMobile(formData.mobileNumber);

  return (
    <div className="w-full min-h-screen py-4 sm:py-6 px-2 sm:px-4">
      {/* Top Back Navigation Bar */}
      <div className="w-full max-w-6xl mx-auto mb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#232733] bg-[#12141a] hover:bg-[#1a1e2c] text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm group"
        >
          <ArrowLeft className="h-4 w-4 text-amber-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Organisations Listing</span>
        </button>
      </div>

      {/* Main Card - Exact same style and container as CreateOrganisationView */}
      <div className="w-full max-w-6xl mx-auto bg-[#11131a] rounded-3xl shadow-2xl border border-[#222736] p-6 sm:p-10 lg:p-12 text-slate-100">
        {/* Header Icon & Title */}
        <div className="text-center mb-9">
          <div className="w-14 h-14 rounded-2xl bg-[#800020] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#800020]/30 border border-[#991b1b]/30">
            <Contact className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Edit Organisation Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-normal">
            Update business details, verification documents, and administrator credentials for{" "}
            <span className="text-amber-400 font-semibold">{resolvedName}</span>.
          </p>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Global Server Success Alert */}
        {serverSuccessMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">{serverSuccessMessage}</span>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* ==================================================== */}
          {/* SECTION 1: BUSINESS INFORMATION */}
          {/* ==================================================== */}
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#222736]">
              <Building2 className="h-5 w-5 text-slate-300" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Business Information
              </h2>
            </div>

            {/* 2-Column Row: Company Name & Primary Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Company Name */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Company Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="e.g. Al Qusais Typing"
                  className={`w-full h-11 px-3.5 rounded-lg border bg-[#161924] text-white text-sm placeholder:text-slate-500 focus:outline-none transition-all ${
                    touched.companyName && errors.companyName
                      ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      : "border-[#2a3042] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/25"
                  }`}
                  required
                />
                {touched.companyName && errors.companyName && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.companyName}</span>
                  </p>
                )}
              </div>

              {/* Primary Location */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Primary Location <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  name="primaryLocation"
                  value={formData.primaryLocation}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={`w-full h-11 px-3.5 rounded-lg border bg-[#161924] text-white text-sm focus:outline-none transition-all cursor-pointer [color-scheme:dark] ${
                    touched.primaryLocation && errors.primaryLocation
                      ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      : "border-[#2a3042] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/25"
                  }`}
                  required
                >
                  <option value="" disabled className="bg-[#161924] text-slate-400">
                    Select Emirate
                  </option>
                  {EMIRATES.map((emirate) => (
                    <option key={emirate} value={emirate} className="bg-[#161924] text-white">
                      {emirate}
                    </option>
                  ))}
                </select>
                {touched.primaryLocation && errors.primaryLocation && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.primaryLocation}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Software Subdomain (Read Only with explanation) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                  Software Subdomain
                </label>
                <span className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Fixed (Linked to Dedicated Database)</span>
                </span>
              </div>
              <div className="flex h-11 rounded-lg border border-[#242938] bg-[#0c0e14] overflow-hidden opacity-90">
                <span className="inline-flex items-center pl-3.5 pr-2 bg-[#0c0e14] text-slate-500 select-none">
                  <Globe className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={formData.subdomain}
                  readOnly
                  disabled
                  className="flex-1 bg-[#0c0e14] px-2 text-sky-400 font-mono text-sm font-semibold cursor-not-allowed select-all focus:outline-none"
                />
                <span className="inline-flex items-center px-4 bg-[#141720] border-l border-[#242938] text-xs sm:text-sm text-slate-400 font-medium select-none">
                  .mytask.com
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-normal">
                Subdomain cannot be changed because it is linked to the provisioned tenant database (<code>{organisation.databaseName || `tenant_${organisation.subdomain}`}</code>).
              </p>
            </div>

            {/* Upload Fields: Logo & Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              {/* Logo Upload Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Company Logo
                </label>
                {formData.logoDataUrl && !formData.isLogoRemoved ? (
                  <div className="rounded-2xl border border-[#2d3448] bg-[#161924] p-3.5 space-y-3 shadow-inner animate-in fade-in zoom-in-95 duration-150">
                    {/* Visual Image Preview Box */}
                    <div className="relative w-full h-36 rounded-xl bg-[#0c0e14] border border-[#242938] flex items-center justify-center p-3 overflow-hidden group">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
                      <img
                        src={formData.logoDataUrl}
                        alt="Company Logo Preview"
                        className="max-h-full max-w-full object-contain relative z-10 transition-transform group-hover:scale-105 duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white backdrop-blur-sm transition-all z-20 shadow-md"
                        title="Delete logo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Image Meta & Action Controls */}
                    <div className="flex items-center justify-between gap-2.5 pt-0.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate" title={formData.logoName}>
                          {formData.logoName || "Company Logo"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {formData.logoSize ? (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formData.logoSize}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-400 font-medium">
                              Bunny CDN Active
                            </span>
                          )}
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ready</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Change Logo */}
                        <label className="px-3 py-1.5 rounded-lg border border-[#303648] hover:border-slate-400 bg-[#1c202e] hover:bg-[#23283a] text-xs font-semibold text-slate-200 hover:text-white cursor-pointer transition-all">
                          <span>Change</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Explicit Delete Button */}
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#2d3448] hover:border-[#800020] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#161924]/60 hover:bg-[#1a1e2c] transition-all text-center group">
                    <div className="p-3 rounded-full bg-[#1e2333] text-slate-400 group-hover:text-white transition-colors">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Click to upload logo
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PNG, JPG, SVG, WebP (Max 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Document Upload Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Verification Document Upload
                </label>
                {formData.documentDataUrl && !formData.isDocumentRemoved ? (
                  <div className="rounded-2xl border border-[#2d3448] bg-[#161924] p-3.5 space-y-3 shadow-inner animate-in fade-in zoom-in-95 duration-150">
                    {/* Document Preview Box */}
                    <div className="relative w-full h-36 rounded-xl bg-[#0c0e14] border border-[#242938] flex flex-col items-center justify-center p-3 text-center overflow-hidden">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1.5">
                        <FileText className="h-8 w-8" />
                      </div>
                      <p className="text-xs font-bold text-white max-w-[90%] truncate">
                        {formData.documentName || "Verification Document"}
                      </p>

                      {/* If existing HTTP link, allow viewing in Bunny CDN */}
                      {formData.documentDataUrl.startsWith("http") && (
                        <a
                          href={formData.documentDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-[11px] text-amber-400 hover:text-white hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Open in Bunny CDN</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={removeDocument}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white backdrop-blur-sm transition-all z-20 shadow-md"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Document Meta & Action Controls */}
                    <div className="flex items-center justify-between gap-2.5 pt-0.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate" title={formData.documentName}>
                          {formData.documentName}
                        </p>
                        {formData.documentSize ? (
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                            {formData.documentSize}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
                            Uploaded &amp; Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Change Document */}
                        <label className="px-3 py-1.5 rounded-lg border border-[#303648] hover:border-slate-400 bg-[#1c202e] hover:bg-[#23283a] text-xs font-semibold text-slate-200 hover:text-white cursor-pointer transition-all">
                          <span>Change</span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={handleDocumentUpload}
                            className="hidden"
                          />
                        </label>

                        {/* Explicit Delete Button */}
                        <button
                          type="button"
                          onClick={removeDocument}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#2d3448] hover:border-[#800020] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#161924]/60 hover:bg-[#1a1e2c] transition-all text-center group">
                    <div className="p-3 rounded-full bg-[#1e2333] text-slate-400 group-hover:text-white transition-colors">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Click to upload verification document
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PDF, JPG, PNG, DOC (Max 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION 2: ACCOUNT ACCESS */}
          {/* ==================================================== */}
          <div className="space-y-6 pt-2">
            {/* Section Header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#222736]">
              <Smartphone className="h-5 w-5 text-slate-300" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Account Access
              </h2>
            </div>

            {/* 2-Column Row: Verified Email & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Verified Email */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Verified Email <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="name@company.com"
                  className={`w-full h-11 px-3.5 rounded-lg border bg-[#161924] text-white text-sm placeholder:text-slate-500 focus:outline-none transition-all ${
                    touched.email && errors.email
                      ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      : "border-[#2a3042] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/25"
                  }`}
                  required
                />
                {touched.email && errors.email && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Mobile Number - with UAE validation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                    Mobile Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    🇦🇪 UAE Mobile
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="e.g. 050 123 4567 or +971 50 123 4567"
                    className={`w-full h-11 pl-3.5 pr-9 rounded-lg border bg-[#161924] text-white text-sm placeholder:text-slate-500 focus:outline-none transition-all ${
                      touched.mobileNumber && errors.mobileNumber
                        ? "border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : isPhoneValid && formData.mobileNumber.trim().length >= 9
                        ? "border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        : "border-[#2a3042] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/25"
                    }`}
                    required
                  />
                  {isPhoneValid && formData.mobileNumber.trim().length >= 9 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" title="Valid UAE Number">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {touched.mobileNumber && errors.mobileNumber ? (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.mobileNumber}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                    Accepts 05XXXXXXXX, 5XXXXXXXX, or +9715XXXXXXXX (e.g. 050, 052, 054, 055, 056, 058).
                  </p>
                )}
              </div>
            </div>

            {/* Superadmin Username */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                Superadmin Username <span className="text-rose-500 font-bold">*</span>
              </label>
              <div
                className={`flex h-11 rounded-lg border bg-[#161924] overflow-hidden transition-all ${
                  touched.superadminUsername && errors.superadminUsername
                    ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20"
                    : "border-[#2a3042] focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#800020]/25"
                }`}
              >
                <span className="inline-flex items-center px-3.5 bg-[#161924] text-slate-400 select-none">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  name="superadminUsername"
                  autoComplete="off"
                  value={formData.superadminUsername}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Superadmin username"
                  className="flex-1 bg-[#161924] pr-3.5 text-white text-sm placeholder:text-slate-500 focus:outline-none"
                  required
                />
              </div>
              {touched.superadminUsername && errors.superadminUsername && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.superadminUsername}</span>
                </p>
              )}
            </div>

            {/* 2-Column Row: Password & Confirm Password (Optional on Edit) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                    New Password
                  </label>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (Optional - leave blank to keep unchanged)
                  </span>
                </div>
                <div
                  className={`relative flex h-11 rounded-lg border bg-[#161924] overflow-hidden transition-all ${
                    touched.password && errors.password
                      ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20"
                      : "border-[#2a3042] focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#800020]/25"
                  }`}
                >
                  <span className="inline-flex items-center pl-3.5 pr-2 bg-[#161924] text-slate-400 select-none">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Enter new password to change"
                    className="flex-1 bg-[#161924] pr-10 text-white text-sm placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {touched.password && errors.password ? (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.password}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1 font-normal">
                    If changing: min 8 characters with letters &amp; numbers.
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Confirm New Password
                </label>
                <div
                  className={`relative flex h-11 rounded-lg border bg-[#161924] overflow-hidden transition-all ${
                    touched.confirmPassword && errors.confirmPassword
                      ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20"
                      : "border-[#2a3042] focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#800020]/25"
                  }`}
                >
                  <span className="inline-flex items-center pl-3.5 pr-2 bg-[#161924] text-slate-400 select-none">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Repeat new password"
                    className="flex-1 bg-[#161924] pr-10 text-white text-sm placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.confirmPassword}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* ACTIONS (CANCEL & SAVE CHANGES) */}
          {/* ==================================================== */}
          <div className="pt-6 border-t border-[#222736] flex items-center justify-between">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full border border-[#303648] text-slate-300 font-semibold text-sm hover:bg-[#1a1e2c] hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
            >
              Cancel &amp; Return
            </button>

            {/* Save Changes Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-full bg-[#800020] hover:bg-[#991b1b] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-[#800020]/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
