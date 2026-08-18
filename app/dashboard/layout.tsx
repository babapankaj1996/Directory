import { redirect } from "next/navigation";
import { readSession } from "@/lib/session-guard";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Same reasoning as the admin area — see lib/session-guard.ts.
  const session = await readSession();
  if (!session) redirect("/login?next=%2Fdashboard");
  // An administrator lands in the admin area rather than an owner dashboard.
  if (session.role === "ADMIN") redirect("/admin");

  return <>{children}</>;
}
