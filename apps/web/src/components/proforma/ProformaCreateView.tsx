"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Layers,
  DollarSign,
  CalendarDays,
  Hash,
  StickyNote,
  Receipt,
  Search,
  Sparkles,
  Clock,
  Printer,
} from "lucide-react";
import {
  fetchServiceCatalog,
  ServiceCategoryData,
  ServiceItemData,
} from "@/services/service-catalog.service";
import {
  fetchClients,
  fetchSalesStaff,
  ClientData,
  SalesStaffMember,
} from "@/services/client.service";
import {
  createProforma,
  ProformaInvoiceData,
} from "@/services/proforma.service";
import { useAuth } from "@/context/AuthContext";
import { ProformaInvoiceModal } from "./ProformaInvoiceModal";

interface ProformaCreateViewProps {
  orgId?: string;
  orgSubdomain?: string;
  onBack: () => void;
  onCreated?: () => void;
}

interface LineItem {
  serviceItemId: string;
  name: string;
  categoryName: string;
  basePrice: number;
  commissionAmount: number;
  qty: number;
}

type ClientMode = "existing" | "new";

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none transition";

const selectCls =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none transition appearance-none cursor-pointer";

export function ProformaCreateView({
  orgId,
  orgSubdomain,
  onBack,
  onCreated,
}: ProformaCreateViewProps) {
  const { user } = useAuth();

  // ── Mode & Client state ──────────────────────────────────────────────────
  const [clientMode, setClientMode] = useState<ClientMode>("existing");
  const [existingClients, setExistingClients] = useState<ClientData[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // ── New client fields ────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [address, setAddress] = useState("");
  const [trnNumber, setTrnNumber] = useState("");
  const [salesStaffId, setSalesStaffId] = useState("");
  const [staffList, setStaffList] = useState<SalesStaffMember[]>([]);

  // ── Proforma details ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<"ISSUED" | "DRAFT">("ISSUED");
  const [currency, setCurrency] = useState("AED");
  const [validityDays, setValidityDays] = useState("30");
  const [notes, setNotes] = useState(
    "This proforma quotation is valid for 30 days from issuance. Official service activation begins upon confirmation and initial deposit."
  );

  // ── Catalog & Line items ─────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<ServiceCategoryData[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // ── Submission & Preview ─────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [createdProforma, setCreatedProforma] = useState<ProformaInvoiceData | null>(null);

  // ── Load Catalog & Staff ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoadingCatalog(true);
      try {
        const [cat, staff] = await Promise.all([
          fetchServiceCatalog(orgId || orgSubdomain),
          fetchSalesStaff(orgId || orgSubdomain),
        ]);
        if (mounted) {
          setCatalog(cat);
          setStaffList(staff);
          if (cat.length > 0) setActiveCategoryId(cat[0].id);
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
  }, [orgId, orgSubdomain]);

  // ── Load Existing Clients ────────────────────────────────────────────────
  useEffect(() => {
    if (clientMode !== "existing") return;
    let mounted = true;
    async function load() {
      setIsLoadingClients(true);
      try {
        const data = await fetchClients(orgId || orgSubdomain, clientSearch);
        if (mounted) setExistingClients(data);
      } catch (err) {
        console.warn("Failed to load clients:", err);
      } finally {
        if (mounted) setIsLoadingClients(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [clientMode, orgId, orgSubdomain, clientSearch]);

  // ── Populate lines if existing client is selected with existing services ─
  const handleSelectExistingClient = (client: ClientData) => {
    setSelectedExistingClientId(client.id);
    if (client.salesStaffId) {
      setSalesStaffId(client.salesStaffId);
    }
    // If client already has intake services and user has no custom line items yet, suggest preloading
    if (client.services && client.services.length > 0 && lineItems.length === 0) {
      const initialLines: LineItem[] = client.services.map((srv) => ({
        serviceItemId: srv.serviceItemId,
        name: srv.serviceItem?.name || "Service Item",
        categoryName: srv.serviceItem?.category?.name || "Services",
        basePrice: Number(srv.basePrice) || 0,
        commissionAmount: Number(srv.commissionAmount) || 0,
        qty: 1,
      }));
      setLineItems(initialLines);
    }
  };

  // ── Calculations ─────────────────────────────────────────────────────────
  const { subTotal, commission, grandTotal } = useMemo(() => {
    let sub = 0;
    let comm = 0;
    for (const item of lineItems) {
      sub += item.basePrice * item.qty;
      comm += item.commissionAmount * item.qty;
    }
    return { subTotal: sub, commission: comm, grandTotal: sub + comm };
  }, [lineItems]);

  const activeCategory = catalog.find((c) => c.id === activeCategoryId);

  // ── Toggle service ───────────────────────────────────────────────────────
  const toggleService = (svc: ServiceItemData, categoryName: string) => {
    const exists = lineItems.find((li) => li.serviceItemId === svc.id);
    if (exists) {
      setLineItems((prev) => prev.filter((li) => li.serviceItemId !== svc.id));
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          serviceItemId: svc.id,
          name: svc.name,
          categoryName,
          basePrice: Number(svc.basePrice) || 0,
          commissionAmount: 0,
          qty: 1,
        },
      ]);
    }
  };

  const updateLineItem = (
    id: string,
    field: keyof Pick<LineItem, "basePrice" | "commissionAmount" | "qty">,
    value: number
  ) => {
    setLineItems((prev) =>
      prev.map((li) => (li.serviceItemId === id ? { ...li, [field]: value } : li))
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((li) => li.serviceItemId !== id));
  };

  // ── Form Submission ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (lineItems.length === 0) {
      setFeedback({
        type: "error",
        message: "Please add at least one service item to quotation scope.",
      });
      return;
    }

    if (clientMode === "new") {
      if (!companyName.trim()) {
        setFeedback({ type: "error", message: "Company name is required." });
        return;
      }
      if (!clientName.trim()) {
        setFeedback({ type: "error", message: "Contact person / client name is required." });
        return;
      }
      if (!phone.trim()) {
        setFeedback({ type: "error", message: "Phone number is required." });
        return;
      }
    } else {
      if (!selectedExistingClientId) {
        setFeedback({
          type: "error",
          message: "Please select an existing client from the directory.",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await createProforma({
        organisationId: orgId,
        clientId: clientMode === "existing" ? selectedExistingClientId : undefined,
        clientData:
          clientMode === "new"
            ? {
                companyName: companyName.trim(),
                contactPerson: clientName.trim(),
                email:
                  email.trim() ||
                  `${clientName.replace(/\s+/g, ".").toLowerCase()}@client.ae`,
                phoneNumber: phone.trim(),
                whatsappNumber: whatsappNumber.trim() || undefined,
                trnNumber: trnNumber.trim() || undefined,
                address: address.trim() || undefined,
                salesStaffId: salesStaffId || undefined,
              }
            : undefined,
        services: lineItems.map((li) => ({
          serviceItemId: li.serviceItemId,
          basePrice: li.basePrice,
          commissionAmount: li.commissionAmount,
          quantity: li.qty,
        })),
        currency,
        status,
        notes: `${notes.trim()}${validityDays ? ` (Quotation Validity: ${validityDays} Days)` : ""}`,
        generatedById: user?.id,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to create proforma invoice.");
      }

      setFeedback({
        type: "success",
        message: `Proforma Invoice ${res.data.proformaNumber} generated successfully!`,
      });
      setCreatedProforma(res.data);

      setTimeout(() => {
        onCreated?.();
        onBack();
      }, 2000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "An unexpected error occurred while generating proforma invoice.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto pb-20 font-sans select-none animate-fade-in">
      {/* ── Top Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Create Proforma Invoice
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Official Quotation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Draft or issue a commercial proforma quote with customized government fees & service commissions.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          {/* ── Left Column: Client & Scope ── */}
          <div className="space-y-5">
            {/* 1. Client Information Box */}
            <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Client & Account Profile
                  </h2>
                </div>

                {/* Client Mode Switch */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 gap-1">
                  {(["existing", "new"] as ClientMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setClientMode(m)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        clientMode === m
                          ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {m === "existing" ? "Existing Client" : "New Client"}
                    </button>
                  ))}
                </div>
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-3">
                  <Field label="Search Client Directory" required hint="Select client to issue this proforma quotation to">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search by company name, contact, or CLI number..."
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  {/* Clients Picker list */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {isLoadingClients ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                        <span className="ml-2">Searching client records...</span>
                      </div>
                    ) : existingClients.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <Building2 className="h-6 w-6 mx-auto mb-1 opacity-50" />
                        No matching clients found. Switch to &ldquo;New Client&rdquo; to onboard them directly.
                      </div>
                    ) : (
                      existingClients.map((c) => {
                        const isSelected = selectedExistingClientId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectExistingClient(c)}
                            className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between gap-3 transition-colors ${
                              isSelected
                                ? "bg-amber-500/10 text-slate-900 dark:text-white"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                  isSelected
                                    ? "bg-amber-500 text-slate-950"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {(c.companyName || c.contactPerson || "C")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold truncate text-slate-900 dark:text-white">
                                  {c.companyName}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                                  <span>{c.contactPerson}</span>
                                  <span>•</span>
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-medium">
                                    {c.clientNumber || "CLI"}
                                  </span>
                                  {c.phoneNumber && <span>• {c.phoneNumber}</span>}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company Name" required>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Al Noor Trading LLC"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Contact Person / Client Name" required>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Ali Ramez"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Email Address">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@company.ae"
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  <Field label="Phone Number" required>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+971 50 000 0000"
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  <Field label="WhatsApp Number">
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+971 50 000 0000"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="TRN / Tax Registration Number">
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={trnNumber}
                        onChange={(e) => setTrnNumber(e.target.value)}
                        placeholder="100XXXXXXXXX"
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  <Field label="Address / Office Location">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Downtown, Dubai, UAE"
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  <Field label="Assigned Sales Representative">
                    <div className="relative">
                      <select
                        value={salesStaffId}
                        onChange={(e) => setSalesStaffId(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">— Select sales staff —</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName || s.username}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              )}
            </div>

            {/* 2. Service Catalog Selection */}
            <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Service Catalog & Scope Intake
                  </h2>
                </div>
                {lineItems.length > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    {lineItems.length} selected
                  </span>
                )}
              </div>

              {isLoadingCatalog ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  <p className="mt-2">Loading catalog services...</p>
                </div>
              ) : catalog.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Layers className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p>No service items configured in catalog.</p>
                </div>
              ) : (
                <>
                  {/* Category Pills */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {catalog.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          activeCategoryId === cat.id
                            ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Services Grid */}
                  {activeCategory && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeCategory.services
                        .filter((s) => s.isActive)
                        .map((svc) => {
                          const isSelected = lineItems.some(
                            (li) => li.serviceItemId === svc.id
                          );
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => toggleService(svc, activeCategory.name)}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? "border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/30"
                                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {svc.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {activeCategory.name}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                    AED {Number(svc.basePrice).toLocaleString()}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 mt-1 ml-auto" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 3. Proforma Quotation Line Items Table */}
            {lineItems.length > 0 && (
              <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Quotation Line Items & Fee Breakdown
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-2.5 text-left min-w-[160px]">Service Scope</th>
                        <th className="pb-2.5 text-right w-24">Base Gov Fee</th>
                        <th className="pb-2.5 text-right w-28">Commission</th>
                        <th className="pb-2.5 text-right w-20">Qty</th>
                        <th className="pb-2.5 text-right w-28">Total</th>
                        <th className="pb-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {lineItems.map((li) => (
                        <tr key={li.serviceItemId}>
                          <td className="py-2.5 pr-2">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {li.name}
                            </div>
                            <div className="text-[10px] text-slate-400">{li.categoryName}</div>
                          </td>
                          <td className="py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={li.basePrice}
                              onChange={(e) =>
                                updateLineItem(
                                  li.serviceItemId,
                                  "basePrice",
                                  Number(e.target.value)
                                )
                              }
                              className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-right text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={li.commissionAmount}
                              onChange={(e) =>
                                updateLineItem(
                                  li.serviceItemId,
                                  "commissionAmount",
                                  Number(e.target.value)
                                )
                              }
                              className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-right text-xs text-amber-600 dark:text-amber-400 focus:border-amber-500 focus:outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 text-right">
                            <input
                              type="number"
                              min={1}
                              value={li.qty}
                              onChange={(e) =>
                                updateLineItem(
                                  li.serviceItemId,
                                  "qty",
                                  Math.max(1, Number(e.target.value))
                                )
                              }
                              className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-right text-xs text-slate-800 dark:text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
                            />
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {((li.basePrice + li.commissionAmount) * li.qty).toLocaleString()}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(li.serviceItemId)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Settings & Quotation Summary ── */}
          <div className="space-y-5">
            {/* Proforma Settings */}
            <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quotation Settings
                </h2>
              </div>

              <div className="space-y-3.5">
                <Field label="Initial Status">
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className={selectCls}
                    >
                      <option value="ISSUED">Issued (Ready for Client)</option>
                      <option value="DRAFT">Draft (Internal Review)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Quotation Currency">
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={selectCls}
                    >
                      {["AED", "USD", "EUR", "SAR", "QAR", "INR", "GBP"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Quotation Validity">
                  <div className="relative">
                    <select
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      className={selectCls}
                    >
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Terms & Quotation Notes">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Special instructions or payment terms..."
                      className={inputCls + " pl-9 resize-none"}
                    />
                  </div>
                </Field>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Financial Summary
                </h2>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Base Government Total</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {currency} {subTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
                  <span>Service Commission</span>
                  <span className="font-mono font-semibold">
                    + {currency} {commission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Grand Total
                  </span>
                  <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                    {currency} {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Selected Items:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {lineItems.length} service{lineItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`flex items-start gap-2.5 p-4 rounded-xl border text-xs ${
                  feedback.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <button
              type="submit"
              disabled={isSubmitting || lineItems.length === 0}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Generating Proforma...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-slate-950" />
                  <span>Generate Proforma Invoice</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel & Return
            </button>
          </div>
        </div>
      </form>

      {/* Optional Proforma Modal Preview */}
      {createdProforma && (
        <ProformaInvoiceModal
          isOpen={Boolean(createdProforma)}
          proformaId={createdProforma.id}
          initialData={createdProforma}
          onClose={() => setCreatedProforma(null)}
        />
      )}
    </div>
  );
}

