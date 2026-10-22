"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CreateOrganisationView } from "@/components/platform-owner/CreateOrganisationView";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <CreateOrganisationView
        onBack={() => router.push("/")}
        onSuccess={() => router.push("/platform-owner")}
      />
    </div>
  );
}
