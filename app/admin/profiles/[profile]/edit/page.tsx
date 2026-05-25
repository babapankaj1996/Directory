import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerProfileEditor } from "@/components/owner-profile-editor";

export const metadata: Metadata = {
  title: "Edit Profile"
};

export default async function AdminEditProfilePage({ params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params;

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-[2rem] bg-white/75 ring-1 ring-slate-200" />}>
      <OwnerProfileEditor admin listingId={profile} />
    </Suspense>
  );
}
