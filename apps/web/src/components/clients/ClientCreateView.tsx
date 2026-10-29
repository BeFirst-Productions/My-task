"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Building2,
  User,
  Mail,
  Phone,
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
} from "lucide-react";
import { fetchServiceCatalog, ServiceCategoryData, ServiceItemData } from "@/services/service-catalog.service";
import { createClient, CreateClientPayload } from "@/services/client.service";
import { fetchCompanyStaff, StaffMember } from "@/services/task.service";
import { useAuth } from "@/context/AuthContext";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";

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

  // Form Profile State
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [trnNumber, setTrnNumber] = useState("");
  const [address, setAddress] = useState("");
  const [selectedSalesStaffId, setSelectedSalesStaffId] = useState("");
  const [notes, setNotes] = useState("");

  // Data Loading
  const [catalog, setCatalog] = useState<ServiceCategoryData[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Selected Services with dynamic commission
  const [selectedServices, setSelectedServices] = useState<SelectedServiceState[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");

  // Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Generated Proforma preview after creation
  const [createdProformaId, setCreatedProformaId] = useState<string | null>(null);
  const [showProformaModal, setShowProformaModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoadingCatalog(true);
      try {
        const [cats, staff] = await Promise.all([
          fetchServiceCatalog(orgId || orgSubdomain),
          fetchCompanyStaff(orgId || orgSubdomain),
        ]);
        if (mounted) {
          setCatalog(cats);
          if (cats.length > 0) {
            setActiveCategoryId(cats[0].id);
          }
          setStaffList(staff);
          // Default sales staff to current user if role is sales or admin
          if (user?.id) {
            setSelectedSalesStaffId(user.id);
          } else if (staff.length > 0) {
            setSelectedSalesStaffId(staff[0].id);
          }
        }
      } catch (err) {
        console.warn("Failed to load catalog or staff:", err);
      } finally {
        if (mounted) setIsLoadingCatalog(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, user]);

  // Calculations
  const calculations = useMemo(() => {
    let subTotal = 0;
    let totalCommission = 0;
    for (const s of selectedServices) {
      subTotal += Number(s.basePrice || 0);
      totalCommission += Number(s.commissionAmount || 0);
    }
    const grandTotal = subTotal + totalCommission;
    return {
      subTotal,
      totalCommission,
      grandTotal,
      serviceCount: selectedServices.length,
    };
  }, [selectedServices]);

  // Toggle service selection
  const handleToggleService = (srv: ServiceItemData, categoryName: string) => {
    const existingIndex = selectedServices.findIndex((s) => s.serviceItemId === srv.id);
    if (existingIndex > -1) {
      // Remove service
      setSelectedServices((prev) => prev.filter((s) => s.serviceItemId !== srv.id));
    } else {
      // Add service with initial commission of 0
      const base = Number(srv.basePrice || 0);
      setSelectedServices((prev) => [
        ...prev,
        {
          serviceItemId: srv.id,
          name: srv.name,
          categoryName,
          basePrice: base,
          commissionAmount: 0,
          totalPrice: base,
        },
      ]);
    }
  };

  // Update commission for selected service
  const handleUpdateCommission = (serviceItemId: string, commission: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.serviceItemId === serviceItemId) {
          const comm = Math.max(0, isNaN(commission) ? 0 : commission);
          return {
            ...s,
            commissionAmount: comm,
            totalPrice: s.basePrice + comm,
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

    if (!companyName.trim()) {
      setFeedback({ type: "error", message: "Please enter the corporate or business company name." });
      return;
    }
    if (!contactPerson.trim()) {
      setFeedback({ type: "error", message: "Please enter the primary contact person." });
      return;
    }
    if (!phoneNumber.trim()) {
      setFeedback({ type: "error", message: "Please provide a valid contact phone number." });
      return;
    }
    if (selectedServices.length === 0) {
      setFeedback({ type: "error", message: "Please select at least one service from the catalog." });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateClientPayload = {
        organisationId: orgId || orgSubdomain,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim() || `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}@client.com`,
        phoneNumber: `${countryCode} ${phoneNumber.trim()}`,
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
          message: `Client "${companyName}" onboarded! Proforma Invoice has been automatically generated.`,
        });

        const proforma = result.data.proformaInvoices?.[0];
        if (proforma?.id) {
          setCreatedProformaId(proforma.id);
          setShowProformaModal(true);
        }

        if (onClientCreated) onClientCreated(result.data);
      } else {
        setFeedback({
          type: "error",
          message: result.message || "Failed to create client. Please try again.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "An unexpected network error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategory = catalog.find((c) => c.id === activeCategoryId) || catalog[0];

  return (
    <div className="w-full pb-20 select-none animate-fade-in font-sans">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              New Workflow Intake
            </span>
            <span className="text-xs text-slate-400">Step 1: Consultation & Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Client & Service Package
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gather detailed client requirements, select services with commission, and generate a Proforma Invoice.
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

      {/* Feedback Banner */}
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
          {/* LEFT 7 COLUMNS: Client Profile & Service Catalog */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Client Company & Contact Profile */}
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-500" />
                <span>Client & Company Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Company / Trade Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Al Noor Logistics LLC"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Tariq Mansoor"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Phone Number with UAE Flag */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20">
                    <div className="flex items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      <span>🇦🇪</span>
                      <span>{countryCode}</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="50 123 4567"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Sales Representative Assignment */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Assigned Sales Staff
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedSalesStaffId}
                      onChange={(e) => setSelectedSalesStaffId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                    >
                      <option value="">Select sales consultant</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.department || s.role || "Sales"})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Tax TRN Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Tax Registration Number (TRN)
                  </label>
                  <input
                    type="text"
                    value={trnNumber}
                    onChange={(e) => setTrnNumber(e.target.value)}
                    placeholder="100XXXXXXXXX003 (Optional)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Predefined Service Catalog Selection with Commission Input */}
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-500" />
                    <span>Select Package Services & Set Commissions</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose required services and add your agreed sales commission amount.
                  </p>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedServices.length} Selected
                </span>
              </div>

              {/* Category Pills Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {catalog.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeCategoryId === cat.id
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Services in Active Category */}
              {isLoadingCatalog ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="mt-2 text-xs">Loading service catalog...</p>
                </div>
              ) : activeCategory?.services && activeCategory.services.length > 0 ? (
                <div className="space-y-3">
                  {activeCategory.services.map((srv) => {
                    const isSelected = isServiceSelected(srv.id);
                    const selectedState = getSelectedServiceState(srv.id);
                    const basePriceNum = Number(srv.basePrice || 0);

                    return (
                      <div
                        key={srv.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 shadow-xs"
                            : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Checkbox & Details */}
                          <div
                            className="flex items-start gap-3 cursor-pointer select-none flex-1"
                            onClick={() => handleToggleService(srv, activeCategory.name)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1 h-4 w-4 rounded text-amber-500 focus:ring-amber-500 dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {srv.name}
                              </h4>
                              {srv.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {srv.description}
                                </p>
                              )}
                              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300">
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

                          {/* Dynamic Sales Commission Input (Visible when selected) */}
                          {isSelected && selectedState && (
                            <div className="sm:text-right shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-500/30">
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
                                    step="50"
                                    value={selectedState.commissionAmount}
                                    onChange={(e) =>
                                      handleUpdateCommission(srv.id, parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="0"
                                    className="w-full text-right font-mono font-bold text-xs py-1.5 pl-6 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Total</span>
                                  <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                    AED {selectedState.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                <div className="py-8 text-center text-slate-400 text-xs">
                  No services found in this category.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Financial Breakdown & Grand Total */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Financial Grand Total
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  Auto Calculated
                </span>
              </div>

              {/* Selected Services Itemized List */}
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
                {selectedServices.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Receipt className="h-6 w-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <span>No services selected yet</span>
                  </div>
                ) : (
                  selectedServices.map((s) => (
                    <div
                      key={s.serviceItemId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 text-xs flex justify-between items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {s.name}
                        </span>
                        <div className="text-[10px] text-slate-400 space-x-2 font-mono">
                          <span>Base: {s.basePrice}</span>
                          <span>+ Comm: {s.commissionAmount}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          AED {s.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedServices((prev) => prev.filter((item) => item.serviceItemId !== s.serviceItemId))}
                          className="text-[10px] text-rose-500 hover:text-rose-600 block text-right mt-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
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
                    <span className="text-[10px] text-slate-400">Proforma quote value</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-amber-500">
                      AED {calculations.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proforma Action Notice */}
              <div className="mt-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                <p className="font-bold flex items-center gap-1.5 mb-0.5">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Proforma Invoice will be activated</span>
                </p>
                <p className="text-[10px] opacity-90 leading-relaxed">
                  Upon creation, an official Proforma Invoice with a unique number is generated immediately. The client will present this to Accounts to convert to work.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="mt-6 space-y-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedServices.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>Creating Client & Proforma...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Create Client & Generate Proforma</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBackToList}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Pop-up Proforma Invoice Preview once created */}
      {showProformaModal && createdProformaId && (
        <ProformaInvoiceModal
          isOpen={showProformaModal}
          proformaId={createdProformaId}
          onClose={() => {
            setShowProformaModal(false);
            onBackToList();
          }}
        />
      )}
    </div>
  );
}

