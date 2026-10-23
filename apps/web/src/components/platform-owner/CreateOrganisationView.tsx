"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  X,
  FileText,
  Image as ImageIcon,
  Check,
  Database,
  ExternalLink,
  Contact,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import {
  createOrganisation,
  OrganisationApiError,
  type CreatedOrganisationData,
} from "@/services/organization.service";

export interface CreateOrganisationViewProps {
  onBack?: () => void;
  onSuccess?: () => void;
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

const INITIAL_FORM_STATE = {
  // Business Information
  companyName: "",
  primaryLocation: "",
  subdomain: "",
  logoName: "",
  logoDataUrl: "",
  logoSize: "",
  documentName: "",
  documentDataUrl: "",
  documentSize: "",

  // Account Access
  email: "",
  mobileNumber: "",
  superadminUsername: "",
  password: "",
  confirmPassword: "",
};

/**
 * Validates UAE mobile numbers.
 * Valid ranges include:
 * - Local formats: 050, 052, 054, 055, 056, 058 (10 digits starting with 05)
 * - Without leading 0: 50, 52, 54, 55, 56, 58 (9 digits starting with 5)
 * - International formats: +971 5X XXX XXXX or 00971 5X XXX XXXX
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

export function CreateOrganisationView({
  onBack,
  onSuccess,
}: CreateOrganisationViewProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverSuccessMessage, setServerSuccessMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreatedOrganisationData | null>(null);

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
      case "subdomain": {
        const trimmed = value.trim();
        if (!trimmed) return "Software Subdomain is required.";
        if (trimmed.length < 3) return "Subdomain must be at least 3 characters.";
        if (trimmed.length > 30) return "Subdomain cannot exceed 30 characters.";
        if (!/^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/.test(trimmed)) {
          return "Subdomain must contain only lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).";
        }
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
          return "Username can only contain letters, numbers, underscores, and dashes.";
        }
        return null;
      }
      case "password": {
        if (!value) return "Password is required.";
        if (value.length < 8) return "Password must be at least 8 characters long.";
        if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
          return "Password must contain both letters and numbers.";
        }
        return null;
      }
      case "confirmPassword": {
        if (!value) return "Please repeat your password.";
        if (value !== currentFormData.password) return "Passwords do not match.";
        return null;
      }
      case "logo": {
        if (!currentFormData.logoDataUrl && !currentFormData.logoName) {
          return "Company Logo is required.";
        }
        return null;
      }
      case "document": {
        if (!currentFormData.documentDataUrl && !currentFormData.documentName) {
          return "Verification Document is required.";
        }
        return null;
      }
      default:
        return null;
    }
  };

  /**
   * Validate entire form
   */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const fieldsToValidate = [
      "companyName",
      "primaryLocation",
      "subdomain",
      "logo",
      "document",
      "email",
      "mobileNumber",
      "superadminUsername",
      "password",
      "confirmPassword",
    ];

    fieldsToValidate.forEach((field) => {
      const error = validateField(field, (formData as any)[field], formData);
      if (error) {
        newErrors[field] = error;
      }
    });

    return newErrors;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let updatedValue = value;

    if (name === "subdomain") {
      updatedValue = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }

    const updatedFormData = { ...formData, [name]: updatedValue };
    setFormData(updatedFormData);

    // If field has been touched, validate on the fly
    if (touched[name]) {
      const error = validateField(name, updatedValue, updatedFormData);
      setErrors((prev) => {
        const copy = { ...prev };
        if (error) {
          copy[name] = error;
        } else {
          delete copy[name];
        }
        return copy;
      });
    }

    // Special case: if password changed, re-validate confirmPassword if touched
    if (name === "password" && touched.confirmPassword) {
      const confirmErr = validateField(
        "confirmPassword",
        formData.confirmPassword,
        updatedFormData
      );
      setErrors((prev) => {
        const copy = { ...prev };
        if (confirmErr) {
          copy.confirmPassword = confirmErr;
        } else {
          delete copy.confirmPassword;
        }
        return copy;
      });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value, formData);
    setErrors((prev) => {
      const copy = { ...prev };
      if (error) {
        copy[name] = error;
      } else {
        delete copy[name];
      }
      return copy;
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setErrorMessage(null);

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Company Logo file size exceeds 5MB. Please choose a smaller file.");
        return;
      }

      // Validate image mime type
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("Invalid logo format. Please upload a PNG, JPG, WebP, or SVG image.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          logoName: file.name,
          logoDataUrl: reader.result as string,
          logoSize: formatBytes(file.size),
        }));
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.logo;
          return copy;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoName: "",
      logoDataUrl: "",
      logoSize: "",
    }));
    if (touched.logo) {
      setErrors((prev) => ({
        ...prev,
        logo: "Company Logo is required.",
      }));
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setErrorMessage(null);

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Document file size exceeds 10MB. Please choose a smaller file.");
        return;
      }

      // Validate extension
      if (!/\.(pdf|png|jpe?g|docx?)$/i.test(file.name)) {
        setErrorMessage("Invalid document format. Please upload a PDF, JPG, PNG, or DOC file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({
          ...prev,
          documentName: file.name,
          documentDataUrl: reader.result as string,
          documentSize: formatBytes(file.size),
        }));
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.document;
          return copy;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocument = () => {
    setFormData((prev) => ({
      ...prev,
      documentName: "",
      documentDataUrl: "",
      documentSize: "",
    }));
    if (touched.document) {
      setErrors((prev) => ({
        ...prev,
        document: "Verification Document is required.",
      }));
    }
  };

  const handleClearForm = (preserveSuccess = false) => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setTouched({});
    setErrorMessage(null);
    if (!preserveSuccess) {
      setServerSuccessMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setServerSuccessMessage(null);

    // Mark all required fields as touched
    const allTouched: Record<string, boolean> = {
      companyName: true,
      primaryLocation: true,
      subdomain: true,
      logo: true,
      document: true,
      email: true,
      mobileNumber: true,
      superadminUsername: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(allTouched);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      setErrorMessage(firstError || "Please correct all highlighted fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Standardize UAE mobile number to +971 format
      const formattedPhone = formatToUAE_E164(formData.mobileNumber.trim());

      const payload = {
        companyDetails: {
          companyName: formData.companyName.trim(),
          name: formData.companyName.trim(),
          primaryLocation: formData.primaryLocation,
          subdomain: formData.subdomain.trim(),
          logo: formData.logoDataUrl || undefined,
          document: formData.documentDataUrl || formData.documentName || undefined,
        },
        superAdminDetails: {
          fullName: formData.superadminUsername.trim(),
          email: formData.email.trim(),
          phoneNumber: formattedPhone,
          username: formData.superadminUsername.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        },
      };

      const result = await createOrganisation(payload);
      handleClearForm(true);
      setCreatedResult(result.data);
      setServerSuccessMessage(
        result.message || "Organisation and Super Admin account created successfully."
      );
      setErrorMessage(null);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      if (err instanceof OrganisationApiError) {
        // Map backend Zod validation error fields to local form inputs
        if (err.details && err.details.length > 0) {
          const fieldMap: Record<string, string> = {
            "companyDetails.companyName": "companyName",
            "companyDetails.name": "companyName",
            "companyDetails.primaryLocation": "primaryLocation",
            "companyDetails.subdomain": "subdomain",
            "companyDetails.logo": "logo",
            "companyDetails.document": "document",
            "superAdminDetails.email": "email",
            "superAdminDetails.phoneNumber": "mobileNumber",
            "superAdminDetails.username": "superadminUsername",
            "superAdminDetails.password": "password",
            "superAdminDetails.confirmPassword": "confirmPassword",
          };

          const newErrors: Record<string, string> = {};
          err.details.forEach((issue) => {
            const mapped = fieldMap[issue.field] || issue.field;
            newErrors[mapped] = issue.message;
          });

          setErrors((prev) => ({ ...prev, ...newErrors }));
        }

        // Map conflict errors to specific fields
        if (err.errorType === "ConflictError" || err.statusCode === 409) {
          const lower = err.message.toLowerCase();
          if (lower.includes("subdomain")) {
            setErrors((prev) => ({
              ...prev,
              subdomain: "This subdomain is already registered by another organisation.",
            }));
          }
          if (lower.includes("company name")) {
            setErrors((prev) => ({
              ...prev,
              companyName: "An organisation with this Company Name already exists.",
            }));
          }
          if (lower.includes("email")) {
            setErrors((prev) => ({
              ...prev,
              email: "A superadmin with this email address is already registered.",
            }));
          }
          if (lower.includes("username")) {
            setErrors((prev) => ({
              ...prev,
              superadminUsername: "This username is already taken. Please choose another.",
            }));
          }
        }
      }

      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPhoneValid = isValidUAEMobile(formData.mobileNumber);

  return (
    <div className="w-full min-h-screen py-4 sm:py-6 px-2 sm:px-4">
      {/* Main Card - Dark Theme & Expanded Width */}
      <div className="w-full max-w-6xl mx-auto bg-[#11131a] rounded-3xl shadow-2xl border border-[#222736] p-6 sm:p-10 lg:p-12 text-slate-100">
        {/* Header Icon & Title */}
        <div className="text-center mb-9">
          <div className="w-14 h-14 rounded-2xl bg-[#800020] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#800020]/30 border border-[#991b1b]/30">
            <Contact className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-normal">
            Enter your business details below to finalize your software setup.
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
            <button
              type="button"
              onClick={() => setServerSuccessMessage(null)}
              className="text-xs text-emerald-400 hover:text-white underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Registration Form */}
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

            {/* Software Subdomain */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                Software Subdomain <span className="text-rose-500 font-bold">*</span>
              </label>
              <div
                className={`flex h-11 rounded-lg border bg-[#161924] overflow-hidden transition-all ${
                  touched.subdomain && errors.subdomain
                    ? "border-rose-500 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20"
                    : "border-[#2a3042] focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#800020]/25"
                }`}
              >
                <span className="inline-flex items-center pl-3.5 pr-2 bg-[#161924] text-slate-400 select-none">
                  <Globe className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="yourcompany"
                  className="flex-1 bg-[#161924] px-2 text-white text-sm font-medium placeholder:text-slate-500 focus:outline-none"
                  required
                />
                <span className="inline-flex items-center px-4 bg-[#1d2232] border-l border-[#2a3042] text-xs sm:text-sm text-slate-300 font-medium select-none">
                  .mytask.com
                </span>
              </div>
              {touched.subdomain && errors.subdomain ? (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.subdomain}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1.5 font-normal">
                  Choose a unique web address for your agency dashboard (lowercase alphanumeric and hyphens).
                </p>
              )}
            </div>

            {/* Upload Fields: Logo & Document */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
              {/* Logo Upload Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Company Logo <span className="text-rose-500">*</span>
                </label>
                {formData.logoDataUrl ? (
                  <div className="rounded-2xl border border-[#2d3448] bg-[#161924] p-3.5 space-y-3 shadow-inner animate-in fade-in zoom-in-95 duration-150">
                    {/* Visual Image Preview Box */}
                    <div className="relative w-full h-36 rounded-xl bg-[#0c0e14] border border-[#242938] flex items-center justify-center p-3 overflow-hidden group">
                      {/* Subtle checkerboard overlay for contrast */}
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
                      <img
                        src={formData.logoDataUrl}
                        alt="Company Logo Preview"
                        className="max-h-full max-w-full object-contain relative z-10 transition-transform group-hover:scale-105 duration-200"
                      />
                      {/* Quick delete button in corner */}
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
                          {formData.logoSize && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formData.logoSize}
                            </span>
                          )}
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Preview Ready</span>
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
                  <label
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group ${
                      touched.logo && errors.logo
                        ? "border-rose-500/60 bg-rose-500/5 hover:border-rose-400"
                        : "border-[#2d3448] hover:border-[#800020] bg-[#161924]/60 hover:bg-[#1a1e2c]"
                    }`}
                  >
                    <div className={`p-3 rounded-full transition-colors ${
                      touched.logo && errors.logo
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-[#1e2333] text-slate-400 group-hover:text-white"
                    }`}>
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
                {touched.logo && errors.logo && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.logo}</span>
                  </p>
                )}
              </div>

              {/* Document Upload Field */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Verification Document Upload <span className="text-rose-500">*</span>
                </label>
                {formData.documentName ? (
                  <div className="rounded-2xl border border-[#2d3448] bg-[#161924] p-3.5 space-y-3 shadow-inner animate-in fade-in zoom-in-95 duration-150">
                    {/* Document Preview Box */}
                    <div className="relative w-full h-36 rounded-xl bg-[#0c0e14] border border-[#242938] flex flex-col items-center justify-center p-3 text-center overflow-hidden">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1.5">
                        <FileText className="h-8 w-8" />
                      </div>
                      <p className="text-xs font-bold text-white max-w-[90%] truncate">
                        {formData.documentName}
                      </p>
                     
                      {/* Quick delete button in corner */}
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
                        {formData.documentSize && (
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                            {formData.documentSize}
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
                  <label
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group ${
                      touched.document && errors.document
                        ? "border-rose-500/60 bg-rose-500/5 hover:border-rose-400"
                        : "border-[#2d3448] hover:border-[#800020] bg-[#161924]/60 hover:bg-[#1a1e2c]"
                    }`}
                  >
                    <div className={`p-3 rounded-full transition-colors ${
                      touched.document && errors.document
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-[#1e2333] text-slate-400 group-hover:text-white"
                    }`}>
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
                {touched.document && errors.document && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.document}</span>
                  </p>
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
                  placeholder="Choose a username"
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

            {/* 2-Column Row: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Password <span className="text-rose-500 font-bold">*</span>
                </label>
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
                    placeholder="At least 8 chars (letters & numbers)"
                    className="flex-1 bg-[#161924] pr-10 text-white text-sm placeholder:text-slate-500 focus:outline-none"
                    required
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
                    Min 8 characters, must include letters and numbers.
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-2">
                  Confirm Password <span className="text-rose-500 font-bold">*</span>
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
                    placeholder="Repeat password"
                    className="flex-1 bg-[#161924] pr-10 text-white text-sm placeholder:text-slate-500 focus:outline-none"
                    required
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
          {/* ACTIONS (CLEAR FORM & CREATE ACCOUNT) */}
          {/* ==================================================== */}
          <div className="pt-6 border-t border-[#222736] flex items-center justify-between">
            {/* Clear Form Button */}
            <button
              type="button"
              onClick={() => handleClearForm()}
              className="px-6 py-2.5 rounded-full border border-[#303648] text-slate-300 font-semibold text-sm hover:bg-[#1a1e2c] hover:text-white hover:border-slate-500 transition-colors"
            >
              Clear Form
            </button>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-full bg-[#800020] hover:bg-[#991b1b] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-[#800020]/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================== */}
      {/* SUCCESS MODAL: PROVISIONED DATABASE INFO */}
      {/* ==================================================== */}
      {createdResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-[#12141a] border border-[#2d3448] rounded-3xl max-w-lg w-full p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <button
              type="button"
              onClick={() => setCreatedResult(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1a1e2c] transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3.5 pr-8">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Organisation Successfully Created!
                </h3>
                <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{serverSuccessMessage || "Organisation and Super Admin account created successfully."}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  A dedicated database and Superadmin account have been provisioned.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161924] border border-[#242938] space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#242938]">
                <span className="text-slate-400">Company Name:</span>
                <span className="font-semibold text-white">
                  {createdResult.organisation?.companyName || createdResult.organisation?.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#242938]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-amber-500" />
                  <span>Dedicated Database:</span>
                </span>
                <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {createdResult.database?.databaseName ||
                    createdResult.organisation?.databaseName}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#242938]">
                <span className="text-slate-400">Superadmin Username:</span>
                <span className="font-semibold text-sky-400">
                  {createdResult.superAdmin?.username}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#242938]">
                <span className="text-slate-400">Superadmin Email:</span>
                <span className="text-slate-200">
                  {createdResult.superAdmin?.email}
                </span>
              </div>
              {createdResult.organisation?.logo && (
                <div className="flex justify-between items-center py-1 border-b border-[#242938]">
                  <span className="text-slate-400">Logo (Bunny CDN):</span>
                  <a
                    href={createdResult.organisation.logo || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f43f5e] hover:underline font-mono text-[11px] truncate max-w-[220px] flex items-center gap-1"
                    title={createdResult.organisation.logo || undefined}
                  >
                    <span>{createdResult.organisation.logo}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              {(createdResult.organisation?.document ||
                createdResult.organisation?.tradeLicenceDocument) && (
                <div className="flex justify-between items-center py-1 border-b border-[#242938]">
                  <span className="text-slate-400">Verification Document (Bunny CDN):</span>
                  <a
                    href={
                      (createdResult.organisation.document ||
                        createdResult.organisation.tradeLicenceDocument) ||
                      undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#f43f5e] hover:underline font-mono text-[11px] truncate max-w-[220px] flex items-center gap-1"
                    title={
                      (createdResult.organisation.document ||
                        createdResult.organisation.tradeLicenceDocument) ||
                      undefined
                    }
                  >
                    <span>
                      {createdResult.organisation.document ||
                        createdResult.organisation.tradeLicenceDocument}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Database Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Isolated &amp; Fully Initialized
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  if (onSuccess) {
                    onSuccess();
                  } else {
                    router.push("/platform-owner");
                  }
                }}
                className="flex-1 h-11 rounded-full bg-[#800020] text-white font-bold text-sm hover:bg-[#991b1b] active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Go to Organisation Listing</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  handleClearForm(true);
                }}
                className="px-5 h-11 rounded-full border border-[#2d3448] bg-[#1a1e2c] text-slate-300 font-medium text-xs hover:text-white hover:border-slate-500 transition-colors"
              >
                Register Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
