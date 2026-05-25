import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Admin dashboard to manage profiles, categories, featured requests, quotes, reviews and verification workflows.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
