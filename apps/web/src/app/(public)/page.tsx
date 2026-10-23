import type { Metadata } from "next";
import LoginPage from "./login/page";

export const metadata: Metadata = {
  title: "Sign In | My Task CRM Portal",
  description: "Sign in to access Platform Management or your Organization Dashboard",
};

export default function LandingPage() {
  return <LoginPage />;
}

