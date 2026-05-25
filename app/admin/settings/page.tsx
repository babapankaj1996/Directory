import type { Metadata } from "next";
import { AdminBillingSettings } from "@/components/admin/admin-billing-settings";

export const metadata: Metadata = {
  title: "Admin Billing Settings"
};

export default function AdminSettingsPage() {
  return <AdminBillingSettings />;
}
