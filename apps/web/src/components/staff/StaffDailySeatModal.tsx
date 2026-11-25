"use client";

import React, { useState, useEffect } from "react";
import {
  Armchair,
  Check,
  Lock,
  X,
  AlertCircle,
  RefreshCw,
  LogOut,
  Info,
} from "lucide-react";
import {
  fetchOrgSeats,
  OccupiedSeatItem,
  updateStaffSeatNumber,
  releaseStaffSeat,
} from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";

interface StaffDailySeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed?: (seatNumber: string) => void;
  canDismiss?: boolean;
}

export function StaffDailySeatModal({
  isOpen,
  onClose,
  onConfirmed,
  canDismiss = true,
}: StaffDailySeatModalProps) {
  const { refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [occupiedSeats, setOccupiedSeats] = useState<OccupiedSeatItem[]>([]);
  const [defaultPresets, setDefaultPresets] = useState<string[]>([]);
  const [currentSeat, setCurrentSeat] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string>("");

  const loadSeats = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchOrgSeats();
      if (res.success && res.data) {
        setOccupiedSeats(res.data.occupiedSeats || []);
        // Strictly 8 seats S-01 to S-08
        const presets = res.data.defaultPresets && res.data.defaultPresets.length > 0
          ? res.data.defaultPresets.slice(0, 8)
          : Array.from({ length: 8 }, (_, i) => `S-${(i + 1).toString().padStart(2, "0")}`);
        setDefaultPresets(presets);
        const cur = res.data.currentSeat || null;
        setCurrentSeat(cur);

        if (cur) {
          setSelectedSeat(cur);
        } else {
          setSelectedSeat("");
        }
      }
    } catch (err: any) {
      console.error("Failed to load seats:", err);
      setErrorMessage("Could not load current seat status. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSeats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Map occupied seats by uppercase seat number
  const occupiedMap = new Map<string, OccupiedSeatItem>();
  occupiedSeats.forEach((item) => {
    occupiedMap.set(item.seatNumber.toUpperCase(), item);
  });

  const activeSelected = selectedSeat;
  const isConflict = Boolean(
    activeSelected &&
      occupiedMap.has(activeSelected) &&
      !occupiedMap.get(activeSelected)?.isSelf
  );
  const conflictOccupant = isConflict ? occupiedMap.get(activeSelected)?.staffName : null;

  const handleSelectPreset = (seat: string) => {
    // If the staff member currently occupies a seat, they cannot pick another seat without releasing first
    if (currentSeat && currentSeat !== seat) {
      setErrorMessage(
        `You currently occupy Seat ${currentSeat}. Please release Seat ${currentSeat} first before selecting a new desk.`
      );
      return;
    }

    const occupant = occupiedMap.get(seat);
    if (occupant && !occupant.isSelf) {
      setErrorMessage(
        `Seat ${seat} is already occupied by ${occupant.staffName}. Please choose an available seat.`
      );
      return;
    }

    setErrorMessage(null);
    setSelectedSeat(seat);
  };

  // Enforced: Confirm seat assignment
  const handleConfirm = async () => {
    if (!activeSelected) {
      setErrorMessage("Please select an available workstation seat for today's shift.");
      return;
    }

    if (currentSeat && currentSeat !== activeSelected) {
      setErrorMessage(
        `Please release Seat ${currentSeat} first before confirming a new desk.`
      );
      return;
    }

    if (isConflict) {
      setErrorMessage(
        `Seat ${activeSelected} is already occupied by ${conflictOccupant}. Please choose an available seat.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await updateStaffSeatNumber(activeSelected);
      if (res.success) {
        setSuccessMessage(`Seat ${activeSelected} confirmed successfully!`);
        await refreshUser();
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("staff-seat-changed", { detail: { seatNumber: activeSelected } })
          );
        }
        if (onConfirmed) onConfirmed(activeSelected);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage(
          res.message || "Failed to confirm seat. It may have just been claimed by another staff member."
        );
        loadSeats();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to confirm seat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enforced: Release seat first so staff can choose a new desk
  const handleRelease = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    const releasedSeatName = currentSeat;
    try {
      const res = await releaseStaffSeat();
      if (res.success) {
        setSelectedSeat("");
        setCurrentSeat(null);
        setSuccessMessage(
          `Seat ${releasedSeatName || ""} released! You can now select any available desk below.`
        );
        await refreshUser();
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("staff-seat-changed", { detail: { seatNumber: null } })
          );
        }
        loadSeats();
      } else {
        setErrorMessage(res.message || "Failed to release seat.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to release seat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCount = defaultPresets.filter(
    (s) => !occupiedMap.has(s) || occupiedMap.get(s)?.isSelf
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0e121d] p-6 sm:p-7 shadow-2xl text-slate-900 dark:text-white max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs shrink-0">
              <Armchair className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Daily Workstation Check-in
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Check in to your desk seat for today's shift (8 seats capacity). Duplicate seats are locked.
              </p>
            </div>
          </div>

          {canDismiss && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Status / Feedback Alerts */}
        {errorMessage && (
          <div className="mt-3.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="font-semibold leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="font-semibold leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* ── STRICT RELEASE-FIRST BANNER (ACTIVE WHEN HOLDING A SEAT) ── */}
        {currentSeat ? (
          <div className="mt-3.5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500/40 text-slate-900 dark:text-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shrink-0 shadow-xs">
                  <Armchair className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Currently Assigned Seat
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black font-mono bg-amber-500 text-slate-950 shadow-2xs">
                      {currentSeat}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    You must <strong>release Seat {currentSeat}</strong> first before you can change to another desk.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRelease}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-md shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Release Seat {currentSeat} to Change</span>
              </button>
            </div>
          </div>
        ) : (
          /* Stats Strip when no seat assigned */
          <div className="mt-3.5 py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200/70 dark:border-white/5 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{availableCount} Available</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>{occupiedSeats.length} Occupied</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 italic">No seat assigned yet</span>
              <button
                type="button"
                onClick={loadSeats}
                disabled={isLoading}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Refresh seat availability"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {/* ── 8 SEATS WORKSTATION GRID ── */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              Workstation Desks (8 Seats)
            </label>
            {currentSeat && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Release current seat to select another</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {defaultPresets.map((seat) => {
              const occupant = occupiedMap.get(seat);
              const isTakenByOther = Boolean(occupant && !occupant.isSelf);
              const isSelfTaken = Boolean(occupant?.isSelf || currentSeat === seat);
              const isSelected = activeSelected === seat;
              const isLockedDueToHoldingCurrent = Boolean(currentSeat && currentSeat !== seat);

              const isDisabled = isTakenByOther || isSubmitting || isLockedDueToHoldingCurrent;

              return (
                <button
                  key={seat}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectPreset(seat)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[82px] relative cursor-pointer ${
                    isTakenByOther
                      ? "bg-slate-100/70 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60 cursor-not-allowed text-slate-400"
                      : isSelfTaken
                      ? "bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-sm"
                      : isLockedDueToHoldingCurrent
                      ? "bg-slate-50 dark:bg-[#121624]/60 border-slate-200 dark:border-slate-800/80 opacity-50 cursor-not-allowed text-slate-400"
                      : isSelected
                      ? "bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-sm"
                      : "bg-white dark:bg-[#121624] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:bg-amber-500/5 shadow-2xs"
                  }`}
                  title={
                    isTakenByOther
                      ? `Occupied by ${occupant?.staffName}`
                      : isSelfTaken
                      ? "Your current active workstation"
                      : isLockedDueToHoldingCurrent
                      ? `Release Seat ${currentSeat} first to select ${seat}`
                      : `Available desk ${seat}`
                  }
                >
                  <div className="flex items-center justify-between w-full">
                    <Armchair
                      className={`h-4.5 w-4.5 ${
                        isSelfTaken || isSelected
                          ? "text-amber-500"
                          : isTakenByOther || isLockedDueToHoldingCurrent
                          ? "text-slate-400"
                          : "text-slate-400"
                      }`}
                    />
                    {isTakenByOther ? (
                      <Lock className="h-3 w-3 text-rose-400" />
                    ) : isLockedDueToHoldingCurrent ? (
                      <Lock className="h-3 w-3 text-slate-400" />
                    ) : isSelfTaken || isSelected ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-2xs">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    ) : null}
                  </div>

                  <span className="font-mono text-sm font-black tracking-tight my-1">
                    {seat}
                  </span>

                  <span className="text-[10px] font-bold truncate max-w-full block">
                    {isTakenByOther
                      ? occupant?.staffName?.split(" ")[0] || "Occupied"
                      : isSelfTaken
                      ? "Your Desk"
                      : isLockedDueToHoldingCurrent
                      ? "Locked"
                      : "Available"}
                  </span>
                </button>
              );
            })}
          </div>

          {currentSeat && (
            <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-[#141928] border border-slate-200 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                To switch to another desk, click <strong>Release Seat {currentSeat}</strong> above. All desks will immediately unlock for your selection.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            {currentSeat && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRelease}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer disabled:opacity-60"
                title="Release current seat"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Release Seat</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canDismiss && (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                {currentSeat ? "Done" : "Cancel"}
              </button>
            )}

            {!currentSeat && (
              <button
                type="button"
                disabled={!activeSelected || isConflict || isSubmitting}
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                <span>Confirm Workstation {activeSelected ? `(${activeSelected})` : ""}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
