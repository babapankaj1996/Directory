import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your directory account password."
};

export default function ForgotPasswordPage() {
  return <AuthCard mode="forgot" />;
}
