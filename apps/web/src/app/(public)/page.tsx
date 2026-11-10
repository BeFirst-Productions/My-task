import type { Metadata } from "next";
import LandingPageView from "@/components/landing/LandingPageView";

export const metadata: Metadata = {
  title: "Start Your Business in the UAE with Confidence | My Task",
  description:
    "UAE Business Setup made simple. Compare packages, register your organisation, and streamline your operations with confidence.",
};

export default function LandingPage() {
  return <LandingPageView />;
}
