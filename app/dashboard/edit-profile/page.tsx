import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerProfileEditor } from "@/components/owner-profile-editor";

export const metadata: Metadata = {
  title: "Edit Business Profile",
  description: "Edit the single business profile attached to the logged-in owner account."
};

export default function EditProfilePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-10"><div className="h-64 animate-pulse rounded-[2rem] bg-white/75 ring-1 ring-slate-200" /></main>}>
      <OwnerProfileEditor />
    </Suspense>
  );
}
