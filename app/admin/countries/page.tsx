import type { Metadata } from "next";
import { AdminCountryManager } from "@/components/admin/admin-country-manager";

export const metadata: Metadata = {
  title: "Manage Countries"
};

export default function AdminCountriesPage() {
  return <AdminCountryManager />;
}
