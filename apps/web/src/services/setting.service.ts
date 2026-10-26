export interface SettingData {
  id: string;
  scope: "PLATFORM" | "ORGANISATION";
  organisationId: string | null;

  // General Platform / Org Information
  displayName: string;
  tagline: string | null;
  websiteUrl: string | null;
  companyAddress: string | null;
  logo: string | null;
  supportEmail: string | null;
  supportPhone: string | null;

  // Regional Settings
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  defaultCurrency: string;
  weekStart: string;

  // Document Settings
  defaultExpiryReminderDays: number;
  documentTypes: string[] | null;
  defaultDocumentStatus: string;
  allowDocumentUploads: boolean;
  enableDocAutoNumbering: boolean;

  // Invoice Settings
  invoicePrefix: string;
  startingInvoiceNumber: number;
  defaultDueDays: number;
  invoiceCurrency: string;
  taxVatRate: number;
  enableVat: boolean;
  autoGenerateInvoiceNumber: boolean;

  // Task Settings
  defaultTaskPriority: string;
  defaultTaskDueDays: number;
  autoAssignTasks: boolean;
  enableTaskEmailNotifications: boolean;
  showOverdueTasksOnDashboard: boolean;

  // Theme Customization
  themeMode: "light" | "dark" | "custom";
  primaryColor: string;
  secondaryColor: string;
  primaryFont: string;
  secondaryFont: string;
  headingFont: string;
  customCss: string | null;

  // Notification Settings
  notificationSound: string;
  soundVolume: number;
  deliveryMode: "DASHBOARD_ONLY" | "SYSTEM_ONLY" | "BOTH";
  enableSystemPush: boolean;
  enableDashboardToast: boolean;
  enableSound: boolean;
  remind7DaysBefore: boolean;
  remind3DaysBefore: boolean;
  remind1DayBefore: boolean;
  remindExpiredToday: boolean;
  enableWhatsAppAlerts: boolean;
  primaryWhatsAppNumber: string | null;
  secondaryWhatsAppNumbers: string[] | null;
  enableEmailAlerts: boolean;
  notificationEmail: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  autoDismissSeconds: number;

  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateSettingPayload = Partial<Omit<SettingData, "id" | "scope" | "organisationId" | "createdAt" | "updatedAt">>;

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
}

/**
 * Fetches platform-wide settings
 */
export async function fetchPlatformSetting(): Promise<SettingData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/settings/platform`, {
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load platform settings");
  }
  return json.data;
}

/**
 * Updates platform-wide settings
 */
export async function updatePlatformSetting(payload: UpdateSettingPayload): Promise<SettingData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/settings/platform`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to update platform settings");
  }
  return json.data;
}

/**
 * Fetches tenant-specific organization settings
 */
export async function fetchOrganisationSetting(idOrSubdomain: string): Promise<SettingData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/settings/organisation/${encodeURIComponent(idOrSubdomain)}`, {
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to load organisation settings");
  }
  return json.data;
}

/**
 * Updates tenant-specific organization settings
 */
export async function updateOrganisationSetting(
  idOrSubdomain: string,
  payload: UpdateSettingPayload
): Promise<SettingData> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/settings/organisation/${encodeURIComponent(idOrSubdomain)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Failed to update organisation settings");
  }
  return json.data;
}

/**
 * Web Audio API synthesizer for instant zero-latency preview of all notification sounds
 */
export function playNotificationSoundPreview(soundType: string, volume: number = 80) {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const gainNode = ctx.createGain();
    const normalizedVolume = Math.max(0.01, Math.min(1, volume / 100)) * 0.4;
    gainNode.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (soundType) {
      case "subtle-bell": {
        // High harmonic bell chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(1174.66, now); // D6
        osc2.frequency.setValueAtTime(2349.32, now); // D7
        gainNode.gain.setValueAtTime(normalizedVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.65);
        osc2.stop(now + 0.65);
        break;
      }
      case "modern-ping": {
        // Crisp digital ping
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
        gainNode.gain.setValueAtTime(normalizedVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case "soft-ripple": {
        // Warm mellow water drop
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
        gainNode.gain.setValueAtTime(normalizedVolume * 0.9, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }
      case "crystal-pop": {
        // Sharp crystal glass bubble
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1567.98, now); // G6
        osc.frequency.exponentialRampToValueAtTime(2093.0, now + 0.05); // C7
        gainNode.gain.setValueAtTime(normalizedVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
      case "success-chime": {
        // Ascending major chord (C-E-G)
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          noteGain.gain.setValueAtTime(normalizedVolume, now + idx * 0.08);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
          osc.connect(noteGain);
          noteGain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.55);
        });
        break;
      }
      case "gentle-alert": {
        // Dual warm marimba strike
        [659.25, 880.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          noteGain.gain.setValueAtTime(normalizedVolume * 0.8, now + idx * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.4);
          osc.connect(noteGain);
          noteGain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.45);
        });
        break;
      }
      case "mute":
      default:
        break;
    }
  } catch (err) {
    console.warn("Unable to play sound preview:", err);
  }
}
