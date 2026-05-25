import type { Metadata } from "next";
import { AdminCityManager } from "@/components/admin/admin-city-manager";

export const metadata: Metadata = {
  title: "Manage Cities"
};

export default function AdminCitiesPage() {
  return <AdminCityManager />;
}
