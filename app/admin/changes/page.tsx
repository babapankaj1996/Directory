import type { Metadata } from "next";
import { AdminChangeReview } from "@/components/admin/admin-change-review";
import { AdminSectionHeader } from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Changes & Requests"
};

export default function AdminChangesPage() {
  return (
    <div>
      <AdminSectionHeader
        eyebrow="Review queue"
        title="Changes & requests"
        description="Edits owners have proposed to listings that are already live, and requests to delete an account. Live listings keep serving their current details until you accept a change."
      />
      <div className="mt-6">
        <AdminChangeReview />
      </div>
    </div>
  );
}
