"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearAdminSession } from "@/lib/admin-auth";

export function AdminLogoutButton() {
  const router = useRouter();

  function logout() {
    clearAdminSession();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm">
        <LogOut className="h-4 w-4" />
      </span>
      Logout
    </button>
  );
}
