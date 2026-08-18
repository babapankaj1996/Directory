import type { Metadata } from "next";
import { CompleteSignupCard } from "@/components/complete-signup-card";

export const metadata: Metadata = {
  title: "Finish creating your account",
  description: "Confirm your details to finish creating your Profinr account.",
  robots: { index: false, follow: false }
};

export default function CompleteSignupPage() {
  return <CompleteSignupCard />;
}
