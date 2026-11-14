"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export type Theme = "light" | "dark";
export type ThemeMode = "light" | "dark" | "custom";

export interface TenantAppearance {
  themeMode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  primaryFont: string;
  secondaryFont: string;
  headingFont: string;
  customCss?: string | null;
}

export const DEFAULT_APPEARANCE: TenantAppearance = {
  themeMode: "dark",
  primaryColor: "#F59E0B",
  secondaryColor: "#6D2DCD",
  primaryFont: "Inter",
  secondaryFont: "Poppins",
  headingFont: "DM Sans",
  customCss: "",
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  appearance: TenantAppearance;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  updateAppearance: (partial: Partial<TenantAppearance>, tenantSubdomain?: string) => void;
  applyTenantTheme: (settings: any, tenantSubdomain?: string) => void;
  currentTenant: string | null;
  setCurrentTenant: (tenant: string | null) => void;
  resetToDefaults: (tenantSubdomain?: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

// Helper to adjust hex brightness
function adjustHex(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, rgb.r + amt));
  const g = Math.min(255, Math.max(0, rgb.g + amt));
  const b = Math.min(255, Math.max(0, rgb.b + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Calculate high contrast text color (dark text for bright colors, white for dark colors)
function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#090d16";
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 155 ? "#090d16" : "#ffffff";
}

// Dynamically inject Google Font link tag
function loadGoogleFont(fontName: string) {
  if (typeof document === "undefined" || !fontName) return;
  const standardFonts = ["Inter", "system-ui", "sans-serif", "serif", "monospace"];
  if (standardFonts.includes(fontName)) return;

  const fontId = `google-font-${fontName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  if (document.getElementById(fontId)) return;

  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

// Apply CSS variables and classes to the root document
export function applyThemeToDom(appearance: TenantAppearance) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { themeMode, primaryColor, secondaryColor, primaryFont, headingFont, customCss } = appearance;

  // 1. Handle Dark / Light mode class
  if (themeMode === "light") {
    root.classList.remove("dark");
  } else {
    // dark or custom default to dark
    root.classList.add("dark");
  }

  // 2. Primary brand color variables
  const cleanPrimary = primaryColor && primaryColor.startsWith("#") ? primaryColor : DEFAULT_APPEARANCE.primaryColor;
  const primaryRgb = hexToRgb(cleanPrimary) || { r: 245, g: 158, b: 11 };
  const primaryHover = adjustHex(cleanPrimary, -15);
  const primaryLight = adjustHex(cleanPrimary, 18);
  const activeContrastText = getContrastColor(cleanPrimary);

  root.style.setProperty("--primary", cleanPrimary);
  root.style.setProperty("--primary-hover", primaryHover);
  root.style.setProperty("--primary-light", primaryLight);
  root.style.setProperty("--primary-rgb", `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
  root.style.setProperty("--gold", cleanPrimary);
  root.style.setProperty("--gold-light", primaryLight);
  root.style.setProperty("--gold-glow", `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.28)`);
  root.style.setProperty("--tenant-active-bg", cleanPrimary);
  root.style.setProperty("--tenant-active-text", activeContrastText);
  root.style.setProperty(
    "--tenant-active-gradient",
    `linear-gradient(135deg, ${primaryLight} 0%, ${cleanPrimary} 100%)`
  );

  // 3. Secondary accent color variables
  const cleanSecondary = secondaryColor && secondaryColor.startsWith("#") ? secondaryColor : DEFAULT_APPEARANCE.secondaryColor;
  const secondaryRgb = hexToRgb(cleanSecondary) || { r: 109, g: 45, b: 205 };
  root.style.setProperty("--secondary", cleanSecondary);
  root.style.setProperty("--secondary-rgb", `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);

  // 4. Typography font variables
  if (primaryFont) {
    root.style.setProperty("--font-primary", `'${primaryFont}', -apple-system, BlinkMacSystemFont, sans-serif`);
    document.body.style.fontFamily = `'${primaryFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    loadGoogleFont(primaryFont);
  }
  if (headingFont) {
    root.style.setProperty("--font-heading", `'${headingFont}', sans-serif`);
    loadGoogleFont(headingFont);
  }

  // 5. Custom CSS
  let customStyleTag = document.getElementById("tenant-custom-css") as HTMLStyleElement | null;
  if (customCss && customCss.trim()) {
    if (!customStyleTag) {
      customStyleTag = document.createElement("style");
      customStyleTag.id = "tenant-custom-css";
      document.head.appendChild(customStyleTag);
    }
    customStyleTag.innerHTML = customCss;
  } else if (customStyleTag) {
    customStyleTag.innerHTML = "";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTenant, setCurrentTenantState] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<TenantAppearance>(DEFAULT_APPEARANCE);
  const [mounted, setMounted] = useState(false);

  // Derive simple "light" | "dark" for legacy components
  const currentTheme: Theme = appearance.themeMode === "light" ? "light" : "dark";

  // Scoped storage helper
  const getStorageKey = useCallback((tenantSlug?: string | null) => {
    return tenantSlug ? `tenant_appearance_${tenantSlug.toLowerCase()}` : "tenant_appearance_global";
  }, []);

  // Set current tenant and load its isolated appearance immediately from cache
  const setCurrentTenant = useCallback((tenantSlug: string | null) => {
    setCurrentTenantState(tenantSlug);
    if (typeof window === "undefined") return;

    const storageKey = getStorageKey(tenantSlug);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged: TenantAppearance = { ...DEFAULT_APPEARANCE, ...parsed };
        setAppearance(merged);
        applyThemeToDom(merged);
        return;
      }
    } catch {}

    // Fallback: apply default or current
    applyThemeToDom(appearance);
  }, [getStorageKey, appearance]);

  // Synchronize appearance updates
  const updateAppearance = useCallback((partial: Partial<TenantAppearance>, tenantSlug?: string) => {
    setAppearance((prev) => {
      const updated: TenantAppearance = { ...prev, ...partial };
      const targetSlug = tenantSlug || currentTenant;
      const key = getStorageKey(targetSlug);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(key, JSON.stringify(updated));
        } catch {}
      }

      applyThemeToDom(updated);
      return updated;
    });
  }, [currentTenant, getStorageKey]);

  // Apply settings from API
  const applyTenantTheme = useCallback((settings: any, tenantSlug?: string) => {
    if (!settings) return;
    const targetSlug = tenantSlug || currentTenant;

    const newAppearance: TenantAppearance = {
      themeMode: (settings.themeMode as ThemeMode) || "dark",
      primaryColor: settings.primaryColor || DEFAULT_APPEARANCE.primaryColor,
      secondaryColor: settings.secondaryColor || DEFAULT_APPEARANCE.secondaryColor,
      primaryFont: settings.primaryFont || DEFAULT_APPEARANCE.primaryFont,
      secondaryFont: settings.secondaryFont || DEFAULT_APPEARANCE.secondaryFont,
      headingFont: settings.headingFont || DEFAULT_APPEARANCE.headingFont,
      customCss: settings.customCss || "",
    };

    setAppearance(newAppearance);
    const key = getStorageKey(targetSlug);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(newAppearance));
      } catch {}
    }
    applyThemeToDom(newAppearance);
  }, [currentTenant, getStorageKey]);

  // Reset to default
  const resetToDefaults = useCallback((tenantSlug?: string) => {
    updateAppearance(DEFAULT_APPEARANCE, tenantSlug);
  }, [updateAppearance]);

  // Legacy API compatibility
  const setTheme = useCallback((newTheme: Theme) => {
    updateAppearance({ themeMode: newTheme });
  }, [updateAppearance]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    updateAppearance({ themeMode: mode });
  }, [updateAppearance]);

  const toggleTheme = useCallback(() => {
    const nextMode = appearance.themeMode === "light" ? "dark" : "light";
    updateAppearance({ themeMode: nextMode });
  }, [appearance.themeMode, updateAppearance]);

  // Listen to custom "org-settings-updated" events
  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      if (e?.detail) {
        applyTenantTheme(e.detail);
      }
    };

    window.addEventListener("org-settings-updated", handleSettingsUpdated);
    return () => window.removeEventListener("org-settings-updated", handleSettingsUpdated);
  }, [applyTenantTheme]);

  // Mount effect: auto-detect tenant from hostname or pathname
  useEffect(() => {
    if (typeof window === "undefined") return;

    let detectedSlug: string | null = null;
    const host = window.location.hostname.toLowerCase();

    // Check host for subdomain
    if (host.endsWith(".localhost")) {
      detectedSlug = host.replace(".localhost", "");
    } else if (host.endsWith(".lvh.me")) {
      detectedSlug = host.replace(".lvh.me", "");
    } else if (host.includes(".")) {
      const parts = host.split(".");
      if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "admin" && parts[0] !== "platform") {
        detectedSlug = parts[0];
      }
    }

    // Pathname fallback: /org/[slug]/...
    if (!detectedSlug) {
      const match = window.location.pathname.match(/^\/org\/([^/]+)/);
      if (match && match[1]) {
        detectedSlug = match[1];
      }
    }

    if (detectedSlug && detectedSlug !== "admin" && detectedSlug !== "platform") {
      setCurrentTenant(detectedSlug);
    } else {
      // Load global preference
      const saved = localStorage.getItem("tenant_appearance_global");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const merged = { ...DEFAULT_APPEARANCE, ...parsed };
          setAppearance(merged);
          applyThemeToDom(merged);
        } catch {}
      } else {
        applyThemeToDom(DEFAULT_APPEARANCE);
      }
    }

    setMounted(true);
  }, [setCurrentTenant]);

  const contextValue = useMemo(() => ({
    theme: currentTheme,
    themeMode: appearance.themeMode,
    appearance,
    toggleTheme,
    setTheme,
    setThemeMode,
    updateAppearance,
    applyTenantTheme,
    currentTenant,
    setCurrentTenant,
    resetToDefaults,
  }), [
    currentTheme,
    appearance,
    toggleTheme,
    setTheme,
    setThemeMode,
    updateAppearance,
    applyTenantTheme,
    currentTenant,
    setCurrentTenant,
    resetToDefaults,
  ]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
