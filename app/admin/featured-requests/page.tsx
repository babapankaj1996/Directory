import type { Metadata } from "next";
import { AdminFeaturedRequestsManager } from "@/components/admin/admin-featured-requests-manager";

export const metadata: Metadata = {
  title: "Featured Requests | Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminFeaturedRequestsPage() {
  return <AdminFeaturedRequestsManager />;
}
