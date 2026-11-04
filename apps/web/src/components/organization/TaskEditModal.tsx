"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Edit3,
  Search,
  FileText,
  User,
  AlertCircle,
  ChevronDown,
  Loader2,
  Save,
  Check,
  Mail,
} from "lucide-react";
import {
  TaskItem,
  StaffMember,
  AVAILABLE_SERVICES,
} from "@/services/task.service";
import { fetchMainServices, MainService } from "@/services/service-catalog.service";

interface TaskEditModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  staffList: StaffMember[];
  orgId?: string;
  orgSubdomain?: string;
  onClose: () => void;
  onSave: (updatedTask: TaskItem) => Promise<void> | void;
}

export function TaskEditModal({
  isOpen,
  task,
  staffList,
  orgId,
  orgSubdomain,
  onClose,
  onSave,
}: TaskEditModalProps) {
  // Services catalog list fetched from Service Management module
  const [servicesList, setServicesList] = useState<MainService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Form fields (matching TaskCreateView exactly)
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [servicesSearch, setServicesSearch] = useState("");
  const servicesDropdownRef = useRef<HTMLDivElement>(null);

  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [details, setDetails] = useState("");

  // Validation & Submission States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close services dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        servicesDropdownRef.current &&
        !servicesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsServicesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch services stored in the Service Management module
  useEffect(() => {
    let mounted = true;
    async function loadServices() {
      setIsLoadingServices(true);
      try {
        const svcs = await fetchMainServices(orgId || orgSubdomain);
        if (mounted && Array.isArray(svcs)) {
          setServicesList(svcs);
        }
      } catch (err) {
        console.warn("Could not load services from service management:", err);
      } finally {
        if (mounted) setIsLoadingServices(false);
      }
    }
    if (isOpen) {
      loadServices();
    }
    return () => {
      mounted = false;
    };
  }, [orgId, orgSubdomain, isOpen]);

  // List only the Main Categories from Service Management module
  const mainCategories = useMemo(() => {
    if (servicesList.length > 0) {
      return servicesList
        .filter((main) => main.status !== "INACTIVE")
        .map((main) => main.name);
    }
    return AVAILABLE_SERVICES;
  }, [servicesList]);

  // Filtered main categories by search keyword
  const filteredMainCategories = useMemo(() => {
    const q = servicesSearch.trim().toLowerCase();
    if (!q) return mainCategories;
    return mainCategories.filter((cat) => cat.toLowerCase().includes(q));
  }, [mainCategories, servicesSearch]);

  const handleToggleService = (serviceName: string) => {
    setSelectedServices((prev) => {
      const exists = prev.includes(serviceName);
      const next = exists
        ? prev.filter((s) => s !== serviceName)
        : [...prev, serviceName];
      if (touched.services || errors.services) {
        const err = next.length === 0 ? "Please select at least one service." : "";
        setErrors((e) => ({ ...e, services: err }));
      }
      return next;
    });
  };

  const handleRemoveService = (serviceName: string) => {
    setSelectedServices((prev) => {
      const next = prev.filter((s) => s !== serviceName);
      if (touched.services || errors.services) {
        const err = next.length === 0 ? "Please select at least one service." : "";
        setErrors((e) => ({ ...e, services: err }));
      }
      return next;
    });
  };

  const handleClearAllServices = () => {
    setSelectedServices([]);
    if (touched.services) {
      setErrors((e) => ({ ...e, services: "Please select at least one service." }));
    }
  };

  // Only show Sales Staff in the dropdown (matching TaskCreateView)
  const salesStaffList = useMemo(() => {
    return staffList.filter((s) => {
      const role = (s.role || "").toUpperCase();
      const dept = (s.department || "").toLowerCase();
      const desig = (s.designation || "").toLowerCase();
      return (
        role === "SALES_STAFF" ||
        role === "SALES" ||
        dept.includes("sales") ||
        desig.includes("sales")
      );
    });
  }, [staffList]);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setClient(task.client || "");
      setEmail(task.email || "");

      // Initialize selected services
      if (task.services && Array.isArray(task.services) && task.services.length > 0) {
        setSelectedServices(task.services);
      } else if (task.service) {
        const parts = task.service
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        setSelectedServices(parts.length > 0 ? parts : [task.service]);
      } else if (task.title) {
        setSelectedServices([task.title]);
      } else {
        setSelectedServices([]);
      }

      // Parse phone number if present
      if (task.phoneNumber) {
        const parts = task.phoneNumber.trim().split(" ");
        if (parts.length > 1 && parts[0].startsWith("+")) {
          setCountryCode(parts[0]);
          setPhoneNumber(parts.slice(1).join(" "));
        } else {
          setPhoneNumber(task.phoneNumber);
        }
      } else {
        setPhoneNumber("");
      }

      // Match staff
      const matchedStaff = staffList.find(
        (s) =>
          s.id === task.assignedToUserId ||
          s.id === task.assignedTo?.id ||
          s.name.toLowerCase() === task.assignedTo?.name?.toLowerCase()
      );

      if (matchedStaff) {
        setSelectedStaffId(matchedStaff.id);
      } else if (task.assignedToUserId || task.assignedTo?.id) {
        setSelectedStaffId(task.assignedToUserId || task.assignedTo?.id || "");
      } else {
        setSelectedStaffId("");
      }

      setDetails(task.details || "");
      setErrors({});
      setTouched({});
      setError(null);
      setIsServicesOpen(false);
      setServicesSearch("");
    }
  }, [task, staffList, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !task) return null;

  // Single field validator (matching TaskCreateView)
  const validateField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case "client": {
        const v = (value ?? "").trim();
        if (!v) return "Client / Company name is required.";
        if (v.length < 2) return "Client name must be at least 2 characters.";
        if (v.length > 100) return "Client name cannot exceed 100 characters.";
        return "";
      }
      case "email": {
        if (!value || !value.trim()) return ""; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return "Please enter a valid email address.";
        }
        return "";
      }
      case "services": {
        const arr = Array.isArray(value) ? value : [];
        if (arr.length === 0) return "Please select at least one service for this task.";
        return "";
      }
      case "phoneNumber": {
        const clean = (value ?? "").replace(/[\s-]/g, "");
        if (!clean) {
          return "Phone number is required.";
        }
        if (!/^\d{7,15}$/.test(clean)) {
          return "Please enter a valid phone number (7 to 15 digits).";
        }
        return "";
      }
      case "selectedStaffId": {
        if (!value) return "Please select a sales staff member.";
        return "";
      }
      case "details": {
        const v = (value ?? "").trim();
        if (v && v.length > 500) return "Task details cannot exceed 500 characters.";
        return "";
      }
      default:
        return "";
    }
  };

  const handleBlur = (fieldName: string, value: any) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const errorMsg = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
  };

  const handleChange = (fieldName: string, value: any, setter: (v: any) => void) => {
    setter(value);
    if (touched[fieldName] || errors[fieldName]) {
      const errorMsg = validateField(fieldName, value);
      setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task.status === "Completed") {
      setError("Completed tasks cannot be modified.");
      return;
    }

    const clientErr = validateField("client", client);
    const emailErr = validateField("email", email);
    const servicesErr = validateField("services", selectedServices);
    const phoneErr = validateField("phoneNumber", phoneNumber);
    const staffErr = validateField("selectedStaffId", selectedStaffId);
    const detailsErr = validateField("details", details);

    const validationErrors: Record<string, string> = {};
    if (clientErr) validationErrors.client = clientErr;
    if (emailErr) validationErrors.email = emailErr;
    if (servicesErr) validationErrors.services = servicesErr;
    if (phoneErr) validationErrors.phoneNumber = phoneErr;
    if (staffErr) validationErrors.selectedStaffId = staffErr;
    if (detailsErr) validationErrors.details = detailsErr;

    setErrors(validationErrors);
    setTouched({
      client: true,
      email: true,
      services: true,
      phoneNumber: true,
      selectedStaffId: true,
      details: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      setError(firstError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (!staff) {
      setError("Selected sales staff member was not found.");
      setIsSubmitting(false);
      return;
    }

    const joinedServices = selectedServices.join(", ");
    const updatedTask: TaskItem = {
      ...task,
      title: joinedServices,
      service: joinedServices,
      services: selectedServices,
      client: client.trim(),
      email: email.trim() || undefined,
      clientId: task.clientId,
      assignedToUserId: staff.id,
      assignedTo: {
        id: staff.id,
        name: staff.name,
        initials: staff.initials,
        avatarColor: staff.avatarColor,
        email: staff.email,
        role: staff.role,
      },
      department: staff.department || task.department || "Sales",
      priority: task.priority || "Medium",
      status: task.status || "Pending",
      dueDate: task.dueDate,
      seatNo: staff.seatNo || task.seatNo || "Auto assigned",
      currentSeatNo: staff.seatNo || task.currentSeatNo || "Auto assigned",
      phoneNumber: phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : undefined,
      details: details.trim() || undefined,
    };

    try {
      await onSave(updatedTask);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task updates.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-modal-title"
    >
      <div className="w-full max-w-4xl my-auto rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/40 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161822]/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="edit-task-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Edit Task
                </h3>
                {task.clientId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {task.clientId}
                  </span>
                )}
                {task.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      task.status === "Completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : task.status === "In Progress"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        : task.status === "Overdue"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                    }`}
                  >
                    {task.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update client, assigned sales staff, services, or task notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body Form - Mirroring TaskCreateView */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col">
          <div className="p-6 sm:p-7 space-y-6 max-h-[72vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {/* Top Error banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* 2-Column Grid (Exact same layout & fields as TaskCreateView) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7">
              {/* ---------------- LEFT COLUMN ---------------- */}
              <div className="space-y-5">
                {/* 1. Client * */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={client}
                      onChange={(e) => handleChange("client", e.target.value, setClient)}
                      onBlur={(e) => handleBlur("client", e.target.value)}
                      placeholder="Enter client or company name"
                      className={`w-full rounded-xl border bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors shadow-2xs ${
                        errors.client
                          ? "border-rose-500 focus:border-rose-500 focus:outline-none ring-1 ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                      }`}
                    />
                  </div>
                  {errors.client && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.client}</span>
                    </p>
                  )}
                </div>

                {/* Email Address (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleChange("email", e.target.value, setEmail)}
                      onBlur={(e) => handleBlur("email", e.target.value)}
                      placeholder="e.g. client@example.com"
                      className={`w-full rounded-xl border bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors shadow-2xs ${
                        errors.email
                          ? "border-rose-500 focus:border-rose-500 focus:outline-none ring-1 ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* 2. Services * (Multi-select from Service Management Module) */}
                <div ref={servicesDropdownRef} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>Services</span>
                      <span className="text-rose-500">*</span>
                      {selectedServices.length > 0 && (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                          {selectedServices.length} selected
                        </span>
                      )}
                    </label>
                    {isLoadingServices && (
                      <span className="text-[10px] text-amber-600 animate-pulse font-medium">
                        Loading services...
                      </span>
                    )}
                  </div>

                  {/* Dropdown Trigger Box */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsServicesOpen((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsServicesOpen((prev) => !prev);
                      }
                    }}
                    className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2.5 text-xs cursor-pointer shadow-2xs transition-colors select-none relative ${
                      errors.services
                        ? "border-rose-500 ring-1 ring-rose-500/20"
                        : isServicesOpen
                        ? "border-amber-500 ring-1 ring-amber-500/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

                    <div className="truncate text-left flex-1 mr-2">
                      {selectedServices.length === 0 ? (
                        <span className="text-slate-400">
                          {isLoadingServices ? "Loading services..." : "Select services (multiple allowed)..."}
                        </span>
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {selectedServices.length === 1
                            ? selectedServices[0]
                            : `${selectedServices.length} services selected`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedServices.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAllServices();
                          }}
                          title="Clear all selected"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                          isServicesOpen ? "rotate-180 text-amber-500" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Dropdown Popover Menu */}
                  {isServicesOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-[#161922] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search bar inside dropdown */}
                      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={servicesSearch}
                            onChange={(e) => setServicesSearch(e.target.value)}
                            placeholder="Search main service category..."
                            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {servicesSearch && (
                            <button
                              type="button"
                              onClick={() => setServicesSearch("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scrollable list of Main Categories only (no subcategories) */}
                      <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                        {filteredMainCategories.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No service categories found matching &ldquo;{servicesSearch}&rdquo;
                          </div>
                        ) : (
                          filteredMainCategories.map((catName) => {
                            const isChecked = selectedServices.includes(catName);
                            return (
                              <div
                                key={catName}
                                onClick={() => handleToggleService(catName)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? "bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 font-medium"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    isChecked
                                      ? "bg-amber-500 border-amber-600 text-white"
                                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                  }`}
                                >
                                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <span className="flex-1 truncate">{catName}</span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer with action */}
                      <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {selectedServices.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsServicesOpen(false)}
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Selected service chips / tags */}
                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {selectedServices.map((srvName) => (
                        <span
                          key={srvName}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 shadow-2xs animate-in fade-in"
                        >
                          <span className="max-w-[200px] truncate">{srvName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(srvName)}
                            className="text-amber-600 hover:text-amber-900 dark:hover:text-amber-100 p-0.5 rounded-md hover:bg-amber-200/50 transition-colors"
                            title={`Remove ${srvName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {errors.services && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.services}</span>
                    </p>
                  )}
                </div>

                {/* 3. Phone Number with UAE Flag */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className={`flex rounded-xl border bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-all ${
                      errors.phoneNumber
                        ? "border-rose-500 ring-1 ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 px-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      <span className="text-sm">🇦🇪</span>
                      <span>{countryCode}</span>
                      <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => handleChange("phoneNumber", e.target.value, setPhoneNumber)}
                      onBlur={(e) => handleBlur("phoneNumber", e.target.value)}
                      placeholder="e.g. 50 123 4567"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.phoneNumber}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* ---------------- RIGHT COLUMN ---------------- */}
              <div className="space-y-5">
                {/* 4. Sales Staff * */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Sales Staff <span className="text-rose-500">*</span>
                    </label>
                    {staffList.length === 0 && (
                      <span className="text-[10px] text-amber-600 animate-pulse font-medium">
                        Loading sales staff...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={selectedStaffId}
                      onChange={(e) => handleChange("selectedStaffId", e.target.value, setSelectedStaffId)}
                      onBlur={(e) => handleBlur("selectedStaffId", e.target.value)}
                      className={`w-full appearance-none rounded-xl border bg-white dark:bg-slate-900 pl-10 pr-9 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 cursor-pointer shadow-2xs transition-colors ${
                        errors.selectedStaffId
                          ? "border-rose-500 focus:border-rose-500 focus:outline-none ring-1 ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                      }`}
                    >
                      <option value="">Select sales staff member</option>
                      {salesStaffList.length === 0 && staffList.length > 0 && (
                        <option value="" disabled>
                          No sales staff members found in this company
                        </option>
                      )}
                      {salesStaffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.designation || s.department || "Sales Staff"})
                        </option>
                      ))}
                      {/* Fallback option if currently assigned staff is not in salesStaffList */}
                      {task.assignedTo?.name &&
                        !salesStaffList.some((s) => s.id === selectedStaffId) && (
                          <option value={selectedStaffId || "current"}>
                            {task.assignedTo.name} (Current Assignee)
                          </option>
                        )}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.selectedStaffId && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.selectedStaffId}</span>
                    </p>
                  )}
                </div>

                {/* 5. Task Details / Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Task Details / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        details.length > 500 ? "text-rose-500 font-bold" : "text-slate-400"
                      }`}
                    >
                      {details.length}/500
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={6}
                      maxLength={500}
                      value={details}
                      onChange={(e) => handleChange("details", e.target.value, setDetails)}
                      onBlur={(e) => handleBlur("details", e.target.value)}
                      placeholder="Add task details, client instructions or follow-up notes (optional)..."
                      className={`w-full rounded-2xl border bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 shadow-2xs resize-none transition-colors ${
                        errors.details
                          ? "border-rose-500 focus:border-rose-500 focus:outline-none ring-1 ring-rose-500/20"
                          : "border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                      }`}
                    />
                  </div>
                  {errors.details && (
                    <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{errors.details}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#161822]/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#b85817] hover:bg-[#a14b12] shadow-md shadow-orange-950/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
