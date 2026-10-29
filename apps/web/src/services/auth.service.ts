/**
 * Authentication Service for Next.js Web Application
 * Handles authentication, token persistence, and role-based redirects.
 */

export interface AuthUser {
  id: string;
  fullName: string | null;
  email: string;
  username: string;
  phoneNumber: string;
  role: "PLATFORM_OWNER" | "SUPER_ADMIN" | "ADMIN" | "STAFF" | "SALES_STAFF" | "ACCOUNTANT";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
  organisationId: string | null;
  organisation: {
    id: string;
    companyName: string;
    subdomain: string;
    logo: string | null;
    primaryLocation: string;
    status: string;
  } | null;
  permittedModules?: string[];
  dashboardRedirect: string;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

export const TOKEN_KEY = "saas_auth_token";
export const USER_KEY = "saas_auth_user";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return ""; // Browser uses Next.js rewrites
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:4000"
  );
}

/**
 * Perform login request
 */
export async function loginUser(credentials: LoginCredentials): Promise<{ token: string; user: AuthUser }> {
  const url = `${getApiBaseUrl()}/api/auth/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || "Authentication failed. Please verify your credentials.");
  }

  const { token, user } = data.data;

  // Persist session in localStorage and cookie
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax`;
  }

  return { token, user };
}

/**
 * Retrieves the stored session user
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored JWT token
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Clears the user session and logs out
 */
export function logoutUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    window.location.href = "/login";
  }
}

/**
 * Refreshes user details from the backend
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logoutUser();
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, JSON.stringify(data.data));
      }
      return data.data;
    }
    return null;
  } catch {
    return null;
  }
}


/**
 * Convenience helper returning Authorization Bearer headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}