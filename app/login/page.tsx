import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to manage your directory profile."
};

export default function LoginPage() {
  return <AuthCard mode="login" />;
}
