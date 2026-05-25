import type { Metadata } from "next";
import { AdminCategoryManager } from "@/components/admin/admin-category-manager";

export const metadata: Metadata = {
  title: "Manage Categories"
};

export default function AdminCategoriesPage() {
  return <AdminCategoryManager />;
}
