import type { Metadata } from "next";
import { AdminBillingSettings } from "@/components/admin/admin-billing-settings";
import { AdminSiteSettings } from "@/components/admin/admin-site-settings";
import { AdminSectionHeader } from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Site Settings"
};

export default function AdminSettingsPage() {
  return (
    <div className="grid gap-10">
      <div>
        <AdminSectionHeader
          eyebrow="Configuration"
          title="Site settings"
          description="Search metadata, favicon, share image, social profiles, analytics and homepage content. Changes take effect on the public site within a minute."
        />
        <div className="mt-6">
          <AdminSiteSettings />
        </div>
      </div>

      <div>
        <AdminSectionHeader eyebrow="Payments" title="Billing" description="Featured placement pricing and payment settings." />
        <div className="mt-6">
          <AdminBillingSettings />
        </div>
      </div>
    </div>
  );
}
