import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { readSession } from "@/lib/session-guard";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Admin dashboard to manage profiles, categories, featured requests, quotes, reviews and verification workflows.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Verified here rather than in middleware: the edge sandbox does not reliably
  // receive the signing secret when self-hosted, so the check there could not
  // tell a valid session from a forged one and refused both.
  const session = await readSession("ADMIN");
  if (!session) redirect("/login?next=%2Fadmin");

  return <AdminShell>{children}</AdminShell>;
}
