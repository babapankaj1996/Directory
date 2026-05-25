import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/owner-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage submitted listings or review public directory profiles."
};

export default function DashboardPage() {
  return <OwnerDashboard />;
}
