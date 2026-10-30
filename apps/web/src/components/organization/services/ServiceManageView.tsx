"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  DollarSign,
  ArrowUpDown,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Tag,
  PlusCircle,
  X,
} from "lucide-react";
import {
  MainService,
  InnerService,
  fetchMainServices,
  createMainService,
  updateMainService,
  deleteMainService,
  addInnerService,
  updateInnerService,
  deleteInnerService,
  resetServiceCatalog,
} from "@/services/service-catalog.service";
import { CreateOrEditMainServiceModal } from "./CreateOrEditMainServiceModal";
import { AddInnerServiceModal } from "./AddInnerServiceModal";
import { EditInnerServiceModal } from "./EditInnerServiceModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface ServiceManageViewProps {
  orgId?: string;
  orgSubdomain?: string;
  orgName?: string;
}

export function ServiceManageView({
  orgId,
  orgSubdomain,
  orgName = "Invest First Business Services",
}: ServiceManageViewProps) {
  const orgIdentifier = orgId || orgSubdomain || "default";

  const [services, setServices] = useState<MainService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "count" | "newest">("name");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Inline Quick Add states per category
  const [quickAddRow, setQuickAddRow] = useState<{
    [mainId: string]: { name: string; price: string };
  }>({});

  // Modals state
  const [isMainModalOpen, setIsMainModalOpen] = useState(false);
  const [editingMainService, setEditingMainService] = useState<MainService | null>(null);

  const [isAddInnerModalOpen, setIsAddInnerModalOpen] = useState(false);
  const [targetMainForInner, setTargetMainForInner] = useState<MainService | null>(null);

  const [isEditInnerModalOpen, setIsEditInnerModalOpen] = useState(false);
  const [editingInnerData, setEditingInnerData] = useState<{
    mainId: string;
    mainName: string;
    inner: InnerService;
  } | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemTitle?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMainServices(orgIdentifier);
      setServices(data || []);
      setExpandedIds(new Set((data || []).map((s) => s.id)));
    } catch (err) {
      console.error("Failed to load services:", err);
      showFeedback("error", "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgIdentifier]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(services.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filtered & Sorted Categories
  const filteredServices = useMemo(() => {
    return services
      .filter((main) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMainName = main.name.toLowerCase().includes(q);
          const matchDesc = main.description?.toLowerCase().includes(q) || false;
          const matchInner = (main.innerServices || []).some(
            (is) =>
              is.name.toLowerCase().includes(q) ||
              is.description?.toLowerCase().includes(q) ||
              String(is.price).includes(q)
          );
          if (!matchMainName && !matchDesc && !matchInner) {
            return false;
          }
        }

        if (selectedStatus !== "ALL" && main.status !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "count") {
          return (b.innerServices?.length || 0) - (a.innerServices?.length || 0);
        }
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [services, searchQuery, selectedStatus, sortBy]);

  // KPI Stats
  const stats = useMemo(() => {
    const totalCategories = services.length;
    const activeCategories = services.filter((s) => s.status === "ACTIVE").length;

    let totalSubcategories = 0;
    let activeSubcategories = 0;
    let totalPriceSum = 0;
    let priceCount = 0;

    services.forEach((s) => {
      (s.innerServices || []).forEach((inner) => {
        totalSubcategories++;
        if (inner.status === "ACTIVE") activeSubcategories++;
        if (inner.price && inner.price > 0) {
          totalPriceSum += inner.price;
          priceCount++;
        }
      });
    });

    const avgPrice = priceCount > 0 ? Math.round(totalPriceSum / priceCount) : 0;

    return {
      totalCategories,
      activeCategories,
      totalSubcategories,
      activeSubcategories,
      avgPrice,
    };
  }, [services]);

  // Category CRUD
  const handleSaveCategory = async (payload: {
    id?: string;
    name: string;
    code?: string;
    description: string;
    department?: string;
    status: "ACTIVE" | "INACTIVE";
    innerServices: Array<{
      id?: string;
      name: string;
      price: number;
      currency: string;
      duration?: string;
      description: string;
      governmentFee?: number;
      serviceFee?: number;
      status: "ACTIVE" | "INACTIVE";
    }>;
  }) => {
    if (payload.id) {
      const updated = await updateMainService(
        payload.id,
        {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          innerServices: payload.innerServices.map((row) => ({
            id: row.id || `is-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: row.name,
            price: row.price,
            currency: row.currency,
            description: row.description,
            status: row.status,
          })),
        },
        orgIdentifier
      );
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showFeedback("success", `Category "${updated.name}" updated successfully.`);
    } else {
      const created = await createMainService(
        {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          innerServices: payload.innerServices,
        },
        orgIdentifier
      );
      setServices((prev) => [created, ...prev]);
      setExpandedIds((prev) => new Set([...prev, created.id]));
      showFeedback("success", `Category "${created.name}" created successfully.`);
    }
  };

  const handleToggleCategoryStatus = async (service: MainService) => {
    const nextStatus = service.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await updateMainService(
        service.id,
        { status: nextStatus },
        orgIdentifier
      );
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showFeedback(
        "success",
        `Category status changed to ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}.`
      );
    } catch (err) {
      showFeedback("error", "Failed to toggle status.");
    }
  };

  const handleDeleteCategory = (service: MainService) => {
    setDeleteModalState({
      isOpen: true,
      title: "Delete Category?",
      itemTitle: service.name,
      description: `This will permanently delete "${service.name}" along with all its ${
        service.innerServices?.length || 0
      } subcategories.`,
      onConfirm: async () => {
        await deleteMainService(service.id, orgIdentifier);
        setServices((prev) => prev.filter((s) => s.id !== service.id));
        showFeedback("success", `Category "${service.name}" deleted.`);
      },
    });
  };

  // Subcategory CRUD
  const handleAddSubcategory = async (
    mainServiceId: string,
    inner: {
      name: string;
      price: number;
      currency: string;
      duration?: string;
      description: string;
      governmentFee?: number;
      serviceFee?: number;
      status: "ACTIVE" | "INACTIVE";
    }
  ) => {
    const updated = await addInnerService(mainServiceId, inner, orgIdentifier);
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showFeedback("success", `Subcategory "${inner.name}" added successfully.`);
  };

  const handleSaveSubcategoryEdit = async (
    mainServiceId: string,
    innerId: string,
    payload: Partial<InnerService>
  ) => {
    const updated = await updateInnerService(
      mainServiceId,
      innerId,
      payload,
      orgIdentifier
    );
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showFeedback("success", "Subcategory updated successfully.");
  };

  const handleToggleSubcategoryStatus = async (
    mainServiceId: string,
    inner: InnerService
  ) => {
    const next = inner.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const updated = await updateInnerService(
      mainServiceId,
      inner.id,
      { status: next },
      orgIdentifier
    );
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSubcategory = (
    mainService: MainService,
    inner: InnerService
  ) => {
    setDeleteModalState({
      isOpen: true,
      title: "Delete Subcategory?",
      itemTitle: `${inner.name} (${inner.currency || "AED"} ${inner.price.toLocaleString()})`,
      description: `Are you sure you want to delete this subcategory from "${mainService.name}"?`,
      onConfirm: async () => {
        const updated = await deleteInnerService(
          mainService.id,
          inner.id,
          orgIdentifier
        );
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showFeedback("success", `Subcategory "${inner.name}" deleted.`);
      },
    });
  };

  // Inline Quick Add Handler
  const handleQuickAddSubcategory = async (mainServiceId: string) => {
    const current = quickAddRow[mainServiceId] || { name: "", price: "" };
    if (!current.name.trim()) {
      showFeedback("error", "Please enter a subcategory name.");
      return;
    }
    const priceNum = Number(current.price);
    if (isNaN(priceNum) || priceNum < 0 || current.price === "") {
      showFeedback("error", "Please enter a valid price.");
      return;
    }

    try {
      const updated = await addInnerService(
        mainServiceId,
        {
          name: current.name.trim(),
          price: priceNum,
          currency: "AED",
          description: "",
          status: "ACTIVE",
        },
        orgIdentifier
      );
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setQuickAddRow((prev) => ({
        ...prev,
        [mainServiceId]: { name: "", price: "" },
      }));
      showFeedback("success", `Added "${current.name.trim()}" successfully.`);
    } catch (err) {
      showFeedback("error", "Failed to add subcategory.");
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all categories and subcategories?"
      )
    ) {
      await resetServiceCatalog(orgIdentifier);
      setServices([]);
      setExpandedIds(new Set());
      showFeedback("success", "All categories cleared.");
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ["Category", "Status", "Subcategory Name", "Price", "Currency", "Subcategory Status"],
    ];

    services.forEach((main) => {
      if (!main.innerServices || main.innerServices.length === 0) {
        rows.push([`"${main.name.replace(/"/g, '""')}"`, main.status, "", "", "", ""]);
      } else {
        main.innerServices.forEach((inner) => {
          rows.push([
            `"${main.name.replace(/"/g, '""')}"`,
            main.status,
            `"${inner.name.replace(/"/g, '""')}"`,
            String(inner.price),
            inner.currency || "AED",
            inner.status,
          ]);
        });
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `service-categories-${orgIdentifier}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between shadow-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. HEADER & PRIMARY ACTIONS                               */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Service Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Admin & Super Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage service categories and configure subcategories with custom pricing.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {services.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all categories"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-xs transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}

          {services.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export catalog as CSV"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141c] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingMainService(null);
              setIsMainModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b85817] hover:bg-[#a14b12] text-white font-bold text-xs transition-all shadow-md shadow-orange-950/20 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. KPI STATS CARDS                                       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Categories */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20">
              {stats.activeCategories} Active
            </span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Categories
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.totalCategories}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Primary categories</p>
          </div>
        </div>

        {/* Card 2: Subcategories */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Tag className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-500/20">
              {stats.activeSubcategories} Active
            </span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Subcategories
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.totalSubcategories}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Priced sub-services</p>
          </div>
        </div>

        {/* Card 3: Average Service Price */}
        <div className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20">
              AED
            </span>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Average Service Price
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              AED {stats.avgPrice.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Average across catalog</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SEARCH & TOOLBAR                                      */}
      {/* ========================================================= */}
      <div className="p-3.5 bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category, subcategory or price..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#181a24] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#181a24] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#181a24] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="name">Sort by Name</option>
              <option value="count">Most Subcategories</option>
              <option value="newest">Recently Added</option>
            </select>
          </div>

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#181a24] p-0.5">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-500 transition-colors"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-500 transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. CATEGORY ACCORDION CARDS                              */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading categories...</span>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/40 dark:bg-[#10121a]/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Categories Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedStatus !== "ALL"
              ? "No categories matched your current filters."
              : "Create your first category and add subcategories with pricing."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {(searchQuery || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingMainService(null);
                setIsMainModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#b85817] hover:bg-[#a14b12] text-white text-xs font-bold transition-all shadow-md shadow-orange-950/20"
            >
              <Plus className="h-4 w-4" />
              <span>Create Category</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((main) => {
            const isExpanded = expandedIds.has(main.id);
            const inners = main.innerServices || [];
            const prices = inners.map((i) => i.price).filter((p) => p > 0);
            const minPrice = prices.length ? Math.min(...prices) : 0;
            const maxPrice = prices.length ? Math.max(...prices) : 0;

            const inlineRow = quickAddRow[main.id] || {
              name: "",
              price: "",
            };

            return (
              <div
                key={main.id}
                className="bg-white dark:bg-[#12141c] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200 hover:border-amber-500/30"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(main.id)}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/40 dark:bg-[#131620]/40 hover:bg-slate-50/80 dark:hover:bg-[#161824]/60 transition-colors"
                >
                  {/* Left: Category Title & Status */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-500 mt-0.5 sm:mt-0 shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-amber-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCategoryStatus(main);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            main.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-slate-500/15 text-slate-400 hover:bg-slate-500/25"
                          }`}
                          title="Click to toggle status"
                        >
                          {main.status === "ACTIVE" ? "● Active" : "○ Inactive"}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
                        {main.name}
                      </h3>

                      {main.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-2xl">
                          {main.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Subcategories count & Actions */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center flex-wrap gap-3 shrink-0 ml-8 lg:ml-0"
                  >
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1">
                        <Tag className="h-3.5 w-3.5 text-amber-500" />
                        <span>{inners.length} Subcategor{inners.length === 1 ? "y" : "ies"}</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        {minPrice > 0 ? (
                          minPrice === maxPrice ? (
                            `AED ${minPrice.toLocaleString()}`
                          ) : (
                            `AED ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`
                          )
                        ) : (
                          "No priced subcategories"
                        )}
                      </div>
                    </div>

                    <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                    <button
                      type="button"
                      onClick={() => {
                        setTargetMainForInner(main);
                        setIsAddInnerModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all shadow-xs active:scale-98"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Subcategory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingMainService(main);
                        setIsMainModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(main)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#10121a]/60">
                    {inners.length === 0 ? (
                      <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141620]/30">
                        <Tag className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No Subcategories Added Yet
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Add the subcategory name and service price below.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetMainForInner(main);
                            setIsAddInnerModalOpen(true);
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Subcategory</span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-[#141620] text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800 tracking-wider">
                            <tr>
                              <th className="py-3 px-4 w-12 text-center">#</th>
                              <th className="py-3 px-4">Subcategory Name</th>
                              <th className="py-3 px-4 font-extrabold text-amber-600 dark:text-amber-400">
                                Price (AED)
                              </th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                            {inners.map((inner, idx) => (
                              <tr
                                key={inner.id}
                                className="hover:bg-slate-50/70 dark:hover:bg-[#161824]/60 transition-colors group"
                              >
                                <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                                  {idx + 1}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {inner.name}
                                  </div>
                                  {inner.description && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 max-w-md truncate">
                                      {inner.description}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-500/20">
                                    {inner.currency || "AED"} {inner.price.toLocaleString()}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubcategoryStatus(main.id, inner)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                      inner.status === "ACTIVE"
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                        : "bg-slate-500/15 text-slate-400"
                                    }`}
                                  >
                                    {inner.status === "ACTIVE" ? "Active" : "Inactive"}
                                  </button>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingInnerData({
                                          mainId: main.id,
                                          mainName: main.name,
                                          inner,
                                        });
                                        setIsEditInnerModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Edit Subcategory"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubcategory(main, inner)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                      title="Delete Subcategory"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* INLINE QUICK ADD ROW (Subcategory Name + Price)          */}
                    {/* ========================================================= */}
                    <div className="mt-4 p-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.02]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                          <PlusCircle className="h-4 w-4" />
                          <span>Quick Add Subcategory:</span>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-8">
                            <input
                              type="text"
                              value={inlineRow.name}
                              onChange={(e) =>
                                setQuickAddRow((prev) => ({
                                  ...prev,
                                  [main.id]: { ...inlineRow, name: e.target.value },
                                }))
                              }
                              placeholder="Subcategory Name (e.g. Standard License Renewal)"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161824] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <input
                              type="number"
                              min="0"
                              value={inlineRow.price}
                              onChange={(e) =>
                                setQuickAddRow((prev) => ({
                                  ...prev,
                                  [main.id]: { ...inlineRow, price: e.target.value },
                                }))
                              }
                              placeholder="Price in AED"
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161824] text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickAddSubcategory(main.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#b85817] hover:bg-[#a14b12] text-white font-bold text-xs transition-all shadow-xs shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateOrEditMainServiceModal
        isOpen={isMainModalOpen}
        onClose={() => {
          setIsMainModalOpen(false);
          setEditingMainService(null);
        }}
        onSave={handleSaveCategory}
        editingService={editingMainService}
      />

      <AddInnerServiceModal
        isOpen={isAddInnerModalOpen}
        onClose={() => {
          setIsAddInnerModalOpen(false);
          setTargetMainForInner(null);
        }}
        targetMainService={targetMainForInner}
        onAdd={handleAddSubcategory}
      />

      {editingInnerData && (
        <EditInnerServiceModal
          isOpen={isEditInnerModalOpen}
          onClose={() => {
            setIsEditInnerModalOpen(false);
            setEditingInnerData(null);
          }}
          mainServiceId={editingInnerData.mainId}
          mainServiceName={editingInnerData.mainName}
          innerService={editingInnerData.inner}
          onSave={handleSaveSubcategoryEdit}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() =>
          setDeleteModalState((prev) => ({ ...prev, isOpen: false }))
        }
        title={deleteModalState.title}
        description={deleteModalState.description}
        itemTitle={deleteModalState.itemTitle}
        onConfirm={deleteModalState.onConfirm}
      />
    </div>
  );
}
