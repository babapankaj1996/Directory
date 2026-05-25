import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a directory account and add your business profile."
};

export default function SignupPage() {
  return <AuthCard mode="signup" />;
}
