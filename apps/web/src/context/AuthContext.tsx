"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  AuthUser,
  LoginCredentials,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  loginUser,
  logoutUser,
} from "@/services/auth.service";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);

      // Verify token validity in background
      fetchCurrentUser()
        .then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
          } else {
            setUser(null);
            setToken(null);
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
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

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      refreshUser,
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
