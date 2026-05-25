import type { Metadata } from "next";
import { AdminReviewsManager } from "@/components/admin/admin-reviews-manager";

export const metadata: Metadata = {
  title: "Review Moderation",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminReviewsPage() {
  return <AdminReviewsManager />;
}
