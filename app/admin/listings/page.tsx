import type { Metadata } from "next";
import { AdminListingsManager } from "@/components/admin/admin-listings-manager";

export const metadata: Metadata = {
  title: "Admin Listings"
};

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  return <AdminListingsManager initialStatus={params.status || "ALL"} />;
}
