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
  X,
} from "lucide-react";
import {
  fetchServiceCatalog,
  ServiceCategoryData,
  ServiceItemData,
} from "@/services/service-catalog.service";
import {
  createClient,
  fetchClients,
  fetchSalesStaff,
  generateClientProforma,
  ClientData,
  SalesStaffMember,
} from "@/services/client.service";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceCreateViewProps {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition";

const selectCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition appearance-none cursor-pointer";

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvoiceCreateView({
  orgId,
  orgSubdomain,
  onBack,
  onCreated,
}: InvoiceCreateViewProps) {
  const { user } = useAuth();

  // ── Client mode ──────────────────────────────────────────────────────────────
  const [clientMode, setClientMode] = useState<ClientMode>("new");
  const [existingClients, setExistingClients] = useState<ClientData[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // ── New client fields ─────────────────────────────────────────────────────
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [trnNumber, setTrnNumber] = useState("");
  const [salesStaffId, setSalesStaffId] = useState("");
  const [staffList, setStaffList] = useState<SalesStaffMember[]>([]);

  // ── Invoice meta fields ───────────────────────────────────────────────────
  const [issueDate, setIssueDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [invoiceStatus, setInvoiceStatus] = useState<"DRAFT" | "ISSUED" | "PAID">("ISSUED");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("AED");

  // ── Services / line items ─────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<ServiceCategoryData[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // ── Submission ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Load catalog & staff ─────────────────────────────────────────────────
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
        console.warn("Failed to load catalog:", err);
      } finally {
        if (mounted) setIsLoadingCatalog(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain]);

  // ─── Load existing clients ─────────────────────────────────────────────────
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

  // ─── Derived totals ────────────────────────────────────────────────────────
  const { subTotal, commission, grandTotal } = useMemo(() => {
    let sub = 0;
    let comm = 0;
    for (const item of lineItems) {
      sub += item.basePrice * item.qty;
      comm += item.commissionAmount * item.qty;
    }
    return { subTotal: sub, commission: comm, grandTotal: sub + comm };
  }, [lineItems]);

  // ─── Active category services ──────────────────────────────────────────────
  const activeCategory = catalog.find((c) => c.id === activeCategoryId);

  // ─── Add / remove line items ───────────────────────────────────────────────
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

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (lineItems.length === 0) {
      setFeedback({ type: "error", message: "Please add at least one service line item." });
      return;
    }

    if (clientMode === "new") {
      if (!companyName.trim()) {
        setFeedback({ type: "error", message: "Company name is required." });
        return;
      }
      if (!clientName.trim()) {
        setFeedback({ type: "error", message: "Client name is required." });
        return;
      }
      if (!phone.trim()) {
        setFeedback({ type: "error", message: "Phone number is required." });
        return;
      }
    } else {
      if (!selectedExistingClientId) {
        setFeedback({ type: "error", message: "Please select an existing client." });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let clientId: string;

      if (clientMode === "new") {
        // 1. Create the client
        const createRes = await createClient({
          organisationId: orgId,
          companyName: companyName.trim(),
          contactPerson: clientName.trim(),
          email: email.trim() || `${clientName.replace(/\s+/g, ".").toLowerCase()}@placeholder.ae`,
          phoneNumber: phone.trim(),
          trnNumber: trnNumber.trim() || undefined,
          address: address.trim() || undefined,
          salesStaffId: salesStaffId || undefined,
          services: lineItems.map((li) => ({
            serviceItemId: li.serviceItemId,
            basePrice: li.basePrice * li.qty,
            commissionAmount: li.commissionAmount * li.qty,
          })),
          notes: notes.trim() || undefined,
          createdById: user?.id,
        });

        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.message || "Failed to create client.");
        }
        clientId = createRes.data.id;
      } else {
        clientId = selectedExistingClientId;
      }

      // 2. Generate the proforma/invoice
      const proformaRes = await generateClientProforma(clientId, true);
      if (!proformaRes.success) {
        throw new Error(proformaRes.message || "Failed to generate invoice.");
      }

      setFeedback({
        type: "success",
        message: `Invoice ${proformaRes.data?.proformaNumber || ""} created successfully!`,
      });

      // Reset after 2 s then go back
      setTimeout(() => {
        onCreated?.();
        onBack();
      }, 2000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1100px] mx-auto pb-20 font-sans">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Invoice
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fill in client details, select services, and generate an invoice.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* ─ Client Section ─ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Client Information</h2>
              </div>

              {/* Mode tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 mb-4 w-fit gap-1">
                {(["new", "existing"] as ClientMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setClientMode(m)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      clientMode === m
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m === "new" ? "New Client" : "Existing Client"}
                  </button>
                ))}
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-3">
                  {/* Search box */}
                  <Field label="Search client" required>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search by name, company or client ID..."
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  {/* Client list */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    {isLoadingClients ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                        <span className="ml-2">Loading clients…</span>
                      </div>
                    ) : existingClients.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No clients found
                      </div>
                    ) : (
                      existingClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedExistingClientId(c.id)}
                          className={`w-full text-left px-4 py-3 text-xs border-b border-slate-100 last:border-0 flex items-center gap-3 transition-colors ${
                            selectedExistingClientId === c.id
                              ? "bg-orange-50 text-orange-700"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                              selectedExistingClientId === c.id
                                ? "bg-orange-200 text-orange-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {(c.contactPerson || c.companyName || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{c.contactPerson || c.companyName}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {c.companyName} · {c.clientNumber}
                            </div>
                          </div>
                          {selectedExistingClientId === c.id && (
                            <CheckCircle2 className="h-4 w-4 text-orange-500 ml-auto shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Client Name" required>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Ali Ramez"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Company Name" required>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Al Noor Trading LLC"
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

                  <Field label="TRN Number">
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={trnNumber}
                        onChange={(e) => setTrnNumber(e.target.value)}
                        placeholder="Tax Registration Number"
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  <Field label="Address">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Dubai, UAE"
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  <Field label="Assigned Sales Staff">
                    <div className="relative">
                      <select
                        value={salesStaffId}
                        onChange={(e) => setSalesStaffId(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">— Select staff —</option>
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

            {/* ─ Service Catalog ─ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Service Catalog</h2>
                {lineItems.length > 0 && (
                  <span className="ml-auto text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    {lineItems.length} selected
                  </span>
                )}
              </div>

              {isLoadingCatalog ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  <p className="mt-2">Loading catalog…</p>
                </div>
              ) : catalog.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Layers className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p>No services found. Add services in Service Management.</p>
                </div>
              ) : (
                <>
                  {/* Category tabs */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {catalog.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeCategoryId === cat.id
                            ? "bg-orange-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Service items grid */}
                  {activeCategory && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeCategory.services
                        .filter((s) => s.isActive)
                        .map((svc) => {
                          const selected = lineItems.some(
                            (li) => li.serviceItemId === svc.id
                          );
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() =>
                                toggleService(svc, activeCategory.name)
                              }
                              className={`w-full text-left p-3 rounded-xl border transition-all ${
                                selected
                                  ? "border-orange-400 bg-orange-50 ring-1 ring-orange-400/30"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {svc.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {activeCategory.name}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold text-slate-700">
                                    AED {Number(svc.basePrice).toLocaleString()}
                                  </p>
                                  {selected && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 mt-0.5 ml-auto" />
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

            {/* ─ Line Items Table ─ */}
            {lineItems.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-800">Invoice Line Items</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="pb-2 text-left min-w-[160px]">Service</th>
                        <th className="pb-2 text-right w-24">Base Price</th>
                        <th className="pb-2 text-right w-28">Commission</th>
                        <th className="pb-2 text-right w-20">Qty</th>
                        <th className="pb-2 text-right w-28">Total</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((li) => (
                        <tr key={li.serviceItemId} className="py-2">
                          <td className="py-2.5 pr-2">
                            <div className="font-semibold text-slate-800">{li.name}</div>
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
                              className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs text-slate-800 focus:border-orange-400 focus:outline-none"
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
                              className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs text-slate-800 focus:border-orange-400 focus:outline-none"
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
                              className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs text-slate-800 focus:border-orange-400 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-800">
                            {((li.basePrice + li.commissionAmount) * li.qty).toLocaleString()}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(li.serviceItemId)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Remove"
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

          {/* ── Right column (meta + summary) ── */}
          <div className="space-y-5">
            {/* Invoice details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Invoice Details</h2>
              </div>

              <div className="space-y-3.5">
                <Field label="Issue Date" required>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className={inputCls + " pl-9"}
                    />
                  </div>
                </Field>

                <Field label="Due Date" required>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={inputCls + " pl-9"}
                    />
                  </div>
                </Field>

                <Field label="Currency">
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={selectCls}
                    >
                      {["AED", "USD", "EUR", "GBP", "SAR", "QAR", "INR"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Invoice Status">
                  <div className="relative">
                    <select
                      value={invoiceStatus}
                      onChange={(e) => setInvoiceStatus(e.target.value as any)}
                      className={selectCls}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ISSUED">Issued / Pending</option>
                      <option value="PAID">Paid</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Notes">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional notes or payment terms..."
                      className={inputCls + " pl-9 resize-none"}
                    />
                  </div>
                </Field>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Invoice Summary</h2>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold">
                    {currency} {subTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-amber-600">
                  <span>Commission</span>
                  <span className="font-mono font-semibold">
                    + {currency} {commission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-200 my-1" />
                <div className="flex justify-between text-sm font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="font-mono text-orange-600">
                    {currency} {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Line item count */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{lineItems.length}</span>{" "}
                service{lineItems.length !== 1 ? "s" : ""} selected
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`flex items-start gap-2.5 p-4 rounded-xl border text-xs ${
                  feedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border-rose-200 text-rose-700"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || lineItems.length === 0}
              className="w-full py-3 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating Invoice…</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Invoice</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

