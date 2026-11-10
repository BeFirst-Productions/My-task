"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  UploadCloud,
  AlertCircle,
  Loader2,
  FileText,
  Trash2,
  ArrowRight,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  submitEnquiry,
  EnquiryApiError,
  type EnquiryItem,
} from "@/services/enquiry.service";

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

export function isValidUAEMobile(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^(?:(?:\+971|00971|0)?)(5[024568]\d{7}|5\d{8})$/.test(cleaned);
}

export function formatToUAE_E164(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+971")) return cleaned;
  if (cleaned.startsWith("00971")) return `+971${cleaned.slice(5)}`;
  if (cleaned.startsWith("0")) return `+971${cleaned.slice(1)}`;
  if (cleaned.startsWith("5")) return `+971${cleaned}`;
  return `+971${cleaned}`;
}

export default function LandingPageView() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    companyName: "",
    primaryLocation: "",
    subdomain: "",
    documentName: "",
    documentDataUrl: "",
    documentSize: "",
    email: "",
    mobileNumber: "",
    subscriptionPlan: "GROWTH",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<EnquiryItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPackage = (packageName: string) => {
    setFormData((prev) => ({ ...prev, subscriptionPlan: packageName }));
    if (touched.subscriptionPlan || hasSubmitted) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.subscriptionPlan;
        return copy;
      });
    }
    scrollToSection("register");
  };

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case "companyName": {
        const trimmed = value.trim();
        if (!trimmed) return "Company Name is required.";
        if (trimmed.length < 2) return "Company Name must be at least 2 characters.";
        if (trimmed.length > 100) return "Company Name must not exceed 100 characters.";
        if (!/[a-zA-Z\u0600-\u06FF]/.test(trimmed)) {
          return "Company Name must contain letters.";
        }
        return null;
      }
      case "primaryLocation":
        if (!value) return "Please select an Emirate.";
        if (!EMIRATES.includes(value)) return "Please select a valid UAE Emirate.";
        return null;
      case "subdomain": {
        const trimmed = value.trim().toLowerCase();
        if (!trimmed) return "Software Subdomain is required.";
        if (trimmed.length < 3) return "Subdomain must be at least 3 characters.";
        if (trimmed.length > 30) return "Subdomain cannot exceed 30 characters.";
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmed)) {
          return "Subdomain may only contain lowercase letters, numbers, and internal hyphens.";
        }
        return null;
      }
      case "email": {
        const trimmed = value.trim();
        if (!trimmed) return "Verified Email is required.";
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRegex.test(trimmed)) {
          return "Please enter a valid email address (e.g. name@company.com).";
        }
        return null;
      }
      case "mobileNumber": {
        const trimmed = value.trim();
        if (!trimmed) return "UAE Mobile Number is required.";
        if (!isValidUAEMobile(trimmed)) {
          return "Please enter a valid UAE mobile number (e.g. 050 123 4567 or +971 50 123 4567).";
        }
        return null;
      }
      case "document":
        if (!formData.documentDataUrl) {
          return "Company verification document is required (PDF, PNG, JPG).";
        }
        return null;
      case "subscriptionPlan":
        if (!value) return "Please select a software package.";
        if (!["STARTER", "GROWTH", "PREMIUM"].includes(value)) {
          return "Please select a valid package.";
        }
        return null;
      default:
        return null;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let updatedVal = value;
    if (name === "subdomain") {
      updatedVal = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }
    setFormData((prev) => ({ ...prev, [name]: updatedVal }));

    if (touched[name] || hasSubmitted) {
      const err = validateField(name, updatedVal);
      setErrors((prev) => {
        const copy = { ...prev };
        if (err) copy[name] = err;
        else delete copy[name];
        return copy;
      });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => {
      const copy = { ...prev };
      if (err) copy[name] = err;
      else delete copy[name];
      return copy;
    });
  };

  const handleFileProcess = (file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const validExts = [".pdf", ".png", ".jpg", ".jpeg"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(fileExt)) {
      setErrors((prev) => ({
        ...prev,
        document: "Unsupported file format. Please upload a PDF, PNG, or JPG file.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, document: "File exceeds maximum size of 10 MB." }));
      return;
    }

    const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        documentName: file.name,
        documentDataUrl: reader.result as string,
        documentSize: sizeStr,
      }));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.document;
        return copy;
      });
    };
    reader.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        document: "Failed to read file. Please try uploading again.",
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = () => {
    setFormData((prev) => ({
      ...prev,
      documentName: "",
      documentDataUrl: "",
      documentSize: "",
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (touched.document || hasSubmitted) {
      setErrors((prev) => ({
        ...prev,
        document: "Company verification document is required (PDF, PNG, JPG).",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setHasSubmitted(true);

    const newErrors: Record<string, string> = {};
    const fieldsToValidate = [
      "companyName",
      "primaryLocation",
      "subdomain",
      "document",
      "email",
      "mobileNumber",
      "subscriptionPlan",
    ];

    fieldsToValidate.forEach((f) => {
      const val = (formData as any)[f] || "";
      const err = validateField(f, val);
      if (err) newErrors[f] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(
        fieldsToValidate.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
      );
      setErrorMessage("Please complete all required fields correctly.");

      const firstErrorField = fieldsToValidate.find((f) => newErrors[f]);
      if (firstErrorField) {
        const element =
          firstErrorField === "document"
            ? (fileInputRef.current?.parentElement ?? document.getElementById("document-upload-box"))
            : document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPhone = formatToUAE_E164(formData.mobileNumber.trim());
      const cleanEmail = formData.email.trim().toLowerCase();

      const enquiryPayload = {
        companyName: formData.companyName.trim(),
        primaryLocation: formData.primaryLocation,
        subdomain: formData.subdomain.trim().toLowerCase(),
        email: cleanEmail,
        mobileNumber: formattedPhone,
        subscriptionPlan: formData.subscriptionPlan,
        document: formData.documentDataUrl || undefined,
        documentName: formData.documentName || undefined,
        documentSize: formData.documentSize || undefined,
        notes: `Selected Package: ${formData.subscriptionPlan}. Primary Location: ${formData.primaryLocation}.`,
      };

      const res = await submitEnquiry(enquiryPayload);
      if (res.success && res.data) {
        setCreatedResult(res.data);
      } else {
        setErrorMessage(res.message || "Failed to submit enquiry. Please try again.");
      }
    } catch (err: any) {
      if (err instanceof EnquiryApiError && err.details?.length) {
        const serverFieldErrors: Record<string, string> = {};
        err.details.forEach((d) => {
          serverFieldErrors[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...serverFieldErrors }));
        setErrorMessage(err.message || "Validation failed on the server.");
      } else {
        setErrorMessage(
          err.message || "A network or server error occurred. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* ── 1. Hero Section with Integrated Navbar ── */}
      <section
        id="home"
        className="relative min-h-[600px] sm:min-h-[680px] lg:min-h-[720px] flex flex-col justify-between bg-slate-950 overflow-hidden"
        style={{
          backgroundImage: "url('/landing_hero_dubai.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
      >
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25 pointer-events-none" />

        {/* ── Integrated Top Navbar ── */}
        <div className="relative z-20 w-full border-b border-white/10 bg-black/25 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 sm:h-28 flex items-center justify-between">
            {/* Logo Box */}
            <div
              onClick={() => scrollToSection("home")}
              className="cursor-pointer bg-[#cbd5e1] hover:bg-white text-slate-900 font-black text-base sm:text-lg tracking-widest px-8 py-3 rounded-xs shadow-xs transition-colors"
            >
              LOGO
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-8 sm:gap-12 text-base sm:text-lg font-medium text-white/95">
              <button
                type="button"
                onClick={() => scrollToSection("home")}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("about")}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("packages")}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Package
              </button>
            </nav>

            {/* Sign In Link */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm sm:text-base font-semibold text-white/90 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* ── Hero Main Content ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full my-auto">
          <div className="max-w-2xl text-white">
            {/* Tagline */}
            <p className="text-[11px] sm:text-xs font-bold tracking-widest uppercase text-blue-400 mb-4">
              UAE BUSINESS SETUP • MADE SIMPLE
            </p>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Start Your Business <br />
              in the UAE with Confidence
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-xs sm:text-sm text-slate-200 leading-relaxed max-w-lg">
              Comprehensive mainland and free zone company formation, DED licensing,
              investor visas, and corporate PRO services designed to accelerate your growth in Dubai.
            </p>

            {/* CTA Button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => scrollToSection("register")}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/30 transition-all cursor-pointer"
              >
                Register Now
              </button>
            </div>

            {/* Trust Checkmarks */}
            <div className="mt-4 flex flex-wrap items-center gap-6 text-[11px] sm:text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold">✓</span>
                <span>Personalised guidance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold">✓</span>
                <span>Clear next steps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold">✓</span>
                <span>100% compliant process</span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty bottom spacer for balance */}
        <div className="h-6" />
      </section>

      {/* ── 2. About Section ── */}
      <section id="about" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Image with Floating Overlays */}
          <div className="relative pb-10 sm:pb-8 lg:pb-0">
            {/* The Meeting Image */}
            <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
              <img
                src="/landing_about_meeting.jpg"
                alt="Corporate advisory consultation in Dubai"
                className="w-full h-[360px] sm:h-[420px] object-cover"
              />
            </div>

            {/* Top Right: Blue Dot Grid Icon */}
            <div className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 bg-blue-600 p-2.5 sm:p-3 rounded-xl shadow-lg z-10">
              <div className="grid grid-cols-3 gap-1.5">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />
                ))}
              </div>
            </div>

            {/* Bottom Right: Overlapping Blue Message Banner */}
            <div className="absolute -bottom-4 right-2 sm:-bottom-6 sm:-right-4 bg-blue-600 text-white p-4 sm:p-5 rounded-lg shadow-2xl z-10 max-w-sm">
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                Our focus is simple: practical advice, transparent communication and
                support that fits your business goals.
              </p>
            </div>
          </div>

          {/* Right Column: Copy & Bar Accent */}
          <div className="lg:pl-6">
            <div className="border-l-4 border-blue-600 pl-4 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                Empowering Business Setup <br />
                & Corporate Growth
              </h2>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Navigating the UAE business ecosystem requires strategic clarity, from selecting
                between Mainland, Free Zone, and Offshore jurisdictions to securing commercial approvals
                from the Department of Economy and Tourism (DET / DED). Our team delivers seamless, end-to-end
                incorporation support tailored precisely to your operational vision.
              </p>
              <p>
                From trade name reservation, MOA drafting, and Ejari documentation to investor residency visas,
                corporate bank account opening, and ongoing government PRO liaisons, we eliminate procedural
                bottlenecks so you can focus entirely on scaling your venture across Dubai and the Emirates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Package Section ── */}
      <section
        id="packages"
        className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/70 border-t border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="border-l-4 border-blue-600 pl-4 mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Choose a package for your next step
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Transparent, all-inclusive corporate formation packages tailored to your commercial scope.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {/* Card 1: Starter */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ideal for solo founders & freelancers launching a streamlined consultancy.
                </p>

                <div className="mt-6 mb-1">
                  <div className="text-3xl font-black text-slate-900">AED 5,500</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Starting price (excl. gov fees)
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  {[
                    "Free Zone or Mainland jurisdiction advisory",
                    "Trade name reservation & initial DET approval",
                    "Standard commercial / service license issuance",
                    "Digital Memorandum of Association (MOA)",
                    "1 Investor / Partner residency visa quota",
                    "Digital document vault & compliance dashboard",
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelectPackage("STARTER")}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Choose Starter
                </button>
              </div>
            </div>

            {/* Card 2: Growth (MOST POPULAR) */}
            <div className="bg-[#0b172a] text-white rounded-2xl p-7 border-2 border-blue-500 shadow-2xl relative flex flex-col justify-between ring-1 ring-blue-500/20">
              <div className="absolute -top-3.5 right-6 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md border border-blue-400/40">
                MOST POPULAR
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Growth</h3>
                <p className="text-xs text-slate-300 mt-1">
                  For expanding commercial companies with active operational staff.
                </p>

                <div className="mt-6 mb-1">
                  <div className="text-3xl font-black text-white">AED 9,999</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Comprehensive setup package
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                  {[
                    "Everything in Starter plan",
                    "Dual-activity Commercial / Professional license",
                    "Up to 3 Investor / Partner visa allocations",
                    "Labour Establishment Card (MOHRE) registration",
                    "Corporate bank account opening assistance",
                    "Ejari lease agreement / virtual office registration",
                    "VIP fast-track medical fitness & Emirates ID",
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <Check className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSelectPackage("GROWTH")}
                  className="w-full py-2.5 rounded-lg bg-white hover:bg-slate-100 text-blue-900 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Choose Growth
                </button>
              </div>
            </div>

            {/* Card 3: Premium */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Premium</h3>
                <p className="text-xs text-slate-500 mt-1">
                  For multi-partner corporations, branch offices & foreign subsidiaries.
                </p>

                <div className="mt-6 mb-1">
                  <div className="text-3xl font-black text-slate-900">AED 15,999</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Turnkey enterprise advisory
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  {[
                    "Everything in Growth plan",
                    "Mainland LLC or specialized Free Zone jurisdiction",
                    "Comprehensive legal drafting & notary attestation",
                    "Up to 6 residency visa allocations + family sponsorship",
                    "Corporate tax & FTA VAT registration onboarding",
                    "Dedicated executive corporate banking introduction",
                    "Annual PRO compliance liaison & renewal retainer",
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelectPackage("PREMIUM")}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Choose Premium
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Disclaimer Note */}
          <p className="text-center text-xs text-slate-400 mt-10">
            Package names, inclusions and prices are design placeholders. Confirm final
            scope and pricing before publishing.
          </p>
        </div>
      </section>

      {/* ── 4. Tell Us About Your Business (Form Section) ── */}
      <section id="register" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="border-l-4 border-blue-600 pl-4 mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Tell us about your business
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Share a few details and our team can guide you towards the right setup option.
            </p>
          </div>

          {/* Form & Right Column Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Registration Form */}
            <div className="lg:col-span-2">
              {createdResult ? (
                /* Success Card */
                <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 animate-in fade-in">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">
                    Business Setup Enquiry Submitted!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-2">
                    Thank you! Your setup application for{" "}
                    <strong>{createdResult.companyName}</strong> has been received by our platform team.
                  </p>

                  <div className="mt-5 p-4 rounded-xl bg-white border border-emerald-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Requested Subdomain:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {createdResult.subdomain}.mytask.com
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Location:</span>
                      <span className="font-bold text-slate-900">
                        {createdResult.primaryLocation}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Selected Package:</span>
                      <span className="font-bold text-blue-600">
                        {createdResult.subscriptionPlan}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Email:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {createdResult.email}
                      </span>
                    </div>
                    {createdResult.documentUrl && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-slate-500">Verification Document:</span>
                        <a
                          href={createdResult.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Archived in Bunny Storage (enquiry-docs)</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedResult(null);
                        setFormData({
                          companyName: "",
                          primaryLocation: "",
                          subdomain: "",
                          documentName: "",
                          documentDataUrl: "",
                          documentSize: "",
                          email: "",
                          mobileNumber: "",
                          subscriptionPlan: "GROWTH",
                        });
                        setHasSubmitted(false);
                      }}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Submit Another Enquiry</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-8"
                >
                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* ── Group 1: Business Information ── */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                      Business Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Company Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Company Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="e.g. Al Qusais Typing"
                          className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                            errors.companyName
                              ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.companyName && (
                          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{errors.companyName}</span>
                          </p>
                        )}
                      </div>

                      {/* Primary Location (Emirate) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Primary Location <span className="text-rose-500">*</span>
                        </label>
                        <select
                          name="primaryLocation"
                          value={formData.primaryLocation}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 bg-white cursor-pointer ${
                            errors.primaryLocation
                              ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        >
                          <option value="">Select Emirate</option>
                          {EMIRATES.map((em) => (
                            <option key={em} value={em}>
                              {em}
                            </option>
                          ))}
                        </select>
                        {errors.primaryLocation && (
                          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{errors.primaryLocation}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Software Subdomain */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Software Subdomain <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className={`flex rounded-lg border overflow-hidden transition-colors ${
                          errors.subdomain
                            ? "border-rose-400 bg-rose-50/20 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400"
                            : "border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                        }`}
                      >
                        <input
                          type="text"
                          name="subdomain"
                          value={formData.subdomain}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="yourcompany"
                          className="w-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none font-mono bg-transparent"
                        />
                        <span className="bg-slate-50 px-3.5 py-2 text-xs text-slate-400 border-l border-slate-200 font-mono select-none">
                          .mytask.com
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Choose a unique web address for your agency dashboard.
                      </p>
                      {errors.subdomain && (
                        <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{errors.subdomain}</span>
                        </p>
                      )}
                    </div>

                    {/* Company Document Upload */}
                    <div id="document-upload-box">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Company Document <span className="text-rose-500">*</span>
                      </label>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileProcess(file);
                        }}
                        className="hidden"
                      />

                      {formData.documentDataUrl ? (
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {formData.documentName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formData.documentSize} • Stored for verification
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeDocument}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleFileProcess(file);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                            errors.document
                              ? "border-rose-400 bg-rose-50/30"
                              : isDragging
                              ? "border-blue-500 bg-blue-50/30"
                              : "border-slate-300 hover:border-blue-500/70 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex justify-center mb-2">
                            <UploadCloud className={`h-6 w-6 ${errors.document ? "text-rose-400" : "text-slate-400"}`} />
                          </div>
                          <p className={`text-xs font-bold ${errors.document ? "text-rose-700" : "text-slate-800"}`}>
                            Click to upload or drag and drop
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Trade license / company registration PDF, JPG or PNG (max. 10 MB)
                          </p>
                          <button
                            type="button"
                            className="mt-3 px-3 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-700 bg-white shadow-2xs hover:bg-slate-50"
                          >
                            Browse files
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        Upload a valid company document for organisation verification.
                      </p>
                      {errors.document && (
                        <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{errors.document}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Group 2: Contact Information ── */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                      Contact Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Verified Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="e.g. shafibefirst@gmail.com"
                          className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                            errors.email
                              ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.email && (
                          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{errors.email}</span>
                          </p>
                        )}
                      </div>

                      {/* Mobile Number */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="mobileNumber"
                          value={formData.mobileNumber}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 0501234567"
                          className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                            errors.mobileNumber
                              ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                        {errors.mobileNumber && (
                          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{errors.mobileNumber}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Group 3: Subscription Plan ── */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                      Subscription Plan
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Software Package <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="subscriptionPlan"
                        value={formData.subscriptionPlan}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full rounded-lg border px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 bg-white cursor-pointer ${
                          errors.subscriptionPlan
                            ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                      >
                        <option value="STARTER">Starter — AED 5,500</option>
                        <option value="GROWTH">Growth (Most Popular) — AED 9,999</option>
                        <option value="PREMIUM">Premium — AED 15,999</option>
                      </select>
                      {errors.subscriptionPlan && (
                        <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{errors.subscriptionPlan}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Required note & Submit */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-400">
                      Fields marked with <span className="text-rose-500">*</span> are required.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Creating Organisation...</span>
                        </>
                      ) : (
                        <span>Create Organisation</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right 1 Column: Informational Card (Sticky) */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm sticky top-8">
                <img
                  src="/landing_form_card.jpg"
                  alt="Dubai business district documentation and skyline"
                  className="w-full h-48 sm:h-52 object-cover"
                />

                <div className="p-6">
                  <h4 className="text-base font-bold text-slate-900 mb-2">
                    Not sure where to begin?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Share your commercial activities and timeline. Our seasoned UAE setup advisors
                    will outline your ideal license structure and cost breakdown.
                  </p>

                  <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="text-blue-600 font-bold">✓</span>
                      <span><strong>100% Foreign Ownership</strong> across Mainland & Free Zones</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="text-blue-600 font-bold">✓</span>
                      <span><strong>Fast-Track Licensing</strong> in as few as 3 to 5 business days</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="text-blue-600 font-bold">✓</span>
                      <span><strong>Full PRO Assistance</strong> for investor visas and bank onboarding</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Navy Pre-Footer Banner ── */}
      <section className="bg-[#0b162c] py-14 px-4 sm:px-6 lg:px-8 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Your UAE business journey starts here.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Join leading corporate consultancies, Typing centers, and entrepreneurs managing their
              company formation, compliance, and document renewals with complete peace of mind.
            </p>
          </div>

          <button
            type="button"
            onClick={() => scrollToSection("register")}
            className="px-6 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-lg transition-all shrink-0 cursor-pointer"
          >
            Register Now
          </button>
        </div>
      </section>

      {/* ── 6. Minimal Footer ── */}
      <footer className="bg-[#060c18] py-6 px-4 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>© {new Date().getFullYear()} My Task UAE Business Platform. All rights reserved.</p>
      </footer>

      {/* ── 7. Scroll to Top Floating Button ── */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center ${
          showScrollTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ChevronUp className="h-5 w-5 stroke-[2.5]" />
      </button>
    </div>
  );
}
