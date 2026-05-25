import type { Metadata } from "next";
import { AdminQuotesManager } from "@/components/admin/admin-quotes-manager";

export const metadata: Metadata = {
  title: "Admin Quotes"
};

export default function AdminQuotesPage() {
  return <AdminQuotesManager />;
}
