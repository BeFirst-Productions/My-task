import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
