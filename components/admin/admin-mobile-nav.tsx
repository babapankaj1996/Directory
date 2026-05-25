"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { adminNav } from "@/components/admin/admin-nav";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="glass luxury-border mb-5 rounded-[1.5rem] p-2 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="admin-mobile-menu"
        className="flex w-full items-center justify-between rounded-2xl bg-white/75 px-4 py-3 text-left text-sm font-semibold text-ink shadow-sm"
      >
        <span>Admin menu</span>
        {open ? <X className="h-5 w-5 text-champagne" /> : <Menu className="h-5 w-5 text-champagne" />}
      </button>

      {open ? (
        <div id="admin-mobile-menu" className="mt-2 grid gap-2 rounded-[1.2rem] bg-white/45 p-2">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active ? "bg-ink text-white" : "bg-white/70 text-muted hover:bg-white hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4 text-champagne" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2">
            <AdminLogoutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}
