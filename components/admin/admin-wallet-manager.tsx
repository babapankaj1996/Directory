"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, PlusCircle, RotateCcw, Search, Wallet, XCircle } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-auth";
import { apiUrl, getApiBase } from "@/lib/profiles";
import { formatMoney } from "@/lib/featured-placement";

type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string | null;
  referenceType?: string | null;
  createdAt?: string;
  user?: OwnerWallet;
};

type OwnerWallet = {
  id: string;
  name: string;
  email: string;
  wallet?: {
    balance: number;
    heldBalance: number;
    availableBalance: number;
    currency: string;
    transactions?: WalletTransaction[];
  } | null;
  profiles?: Array<{ id: string; name: string; slug: string; status: string }>;
};

type BillingSettings = {
  currency: string;
  mode: string;
  razorpayEnabled: boolean;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function statusTone(status?: string): "green" | "amber" | "blue" | "red" | "gray" {
  const normalized = String(status || "").toUpperCase();
  if (["APPROVED", "COMPLETED"].includes(normalized)) return "green";
  if (normalized === "PENDING") return "amber";
  if (normalized === "REJECTED") return "red";
  return "gray";
}

export function AdminWalletManager() {
  const [wallets, setWallets] = useState<OwnerWallet[]>([]);
  const [topups, setTopups] = useState<WalletTransaction[]>([]);
  const [settings, setSettings] = useState<BillingSettings>({ currency: "INR", mode: "WALLET", razorpayEnabled: false });
  const [search, setSearch] = useState("");
  const [topupFilter, setTopupFilter] = useState("PENDING");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("1000");
  const [creditReason, setCreditReason] = useState("Featured listing wallet balance");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [settingsPayload, walletPayload, topupPayload] = await Promise.all([
      adminFetch(apiUrl(`/api/admin/billing/settings`)).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      adminFetch(apiUrl(`/api/admin/billing/wallets${search ? `?search=${encodeURIComponent(search)}` : ""}`)).then((response) => response.ok ? response.json() : undefined).catch(() => undefined),
      adminFetch(apiUrl(`/api/admin/billing/topups?status=${encodeURIComponent(topupFilter)}`)).then((response) => response.ok ? response.json() : undefined).catch(() => undefined)
    ]);
    if (settingsPayload?.data) setSettings(settingsPayload.data as BillingSettings);
    if (Array.isArray(walletPayload?.data)) {
      setWallets(walletPayload.data as OwnerWallet[]);
      setSelectedUserId((current) => current || walletPayload.data[0]?.id || "");
    }
    if (Array.isArray(topupPayload?.data)) setTopups(topupPayload.data as WalletTransaction[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedOwner = useMemo(() => wallets.find((wallet) => wallet.id === selectedUserId), [wallets, selectedUserId]);

  async function creditWallet() {
    if (!selectedUserId) {
      setNotice("Select an owner before adding wallet balance.");
      return;
    }
    const response = await adminFetch(apiUrl(`/api/admin/billing/wallets/${selectedUserId}/credit`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(creditAmount),
        currency: settings.currency || "INR",
        reason: creditReason
      })
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(payload.error || "Wallet balance could not be added.");
      return;
    }
    setNotice("Wallet balance added.");
    await load();
  }

  async function updateTopup(transaction: WalletTransaction, status: "APPROVED" | "REJECTED") {
    const response = await adminFetch(apiUrl(`/api/admin/billing/topups/${transaction.id}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const payload = await response.json() as { message?: string; error?: string };
    if (!response.ok) {
      setNotice(payload.error || "Wallet top-up could not be updated.");
      return;
    }
    setNotice(payload.message || "Wallet top-up updated.");
    await load();
  }

  return (
    <div className="grid gap-6">
      <AdminSectionHeader
        eyebrow="Wallet"
        title="Owner wallet balances"
        description="Review wallet balances, approve owner top-up requests, and add manual balance for featured listing campaigns."
      />

      {notice ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Owner ledger</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Search and credit wallet</h2>
            </div>
            <button type="button" onClick={() => void load()} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">
              <RotateCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search owner, email or profile"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-ink outline-none"
              />
            </label>
            <Button variant="ghost" onClick={load}>Search</Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="md:col-span-3">
              <span className="mb-2 block text-sm font-semibold text-ink">Owner account</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
              >
                {wallets.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} - {owner.email}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Amount</span>
              <input
                value={creditAmount}
                onChange={(event) => setCreditAmount(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-ink">Reason</span>
              <input
                value={creditReason}
                onChange={(event) => setCreditReason(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl bg-cloud p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Selected wallet</p>
                <p className="mt-1 text-lg font-semibold text-ink">{selectedOwner?.name || "No owner selected"}</p>
                <p className="text-sm text-muted">{selectedOwner?.email || "-"}</p>
              </div>
              {selectedOwner?.profiles?.[0] ? <Link href={`/admin/listings/${selectedOwner.profiles[0].slug}`} className="text-sm font-semibold text-champagne hover:text-ink">Open profile</Link> : null}
            </div>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-muted sm:grid-cols-3">
              <span className="rounded-2xl bg-white px-3 py-2">Balance {formatMoney(selectedOwner?.wallet?.balance ?? 0, selectedOwner?.wallet?.currency || settings.currency)}</span>
              <span className="rounded-2xl bg-white px-3 py-2">Held {formatMoney(selectedOwner?.wallet?.heldBalance ?? 0, selectedOwner?.wallet?.currency || settings.currency)}</span>
              <span className="rounded-2xl bg-white px-3 py-2">Available {formatMoney(selectedOwner?.wallet?.availableBalance ?? 0, selectedOwner?.wallet?.currency || settings.currency)}</span>
            </div>
          </div>

          <Button variant="gold" className="mt-4" disabled={!selectedUserId || loading} onClick={creditWallet}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add wallet balance
          </Button>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Top-up queue</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Owner requests</h2>
            </div>
            <select
              value={topupFilter}
              onChange={(event) => setTopupFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
              <option value="ALL">All</option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
            <span className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200">Payment mode: {settings.mode}</span>
            <span className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200">Currency: {settings.currency}</span>
          </div>
          <div className="mt-5 grid gap-3">
            {topups.map((topup) => (
              <article key={topup.id} className="rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={statusTone(topup.status)}>{topup.status}</StatusPill>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{formatMoney(topup.amount, topup.currency)}</span>
                    </div>
                    <h3 className="mt-3 truncate text-base font-semibold text-ink">{topup.user?.name || "Owner"}</h3>
                    <p className="text-xs font-semibold text-muted">{topup.user?.email || "-"} - {topup.type.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-xs text-muted">Created {formatDate(topup.createdAt)}</p>
                  </div>
                  {topup.status === "PENDING" && topup.referenceType === "WALLET_TOPUP_REQUEST" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="gold" className="py-2.5" onClick={() => updateTopup(topup, "APPROVED")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button variant="ghost" className="py-2.5" onClick={() => updateTopup(topup, "REJECTED")}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="rounded-2xl bg-cloud px-3 py-2 text-xs font-bold text-muted">
                      {topup.referenceType === "RAZORPAY_WALLET_TOPUP" ? "Gateway verified" : "Reviewed"}
                    </span>
                  )}
                </div>
              </article>
            ))}
            {!topups.length ? <div className="rounded-2xl bg-cloud p-5 text-sm font-semibold text-muted">No wallet top-up requests found.</div> : null}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
