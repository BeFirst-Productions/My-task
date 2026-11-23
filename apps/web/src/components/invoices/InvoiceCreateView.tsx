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
  Eye,
  Printer,
  Sparkles,
} from "lucide-react";
import {
  fetchServiceCatalog,
  ServiceCategoryData,
  ServiceItemData,
} from "@/services/service-catalog.service";
import {
  fetchClients,
  fetchSalesStaff,
  topUpClientWallet,
  ClientData,
  SalesStaffMember,
} from "@/services/client.service";
import { fetchOrganisationSetting, SettingData } from "@/services/setting.service";
import { useAuth } from "@/context/AuthContext";
import { InvoiceDocumentTemplate, InvoiceLineItem } from "./InvoiceDocumentTemplate";
import { ProformaInvoiceModal } from "@/components/proforma/ProformaInvoiceModal";
import { createProforma, ProformaInvoiceData } from "@/services/proforma.service";

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

  // ── Reference / Scope & Payment ───────────────────────────────────────────
  const [serviceRefTitle, setServiceRefTitle] = useState("");
  const [serviceRefDesc, setServiceRefDesc] = useState("Visa renewal and related processing charges");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(5);

  // ── Organisation Settings ─────────────────────────────────────────────────
  const [orgSetting, setOrgSetting] = useState<SettingData | null>(null);

  // ── Services / line items ─────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<ServiceCategoryData[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // ── Modal & Preview ───────────────────────────────────────────────────────
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<ProformaInvoiceData | null>(null);

  // ── Submission ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ─── Load catalog & staff & org settings ──────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoadingCatalog(true);
      try {
        const targetSubdomain = orgSubdomain || user?.organisation?.subdomain || "ibh";
        const [cat, staff, setting] = await Promise.all([
          fetchServiceCatalog(orgId || targetSubdomain),
          fetchSalesStaff(orgId || targetSubdomain),
          fetchOrganisationSetting(targetSubdomain).catch(() => null),
        ]);
        if (mounted) {
          setCatalog(cat);
          setStaffList(staff);
          if (setting) setOrgSetting(setting);
          if (cat.length > 0) setActiveCategoryId(cat[0].id);
        }
      } catch (err) {
        console.warn("Failed to load catalog or settings:", err);
      } finally {
        if (mounted) setIsLoadingCatalog(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, user]);

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

  // Auto-fill Service Reference Title if empty when line items change
  useEffect(() => {
    if (!serviceRefTitle && lineItems.length > 0) {
      setServiceRefTitle(lineItems[0].name.toUpperCase());
    }
  }, [lineItems, serviceRefTitle]);

  // ─── Derived totals ────────────────────────────────────────────────────────
  const { subTotal, commission, grandTotal, vatAmount, computedBalanceDue } = useMemo(() => {
    let sub = 0;
    let comm = 0;
    for (const item of lineItems) {
      sub += item.basePrice * item.qty;
      comm += item.commissionAmount * item.qty;
    }
    const combinedSub = sub + comm;
    const vat = (combinedSub * (vatRate || 0)) / 100;
    const total = combinedSub + vat;
    const balance = Math.max(0, total - (paidAmount || 0));
    return {
      subTotal: sub,
      commission: comm,
      grandTotal: total,
      vatAmount: vat,
      computedBalanceDue: balance,
    };
  }, [lineItems, vatRate, paidAmount]);

  // ─── Active category services ──────────────────────────────────────────────
  const activeCategory = catalog.find((c) => c.id === activeCategoryId);

  // ─── Selected Client Object ────────────────────────────────────────────────
  const selectedClient = useMemo(() => {
    if (clientMode === "existing" && selectedExistingClientId) {
      return existingClients.find((c) => c.id === selectedExistingClientId) || null;
    }
    return null;
  }, [clientMode, selectedExistingClientId, existingClients]);

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

  // ─── Prepared template items ───────────────────────────────────────────────
  const templateLineItems: InvoiceLineItem[] = useMemo(() => {
    return lineItems.map((li, idx) => {
      const unit = li.basePrice + li.commissionAmount;
      return {
        sl: idx + 1,
        description: li.name.toUpperCase(),
        category: li.categoryName,
        qty: li.qty,
        unitPrice: unit,
        totalPrice: unit * li.qty,
      };
    });
  }, [lineItems]);

  const activeOrgData = useMemo(() => {
    return {
      companyName: user?.organisation?.companyName || "INTERNATIONAL BUSINESS HUB",
      subdomain: user?.organisation?.subdomain || orgSubdomain || "ibh",
      logo: user?.organisation?.logo || null,
      primaryLocation: user?.organisation?.primaryLocation || "Dubai, UAE",
      setting: orgSetting
        ? {
            companyAddress: orgSetting.companyAddress,
            supportEmail: orgSetting.supportEmail,
            supportPhone: orgSetting.supportPhone,
            invoiceCurrency: orgSetting.invoiceCurrency || currency,
            companyTagline: "Company Formation • PRO Services • Business Support",
            primaryColor: orgSetting.primaryColor,
          }
        : null,
    };
  }, [user, orgSubdomain, orgSetting, currency]);

  const activeClientData = useMemo(() => {
    if (clientMode === "existing" && selectedClient) {
      return {
        companyName: selectedClient.companyName || selectedClient.contactPerson || "PREMIUM TOPS TRADING L.L.C",
        contactPerson: selectedClient.contactPerson,
        trnNumber: selectedClient.trnNumber || "104541674800003",
        phoneNumber: selectedClient.phoneNumber,
        email: selectedClient.email,
        address: selectedClient.address,
        clientNumber: selectedClient.clientNumber,
      };
    }
    return {
      companyName: companyName.trim() || clientName.trim() || "PREMIUM TOPS TRADING L.L.C",
      contactPerson: clientName.trim() || "Account Representative",
      trnNumber: trnNumber.trim() || "104541674800003",
      phoneNumber: phone.trim() || "+971 50 123 4567",
      email: email.trim() || "client@company.ae",
      address: address.trim() || "Dubai, UAE",
    };
  }, [clientMode, selectedClient, companyName, clientName, trnNumber, phone, email, address]);

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (lineItems.length === 0) {
      setFeedback({ type: "error", message: "Please select at least one service item from the catalog." });
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
      const payloadServices = lineItems.map((li) => ({
        serviceItemId: li.serviceItemId,
        basePrice: li.basePrice,
        commissionAmount: li.commissionAmount,
        quantity: li.qty,
      }));

      const proformaRes = await createProforma({
        organisationId: orgId,
        clientId: clientMode === "existing" ? selectedExistingClientId : undefined,
        clientData:
          clientMode === "new"
            ? {
                companyName: companyName.trim(),
                contactPerson: clientName.trim(),
                email: email.trim() || `${clientName.replace(/\s+/g, ".").toLowerCase()}@placeholder.ae`,
                phoneNumber: phone.trim(),
                trnNumber: trnNumber.trim() || undefined,
                address: address.trim() || undefined,
                salesStaffId: salesStaffId || undefined,
              }
            : undefined,
        services: payloadServices,
        currency,
        vatRate: vatRate !== undefined ? Number(vatRate) : 5,
        status: invoiceStatus === "PAID" ? "CONVERTED_TO_WORK" : invoiceStatus,
        notes: `${notes.trim() ? `${notes.trim()} | ` : ""}${serviceRefTitle ? `Ref: ${serviceRefTitle} | ` : ""}${serviceRefDesc}`,
        generatedById: user?.id,
      });

      if (!proformaRes.success || !proformaRes.data) {
        throw new Error(proformaRes.message || "Failed to create tax invoice.");
      }

      const generatedData = proformaRes.data;

      // If user specified an advance or paid amount, record it against the client's wallet
      if (paidAmount > 0 && generatedData.clientId) {
        try {
          await topUpClientWallet(generatedData.clientId, {
            amount: paidAmount,
            paymentMethod: "BANK_TRANSFER",
            referenceId: serviceRefTitle || undefined,
            notes: `Payment for Tax Invoice ${generatedData.proformaNumber}`,
            createdById: user?.id,
          });
        } catch (walletErr) {
          console.warn("Could not record wallet transaction for initial invoice payment:", walletErr);
        }
      }

      setFeedback({
        type: "success",
        message: `Tax Invoice ${generatedData.proformaNumber} created successfully!`,
      });

      // Show generated invoice modal preview
      setCreatedInvoiceData(generatedData);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1150px] mx-auto pb-20 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Create Tax Invoice
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                UAE Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft or issue a compliant Tax Invoice with dynamic organization branding, client TRN, and itemized calculations.
            </p>
          </div>
        </div>

        {/* Live Preview Button */}
        <button
          type="button"
          onClick={() => setShowLivePreviewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Eye className="h-3.5 w-3.5 text-amber-600" />
          <span>Live Document Preview</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* ─ Client Section ─ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-800">Billed Client Information</h2>
                </div>

                {/* Mode tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 w-fit gap-1">
                  {(["new", "existing"] as ClientMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setClientMode(m)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        clientMode === m
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {m === "new" ? "New Client" : "Existing Client"}
                    </button>
                  ))}
                </div>
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-3">
                  {/* Search box */}
                  <Field label="Search Client Directory" required hint="Select client to bill this invoice to">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search by name, company, or TRN number..."
                        className={inputCls + " pl-9"}
                      />
                    </div>
                  </Field>

                  {/* Client list */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {isLoadingClients ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                        <span className="ml-2">Loading clients…</span>
                      </div>
                    ) : existingClients.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No clients found matching &ldquo;{clientSearch}&rdquo;
                      </div>
                    ) : (
                      existingClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedExistingClientId(c.id)}
                          className={`w-full text-left px-4 py-3 text-xs flex items-center gap-3 transition-colors ${
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
                            <div className="font-semibold truncate">{c.companyName || c.contactPerson}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {c.contactPerson ? `${c.contactPerson} · ` : ""}{c.trnNumber ? `TRN: ${c.trnNumber}` : c.clientNumber}
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
                  <Field label="Client Company Name (BILL TO)" required hint="Company name printed on the invoice header">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. PREMIUM TOPS TRADING L.L.C"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Contact Person / Representative" required>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Farish Mohammed"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="TRN (Tax Registration Number)" hint="Displayed under BILL TO on the invoice">
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={trnNumber}
                        onChange={(e) => setTrnNumber(e.target.value)}
                        placeholder="e.g. 104541674800003"
                        className={inputCls + " pl-9 font-mono"}
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

                  <Field label="Emirate / Physical Address">
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

                  <div className="sm:col-span-2">
                    <Field label="Assigned Sales Coordinator">
                      <div className="relative">
                        <select
                          value={salesStaffId}
                          onChange={(e) => setSalesStaffId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">— Select staff coordinator —</option>
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
                </div>
              )}
            </div>

            {/* ─ Service / Reference Metadata (Matches Reference Card) ─ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">
                  Service / Reference Header Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Service Reference Title"
                  hint="e.g. FARISH VISA RENEWAL (Printed under SERVICE / REFERENCE)"
                >
                  <input
                    type="text"
                    value={serviceRefTitle}
                    onChange={(e) => setServiceRefTitle(e.target.value)}
                    placeholder="e.g. FARISH VISA RENEWAL"
                    className={inputCls + " font-bold uppercase"}
                  />
                </Field>

                <Field
                  label="Scope / Reference Description"
                  hint="e.g. Visa renewal and related processing charges"
                >
                  <input
                    type="text"
                    value={serviceRefDesc}
                    onChange={(e) => setServiceRefDesc(e.target.value)}
                    placeholder="e.g. Visa renewal and related processing charges"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* ─ Service Catalog ─ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Select Corporate Services</h2>
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
                  <p>No services found in database. Add services in Service Management.</p>
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
                            ? "bg-slate-900 text-white shadow-xs"
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
                                  ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/30"
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
                                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 mt-0.5 ml-auto" />
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

            {/* ─ Line Items Table (Matches Invoice Document SL / QTY / UNIT / TOTAL) ─ */}
            {lineItems.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Invoice Itemized Breakdown ({lineItems.length})
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="pb-2 text-center w-10">SL</th>
                        <th className="pb-2 text-left min-w-[160px]">Description</th>
                        <th className="pb-2 text-right w-24">Base Price</th>
                        <th className="pb-2 text-right w-24">Fee/Comm</th>
                        <th className="pb-2 text-center w-20">Qty</th>
                        <th className="pb-2 text-right w-28">Total (AED)</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((li, idx) => (
                        <tr key={li.serviceItemId} className="py-2">
                          <td className="py-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 pr-2">
                            <div className="font-bold text-slate-800 uppercase">{li.name}</div>
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
                              className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
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
                              className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 text-center">
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
                              className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                            {((li.basePrice + li.commissionAmount) * li.qty).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(li.serviceItemId)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
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

          {/* ── Right column (meta + calculations matching template) ── */}
          <div className="space-y-5">
            {/* Invoice details */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Invoice Dates & Terms</h2>
              </div>

              <div className="space-y-3.5">
                <Field label="Invoice Date" required>
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

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Currency">
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className={selectCls}
                      >
                        {["AED", "USD", "EUR", "SAR", "QAR"].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </Field>

                  <Field label="VAT Rate (%)">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className={inputCls + " text-right font-mono font-bold"}
                    />
                  </Field>
                </div>

                <Field label="Advance / Paid Amount (AED)" hint="Calculates Balance Due on the invoice">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      AED
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className={inputCls + " pl-12 font-mono font-bold"}
                    />
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
                      <option value="PAID">Fully Paid</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Notes / Remittance Terms">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Special instructions or compliance references..."
                      className={inputCls + " pl-9 resize-none"}
                    />
                  </div>
                </Field>
              </div>
            </div>

            {/* Calculations Summary Card — Mirrors Reference Image Structure */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Invoice Totals</h2>
              </div>

              <div className="space-y-2 text-xs">
                {/* VAT 5% */}
                <div className="flex justify-between items-center text-slate-600 font-semibold px-1">
                  <span>VAT @ {vatRate}%</span>
                  <span className="font-mono font-bold">
                    {vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Highlighted Cream Total Box */}
                <div className="flex justify-between items-center py-2.5 px-3.5 rounded-lg bg-[#FAF4EB] border border-[#e8decb] text-slate-950 font-black">
                  <span className="uppercase tracking-wider">TOTAL</span>
                  <span className="font-mono text-base font-bold">
                    {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Paid */}
                <div className="flex justify-between items-center text-slate-600 font-semibold px-1">
                  <span>PAID</span>
                  <span className="font-mono font-bold">
                    {paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Solid Navy Balance Due Card */}
                <div className="mt-2 rounded-xl bg-[#0c1829] text-white p-3.5 flex items-center justify-between shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    BALANCE DUE
                  </span>
                  <span className="text-base font-black font-mono text-white">
                    {currency} {computedBalanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
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

            {/* Action Buttons */}
            <button
              type="submit"
              disabled={isSubmitting || lineItems.length === 0}
              className="w-full py-3 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generating Tax Invoice…</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create & Issue Tax Invoice</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowLivePreviewModal(true)}
              className="w-full py-2.5 px-5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-amber-600" />
              <span>Preview Before Issuing</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-2 px-5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {/* ── LIVE PREVIEW MODAL ── */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Live Preview: UAE Tax Invoice Format
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLivePreviewModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
              <div className="rounded-2xl border border-slate-200/80 shadow-md bg-white overflow-hidden">
                <InvoiceDocumentTemplate
                  documentType="INVOICE"
                  invoiceNumber={`IBH-17001/${new Date().getFullYear().toString().slice(-2)}`}
                  issueDate={issueDate}
                  dueDate={dueDate}
                  organisation={activeOrgData}
                  client={activeClientData}
                  serviceReference={{
                    title: (serviceRefTitle || "CORPORATE SERVICES").toUpperCase(),
                    description: serviceRefDesc || notes || "Visa renewal and related processing charges",
                  }}
                  items={templateLineItems}
                  currency={currency}
                  vatRate={vatRate}
                  vatAmount={vatAmount}
                  subTotal={subTotal + commission}
                  totalAmount={grandTotal}
                  paidAmount={paidAmount}
                  balanceDue={computedBalanceDue}
                  notes={notes}
                  showBankDetails={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POST-CREATION DOCUMENT MODAL ── */}
      {createdInvoiceData && (
        <ProformaInvoiceModal
          isOpen={Boolean(createdInvoiceData)}
          initialData={createdInvoiceData}
          documentType="INVOICE"
          onClose={() => {
            setCreatedInvoiceData(null);
            onCreated?.();
            onBack();
          }}
        />
      )}
    </div>
  );
}
