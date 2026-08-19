"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FileDiff, ShieldCheck, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { apiUrl } from "@/lib/profiles";

/**
 * What the administrator actually has to do, at the top of the dashboard.
 *
 * The metrics below it answer "how is the directory doing"; this answers "what
 * is waiting for me", which is the reason to open the page at all. Queues with
 * nothing in them are not shown — a wall of zeroes trains you to stop reading,
 * and then the one number that matters gets missed.
 */
type Queue = {
  key: string;
  /** Singular and plural, chosen by count. */
  label: string;
  one: string;
  href: string;
  count: number;
  icon: typeof Clock3;
  urgent?: boolean;
};

async function countOf(path: string, pick: (payload: { data?: unknown }) => number) {
  try {
    const response = await fetch(apiUrl(path), { credentials: "include", cache: "no-store" });
    if (!response.ok) return 0;
    return pick(await response.json());
  } catch {
    return 0;
  }
}

const listLength = (payload: { data?: unknown }) => (Array.isArray(payload.data) ? payload.data.length : 0);

export function AdminAttention() {
  const [queues, setQueues] = useState<Queue[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [pending, revisions, deletions, verification] = await Promise.all([
        countOf("/api/admin/listings?status=PENDING", listLength),
        countOf("/api/admin/listings/revisions", listLength),
        countOf("/api/admin/listings/deletion-requests", listLength),
        countOf("/api/admin/listings/verification-documents?status=PENDING", listLength)
      ]);
      if (!active) return;
      setQueues([
        { key: "pending", label: "listings awaiting approval", one: "listing awaiting approval", href: "/admin/listings?status=PENDING", count: pending, icon: Clock3 },
        { key: "changes", label: "proposed changes to live listings", one: "proposed change to a live listing", href: "/admin/changes", count: revisions, icon: FileDiff },
        { key: "verification", label: "identity documents to check", one: "identity document to check", href: "/admin/verification", count: verification, icon: ShieldCheck },
        { key: "deletions", label: "account deletion requests", one: "account deletion request", href: "/admin/changes", count: deletions, icon: Trash2, urgent: true }
      ]);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!queues) {
    return <div className="h-24 animate-pulse rounded-2xl border border-line bg-surface" aria-hidden="true" />;
  }

  const waiting = queues.filter((queue) => queue.count > 0);

  if (!waiting.length) {
    return (
      <GlassCard className="flex items-center gap-3 p-5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-moss-700" />
        <p className="text-sm font-semibold text-ink">
          Nothing waiting for review. <span className="font-normal text-muted">New submissions and changes will appear here.</span>
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-2xs font-bold uppercase tracking-[0.16em] text-copper-700">Needs your attention</p>
      <div className="grid gap-3 md:grid-cols-2">
        {waiting.map((queue) => {
          const Icon = queue.icon;
          return (
            <Link
              key={queue.key}
              href={queue.href}
              className={`group flex items-center justify-between gap-4 rounded-2xl border p-5 transition-colors ${
                queue.urgent ? "border-clay-600/40 bg-clay-600/5 hover:border-clay-600" : "border-line bg-surface hover:border-copper-600"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${queue.urgent ? "bg-clay-600/10 text-clay-700" : "bg-sunken text-copper-700"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-2xl font-semibold leading-none text-ink">{queue.count}</span>
                  <span className="mt-1 block text-sm text-muted">{queue.count === 1 ? queue.one : queue.label}</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
