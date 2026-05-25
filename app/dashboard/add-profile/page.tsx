import type { Metadata } from "next";
import { ProfileSubmitForm } from "@/components/profile-submit-form";

export const metadata: Metadata = {
  title: "Add Profile",
  description: "Submit a new directory profile for admin approval."
};

export default function AddProfilePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-12">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">Registered user only</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">Add your profile</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted">Submit your business details step by step. Your listing stays pending until the admin reviews and approves it.</p>
      </div>
      <ProfileSubmitForm />
    </main>
  );
}
