import type { Metadata } from "next";
import { AdminSectionHeader } from "@/components/admin/admin-ui";
import { ProfileSubmitForm } from "@/components/profile-submit-form";

export const metadata: Metadata = {
  title: "Add Profile"
};

export default function AdminAddProfilePage() {
  return (
    <div>
      <AdminSectionHeader
        eyebrow="New profile"
        title="Add a new directory profile"
        description="Create a complete public profile under /country/city/category/profile-slug. New listings can be saved pending or created with an admin-selected status."
      />
      <ProfileSubmitForm admin />
    </div>
  );
}
