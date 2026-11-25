"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  AuthUser,
  LoginCredentials,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  safelyStoreUser,
  loginUser,
  logoutUser,
  updateStaffAvailability,
  updateStaffSeatNumber,
  releaseStaffSeat,
  toggleStaffBreak,
} from "@/services/auth.service";

function parseJwtPayload(token: string): { userId?: string; role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setAvailability: (isAvailable: boolean) => Promise<boolean>;
  setSeatNumber: (seatNumber: string) => Promise<boolean>;
  releaseSeat: () => Promise<boolean>;
  toggleBreak: (action: "start" | "end") => Promise<boolean>;
  isAuthenticated: boolean;
  isPlatformOwner: boolean;
  isOrgUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken) {
      setToken(storedToken);

      // Verify if storedUser in localStorage matches the active JWT token
      const tokenPayload = parseJwtPayload(storedToken);
      const isUserMatch =
        storedUser &&
        tokenPayload?.userId &&
        storedUser.id === tokenPayload.userId;

      if (isUserMatch) {
        setUser(storedUser);
      } else {
        // Token belongs to a different account (e.g. cross-domain handoff or switched user)
        // Clear stale user and keep isLoading = true until fetchCurrentUser completes
        setUser(null);
      }

      // Verify token validity in background or restore user data across subdomains
      fetchCurrentUser()
        .then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
            safelyStoreUser(freshUser);
          } else {
            setUser(null);
            setToken(null);
            logoutUser();
          }
        })
        .catch(() => {
          if (!isUserMatch) {
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const result = await loginUser(credentials);
      setToken(result.token);
      setUser(result.user);
      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    logoutUser();
  };

  const refreshUser = async () => {
    const freshUser = await fetchCurrentUser();
    if (freshUser) {
      setUser(freshUser);
    }
  };

  const setAvailability = async (isAvailable: boolean): Promise<boolean> => {
    // Optimistic UI update
    setUser((prev) => (prev ? { ...prev, isAvailable } : null));
    const res = await updateStaffAvailability(isAvailable);
    if (!res.success) {
      // Revert if failed
      refreshUser();
      return false;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("staff-availability-changed", { detail: { isAvailable } }));
    }
    return true;
  };

  const setSeatNumber = async (seatNumber: string): Promise<boolean> => {
    const trimmed = seatNumber ? seatNumber.trim().toUpperCase() : "";
    setUser((prev) => (prev ? { ...prev, seatNumber: trimmed } : null));
    const res = await updateStaffSeatNumber(trimmed);
    if (!res.success) {
      refreshUser();
      return false;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("staff-seat-changed", { detail: { seatNumber: trimmed } }));
    }
    return true;
  };

  const releaseSeat = async (): Promise<boolean> => {
    setUser((prev) => (prev ? { ...prev, seatNumber: null } : null));
    const res = await releaseStaffSeat();
    if (!res.success) {
      refreshUser();
      return false;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("staff-seat-changed", { detail: { seatNumber: null } }));
    }
    return true;
  };

  const toggleBreak = async (action: "start" | "end"): Promise<boolean> => {
    const isOnBreak = action === "start";
    setUser((prev) => (prev ? {
      ...prev,
      isOnBreak,
      breakStartedAt: isOnBreak ? new Date().toISOString() : null,
    } : null));

    const res = await toggleStaffBreak(action);
    if (!res.success) {
      refreshUser();
      return false;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("staff-break-changed", { detail: { action, isOnBreak } }));
    }
    return true;
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      refreshUser,
      setAvailability,
      setSeatNumber,
      releaseSeat,
      toggleBreak,
      isAuthenticated: !!user && !!token,
      isPlatformOwner: user?.role === "PLATFORM_OWNER",
      isOrgUser:
        user?.role === "SUPER_ADMIN" ||
        user?.role === "ADMIN" ||
        user?.role === "STAFF" ||
        user?.role === "SALES_STAFF" ||
        user?.role === "ACCOUNTANT",
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
