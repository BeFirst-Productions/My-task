"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  MessageCircle,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Sparkles,
  ChevronDown,
  Layers,
  Clock,
  Check,
} from "lucide-react";
import { fetchServiceCatalog, ServiceCategoryData, ServiceItemData } from "@/services/service-catalog.service";
import { createClient, CreateClientPayload, fetchSalesStaff, SalesStaffMember } from "@/services/client.service";
import { useAuth } from "@/context/AuthContext";

interface ClientCreateViewProps {
  orgId?: string;
  orgSubdomain?: string;
  onBackToList: () => void;
  onClientCreated?: (newClient: any) => void;
}

interface SelectedServiceState {
  serviceItemId: string;
  name: string;
  categoryName: string;
  basePrice: number;
  commissionAmount: number;
  totalPrice: number;
}

export function ClientCreateView({
  orgId,
  orgSubdomain,
  onBackToList,
  onClientCreated,
}: ClientCreateViewProps) {
  const { user } = useAuth();

  // 1. Client & Company Profile Fields
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+971");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [sameAsContact, setSameAsContact] = useState(false);
  const [selectedSalesStaffId, setSelectedSalesStaffId] = useState("");
  const [trnNumber, setTrnNumber] = useState("");
  const [notes, setNotes] = useState("");

  // 2. Service Catalog & Sales Staff Loading
  const [catalog, setCatalog] = useState<ServiceCategoryData[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string; role?: string; department?: string }[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // 3. Selected Category & Services State
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<SelectedServiceState[]>([]);

  // 4. Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoadingCatalog(true);
      try {
        const [cats, staffData] = await Promise.all([
          fetchServiceCatalog(orgId || orgSubdomain),
          fetchSalesStaff(orgId || orgSubdomain),
        ]);

        if (mounted) {
          setCatalog(cats);
          if (cats.length > 0) {
            setActiveCategoryId(cats[0].id);
          }

          // Strictly real sales staff from the database (role SALES_STAFF)
          const salesStaffOnly = staffData
            .filter((s: any) => s.role === "SALES_STAFF" || !s.role) // in case backend returns only SALES_STAFF
            .map((s: any) => ({
              id: s.id,
              name: s.fullName || s.name || s.username,
              role: s.role || "SALES_STAFF",
              department: s.department,
              email: s.email,
            }));

          setStaffList(salesStaffOnly);

          // Select logged-in user if they are SALES_STAFF, otherwise select the first sales staff in DB
          if (user?.role === "SALES_STAFF" && user?.id) {
            setSelectedSalesStaffId(user.id);
          } else if (salesStaffOnly.length > 0) {
            setSelectedSalesStaffId(salesStaffOnly[0].id);
          } else {
            setSelectedSalesStaffId("");
          }
        }
      } catch (err) {
        console.warn("Failed to load catalog or sales staff:", err);
      } finally {
        if (mounted) setIsLoadingCatalog(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, user]);

  // Handle phone changes with auto-sync to WhatsApp if "same as contact" is checked
  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    if (sameAsContact) {
      setWhatsappNumber(val);
    }
  };

  const handleToggleSameAsContact = (checked: boolean) => {
    setSameAsContact(checked);
    if (checked) {
      setWhatsappCountryCode(countryCode);
      setWhatsappNumber(phoneNumber);
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    let subTotal = 0;
    let totalCommission = 0;
    for (const s of selectedServices) {
      subTotal += Number(s.basePrice || 0);
      totalCommission += Number(s.commissionAmount || 0);
    }
    subTotal = Number(subTotal.toFixed(2));
    totalCommission = Number(totalCommission.toFixed(2));
    const grandTotal = Number((subTotal + totalCommission).toFixed(2));

    return {
      subTotal,
      totalCommission,
      grandTotal,
      serviceCount: selectedServices.length,
    };
  }, [selectedServices]);

  // Toggle service selection checkbox (strictly deduplicated)
  const handleToggleService = (srv: ServiceItemData, categoryName: string) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.serviceItemId === srv.id);
      if (exists) {
        // Deselect
        return prev.filter((s) => s.serviceItemId !== srv.id);
      } else {
        // Select
        const base = Number(srv.basePrice || 0);
        return [
          ...prev.filter((s) => s.serviceItemId !== srv.id), // extra safety against duplicate
          {
            serviceItemId: srv.id,
            name: srv.name,
            categoryName: categoryName || activeCategory?.name || "Corporate Service",
            basePrice: base,
            commissionAmount: 0,
            totalPrice: base,
          },
        ];
      }
    });
  };

  // Toggle all services in the active category
  const activeCategory = catalog.find((c) => c.id === activeCategoryId) || catalog[0];
  const activeCategoryServices = activeCategory?.services || [];

  const allActiveCategorySelected = useMemo(() => {
    if (!activeCategoryServices.length) return false;
    return activeCategoryServices.every((srv) =>
      selectedServices.some((s) => s.serviceItemId === srv.id)
    );
  }, [activeCategoryServices, selectedServices]);

  const handleToggleAllCategoryServices = () => {
    setSelectedServices((prev) => {
      if (allActiveCategorySelected) {
        // Deselect all services in current category
        const activeIds = new Set(activeCategoryServices.map((s) => s.id));
        return prev.filter((s) => !activeIds.has(s.serviceItemId));
      } else {
        // Select all services in current category without duplicates
        const existingIds = new Set(prev.map((s) => s.serviceItemId));
        const toAdd: SelectedServiceState[] = [];

        for (const srv of activeCategoryServices) {
          if (!existingIds.has(srv.id)) {
            const base = Number(srv.basePrice || 0);
            toAdd.push({
              serviceItemId: srv.id,
              name: srv.name,
              categoryName: activeCategory?.name || "Corporate Service",
              basePrice: base,
              commissionAmount: 0,
              totalPrice: base,
            });
            existingIds.add(srv.id);
          }
        }
        return [...prev, ...toAdd];
      }
    });
  };

  // Update commission for a selected service
  const handleUpdateCommission = (serviceItemId: string, commission: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.serviceItemId === serviceItemId) {
          const comm = Math.max(0, isNaN(commission) ? 0 : Number(commission));
          const base = Number(s.basePrice || 0);
          return {
            ...s,
            commissionAmount: comm,
            totalPrice: Number((base + comm).toFixed(2)),
          };
        }
        return s;
      })
    );
  };

  const isServiceSelected = (serviceItemId: string) => {
    return selectedServices.some((s) => s.serviceItemId === serviceItemId);
  };

  const getSelectedServiceState = (serviceItemId: string) => {
    return selectedServices.find((s) => s.serviceItemId === serviceItemId);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!clientName.trim()) {
      setFeedback({ type: "error", message: "Please enter the client / contact person name." });
      return;
    }
    if (!companyName.trim()) {
      setFeedback({ type: "error", message: "Please enter the corporate or business company name." });
      return;
    }
    if (!email.trim()) {
      setFeedback({ type: "error", message: "Please enter a valid client email address." });
      return;
    }
    if (!phoneNumber.trim()) {
      setFeedback({ type: "error", message: "Please enter the contact phone number." });
      return;
    }
    if (!selectedSalesStaffId) {
      setFeedback({ type: "error", message: "Please select an assigned sales staff member with role SALES_STAFF." });
      return;
    }
    if (selectedServices.length === 0) {
      setFeedback({ type: "error", message: "Please select at least one service by checking its box." });
      return;
    }

    setIsSubmitting(true);

    try {
      const fullContactNumber = `${countryCode} ${phoneNumber.trim()}`;
      const fullWhatsappNumber = whatsappNumber.trim()
        ? `${whatsappCountryCode} ${whatsappNumber.trim()}`
        : fullContactNumber;

      const payload: CreateClientPayload = {
        organisationId: orgId || orgSubdomain,
        companyName: companyName.trim(),
        contactPerson: clientName.trim(),
        email: email.trim(),
        phoneNumber: fullContactNumber,
        whatsappNumber: fullWhatsappNumber,
        trnNumber: trnNumber.trim() || undefined,
        address: address.trim() || undefined,
        salesStaffId: selectedSalesStaffId || user?.id,
        services: selectedServices.map((s) => ({
          serviceItemId: s.serviceItemId,
          commissionAmount: s.commissionAmount,
          basePrice: s.basePrice,
        })),
        notes: notes.trim() || undefined,
        createdById: user?.id,
      };

      const result = await createClient(payload);

      if (result.success && result.data) {
        setFeedback({
          type: "success",
          message: `Client "${clientName}" (${companyName}) registered successfully! You can now generate official Proforma Invoices from the Client Directory.`,
        });

        // Navigate to client directory after brief confirmation
        setTimeout(() => {
          if (onClientCreated) {
            onClientCreated(result.data);
          } else {
            onBackToList();
          }
        }, 1200);
      } else {
        setFeedback({
          type: "error",
          message: result.message || "Failed to create client. Please verify all fields.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "An unexpected network error occurred while creating client.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Client Management
            </span>
            <span className="text-xs text-slate-400">Onboarding & Service Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Add New Client
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter client details, select the service category and check applicable services with sales staff assignment.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Clients</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLUMNS: Client Profile & Service Category with Checkboxes */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Client & Company Profile Fields */}
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-500" />
                  <span>Client Information</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">Fields with * are required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 1. Client Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Client Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Tariq Mansoor"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* 2. Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Al Noor Business Services LLC"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* 3. Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@domain.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* 4. Sales Staff Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Assigned Sales Staff <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      required
                      value={selectedSalesStaffId}
                      onChange={(e) => setSelectedSalesStaffId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                    >
                      {staffList.length === 0 ? (
                        <option value="">No sales staff found in database</option>
                      ) : (
                        <>
                          <option value="">Select sales staff</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Sales Staff)
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  {staffList.length === 0 && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      No active users with role &quot;SALES_STAFF&quot; in database. Please create a sales staff user in User Management.
                    </p>
                  )}
                </div>

                {/* 5. Contact Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20">
                    <div className="flex items-center gap-1 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      <span>🇦🇪</span>
                      <span>{countryCode}</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="50 123 4567"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 6. WhatsApp Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      WhatsApp Number
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <input
                        type="checkbox"
                        checked={sameAsContact}
                        onChange={(e) => handleToggleSameAsContact(e.target.checked)}
                        className="h-3 w-3 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span>Same as Contact</span>
                    </label>
                  </div>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20">
                    <div className="flex items-center gap-1 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{whatsappCountryCode}</span>
                    </div>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => {
                        setWhatsappNumber(e.target.value);
                        if (sameAsContact && e.target.value !== phoneNumber) {
                          setSameAsContact(false);
                        }
                      }}
                      placeholder="50 123 4567"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 7. Address Field (Full Width across 2 columns) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Office / Unit No, Building, Area / Freezone, Emirate / City, UAE"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs resize-none"
                    />
                  </div>
                </div>

                {/* Optional TRN */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Tax Registration Number (TRN) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={trnNumber}
                    onChange={(e) => setTrnNumber(e.target.value)}
                    placeholder="e.g. 100XXXXXXXXX003"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Service Category & Services Checkbox Selection */}
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-500" />
                    <span>Service Category & Service Selection</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select a service category to display all its services. Use checkboxes to select services for this client.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {selectedServices.length} Selected
                  </span>
                </div>
              </div>

              {/* Service Category Dropdown Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Service Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={activeCategoryId}
                    onChange={(e) => setActiveCategoryId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                  >
                    {catalog.map((cat) => {
                      const countSelected = selectedServices.filter((s) => s.categoryName === cat.name).length;
                      return (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.services?.length || 0} services)
                          {countSelected > 0 ? ` — ${countSelected} selected` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Services Header & Select All Option */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Services in {activeCategory?.name || "Selected Category"}
                </span>

                {activeCategoryServices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllCategoryServices}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {allActiveCategorySelected ? "Deselect All in Category" : "Select All in Category"}
                  </button>
                )}
              </div>

              {/* Services List with Checkboxes */}
              {isLoadingCatalog ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="mt-2 text-xs">Loading service catalog...</p>
                </div>
              ) : activeCategoryServices.length > 0 ? (
                <div className="space-y-3">
                  {activeCategoryServices.map((srv) => {
                    const isSelected = isServiceSelected(srv.id);
                    const selectedState = getSelectedServiceState(srv.id);
                    const basePriceNum = Number(srv.basePrice || 0);

                    return (
                      <div
                        key={srv.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/50 shadow-xs"
                            : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Checkbox & Service Info */}
                          <div
                            className="flex items-start gap-3 cursor-pointer select-none flex-1"
                            onClick={() => handleToggleService(srv, activeCategory?.name || "")}
                          >
                            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleService(srv, activeCategory?.name || "");
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer accent-amber-500"
                              />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs font-bold ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                                  {srv.name}
                                </h4>
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                                    <Check className="h-3 w-3" /> Selected
                                  </span>
                                )}
                              </div>

                              {srv.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {srv.description}
                                </p>
                              )}

                              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  Base Fee: AED {basePriceNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                                {srv.estimatedDays && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    ~{srv.estimatedDays} Days
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Sales Commission Input (Appears when checked) */}
                          {isSelected && selectedState && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="sm:text-right shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-500/30 shadow-2xs"
                            >
                              <label className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                                Sales Commission (AED)
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="relative w-28">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    +
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={selectedState.commissionAmount === 0 ? "" : selectedState.commissionAmount}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const num = val === "" ? 0 : parseFloat(val);
                                      handleUpdateCommission(srv.id, isNaN(num) ? 0 : num);
                                    }}
                                    placeholder="0.00"
                                    className="w-full text-right font-mono font-bold text-xs py-1.5 pl-6 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Total</span>
                                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                    AED {Number(selectedState.totalPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No services found under this category.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Financial Breakdown & Grand Total */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Client Package Summary
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  Live Quote
                </span>
              </div>

              {/* Selected Services Itemized List */}
              <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-1">
                {selectedServices.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Receipt className="h-6 w-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <span>No services checked yet.</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Check boxes in the catalog to add services.</p>
                  </div>
                ) : (
                  selectedServices.map((s, idx) => {
                    const base = Number(s.basePrice || 0);
                    const comm = Number(s.commissionAmount || 0);
                    const total = Number(s.totalPrice || base + comm);

                    return (
                      <div
                        key={s.serviceItemId || `selected-srv-${idx}`}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 text-xs flex justify-between items-start gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {s.name}
                            </span>
                            {s.categoryName && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {s.categoryName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1 font-mono">
                            <span>Base: AED {base.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            {comm > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                + Comm: AED {comm.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            AED {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedServices((prev) =>
                                prev.filter((item) => item.serviceItemId !== s.serviceItemId)
                              )
                            }
                            className="text-[10px] text-rose-500 hover:text-rose-600 block text-right mt-1 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Subtotals & Grand Total Breakdown */}
              <div className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Base Catalog Services:</span>
                  <span className="font-mono font-semibold">
                    AED {calculations.subTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                  <span>Total Sales Commission:</span>
                  <span className="font-mono font-bold">
                    + AED {calculations.totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
                      Grand Total Amount
                    </span>
                    <span className="text-[10px] text-slate-400">Auto Proforma Value</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-amber-500">
                      AED {calculations.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Registration Action Notice */}
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                <p>
                  <strong>Registration Step:</strong> Submitting will register the client and configure their selected services. You can generate official <strong>Proforma Invoices</strong> on demand from the Client Directory.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || selectedServices.length === 0}
                className="mt-6 w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>Registering Client Account...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Register Client & Save Services</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
