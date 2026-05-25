import type { Metadata } from "next";
import { AdminVerificationManager } from "@/components/admin/admin-verification-manager";

export const metadata: Metadata = {
  title: "Admin Verification"
};

export default function AdminVerificationPage() {
  return <AdminVerificationManager />;
}
