import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniExpiry SaaS | Multi-Tenant Notification & Task Platform",
  description:
    "Enterprise multi-tenant platform for automated expiry tracking, WhatsApp notifications, and compliance task management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
