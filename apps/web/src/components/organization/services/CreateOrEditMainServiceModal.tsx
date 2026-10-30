"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Layers,
  DollarSign,
  Tag,
} from "lucide-react";
import {
  MainService,
  SERVICE_CURRENCIES,
} from "@/services/service-catalog.service";

interface SubcategoryFormRow {
  id?: string;
  name: string;
  price: string | number;
  currency: string;
  description: string;
  governmentFee?: string | number;
  serviceFee?: string | number;
  status: "ACTIVE" | "INACTIVE";
}

interface CreateOrEditMainServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
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
  }) => Promise<void>;
  editingService?: MainService | null;
}

export function CreateOrEditMainServiceModal({
  isOpen,
  onClose,
  onSave,
  editingService,
}: CreateOrEditMainServiceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [currency, setCurrency] = useState("AED");

  const [subcategories, setSubcategories] = useState<SubcategoryFormRow[]>([
    {
      name: "",
      price: "",
      currency: "AED",
      description: "",
      status: "ACTIVE",
    },
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingService) {
      setName(editingService.name || "");
      setDescription(editingService.description || "");
      setStatus(editingService.status || "ACTIVE");

      if (editingService.innerServices && editingService.innerServices.length > 0) {
        setSubcategories(
          editingService.innerServices.map((is) => ({
            id: is.id,
            name: is.name,
            price: is.price,
            currency: is.currency || "AED",
            description: is.description || "",
            governmentFee: is.governmentFee ?? "",
            serviceFee: is.serviceFee ?? "",
            status: is.status || "ACTIVE",
          }))
        );
      } else {
        setSubcategories([
          {
            name: "",
            price: "",
            currency: "AED",
            description: "",
            status: "ACTIVE",
          },
        ]);
      }
    } else {
      setName("");
      setDescription("");
      setStatus("ACTIVE");
      setCurrency("AED");
      setSubcategories([
        {
          name: "",
          price: "",
          currency: "AED",
          description: "",
          status: "ACTIVE",
        },
      ]);
    }
    setErrors({});
  }, [editingService, isOpen]);

  const handleAddSubcategoryRow = () => {
    setSubcategories((prev) => [
      ...prev,
      {
        name: "",
        price: "",
        currency: currency,
        description: "",
        status: "ACTIVE",
      },
    ]);
  };

  const handleRemoveSubcategoryRow = (index: number) => {
    if (subcategories.length === 1) {
      setSubcategories([
        {
          name: "",
          price: "",
          currency: currency,
          description: "",
          status: "ACTIVE",
        },
      ]);
      return;
    }
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubcategoryChange = (
    index: number,
    field: keyof SubcategoryFormRow,
    value: any
  ) => {
    setSubcategories((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Category name is required.";
    }

    // Validate subcategories that have names
    const filledSubcategories = subcategories.filter((row) => row.name.trim() !== "");
    for (let i = 0; i < filledSubcategories.length; i++) {
      const row = filledSubcategories[i];
      if (row.price === "" || isNaN(Number(row.price)) || Number(row.price) < 0) {
        newErrors[`sub_price_${i}`] = `Valid price is required for "${row.name}".`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingService?.id,
        name: name.trim(),
        code: editingService?.code,
        department: editingService?.department || "General",
        description: description.trim(),
        status,
        innerServices: filledSubcategories.map((row) => ({
          id: row.id,
          name: row.name.trim(),
          price: Number(row.price) || 0,
          currency: row.currency || currency,
          description: row.description.trim(),
          governmentFee: row.governmentFee ? Number(row.governmentFee) : undefined,
          serviceFee: row.serviceFee ? Number(row.serviceFee) : undefined,
          status: row.status,
        })),
      });
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || "Failed to save category." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 transition-all">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-[#131620]/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingService ? "Edit Category & Subcategories" : "Create New Category"}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {editingService ? "Edit Mode" : "New"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set up the main category and add subcategories with service pricing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errors.form && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {errors.form}
            </div>
          )}

          {/* Section 1: Category */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-[#141620]/40 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                <Tag className="h-3.5 w-3.5 text-amber-500" />
                <span>1. Category</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <button
                  type="button"
                  onClick={() => setStatus((s) => (s === "ACTIVE" ? "INACTIVE" : "ACTIVE"))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30"
                  }`}
                >
                  {status === "ACTIVE" ? "● Active" : "○ Inactive"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Trade License Services, Visa Services, Corporate Banking"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d28] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium"
                />
                {errors.name && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe this category..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d28] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Subcategories */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-[#141620]/40 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                  <span>2. Subcategories</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Add subcategories and their service prices under this category.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-400">Currency:</span>
                <select
                  value={currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCurrency(c);
                    setSubcategories((prev) =>
                      prev.map((row) => ({ ...row, currency: c }))
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1d28] text-xs font-bold text-amber-500"
                >
                  {SERVICE_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddSubcategoryRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Subcategory</span>
                </button>
              </div>
            </div>

            {/* Subcategory Rows */}
            <div className="space-y-3">
              {subcategories.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#171a25] shadow-xs transition-all hover:border-amber-500/40"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Index Badge */}
                    <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Subcategory Name */}
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Subcategory Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleSubcategoryChange(idx, "name", e.target.value)}
                        placeholder="e.g. New Mainland Commercial License"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#11131c] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium"
                      />
                    </div>

                    {/* Price */}
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Service Price ({row.currency || currency}) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500 pointer-events-none">
                          {row.currency || currency}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.price}
                          onChange={(e) => handleSubcategoryChange(idx, "price", e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#11131c] text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      {errors[`sub_price_${idx}`] && (
                        <p className="text-[10px] text-rose-500 mt-1 font-medium">
                          {errors[`sub_price_${idx}`]}
                        </p>
                      )}
                    </div>

                    {/* Remove Action */}
                    <div className="sm:col-span-1 flex items-center justify-end sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategoryRow(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove subcategory"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add button below */}
            <button
              type="button"
              onClick={handleAddSubcategoryRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500/50 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-all bg-white/40 dark:bg-transparent"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Another Subcategory</span>
            </button>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#131620]">
          <div className="text-xs text-slate-400">
            {subcategories.filter((r) => r.name.trim() !== "").length} subcategory(ies) configured
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-[#b85817] hover:bg-[#a14b12] text-white font-bold text-xs shadow-md shadow-orange-950/20 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingService ? "Update Category" : "Save Category"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
