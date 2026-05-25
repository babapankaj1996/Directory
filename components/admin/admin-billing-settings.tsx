"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Save, Wallet } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase } from "@/lib/profiles";

type BillingSettings = {
  mode: "WALLET" | "RAZORPAY" | "BOTH" | string;
  currency: string;
  walletEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayConfigured: boolean;
  razorpayKeyId?: string;
  allowUnpaidAdminApproval?: boolean;
};

const defaultSettings: BillingSettings = {
  mode: "WALLET",
  currency: "INR",
  walletEnabled: true,
  razorpayEnabled: false,
  razorpayConfigured: false
};

export function AdminBillingSettings() {
  const [settings, setSettings] = useState<BillingSettings>(defaultSettings);
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await adminFetch(`${getApiBase()}/api/admin/billing/settings`).catch(() => undefined);
    if (!response?.ok) return;
    const payload = await response.json() as { data?: BillingSettings };
    if (payload.data) setSettings(payload.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings() {
    const response = await adminFetch(`${getApiBase()}/api/admin/billing/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: settings.mode,
        currency: settings.currency,
        razorpayKeyId: settings.razorpayKeyId || "",
        allowUnpaidAdminApproval: settings.allowUnpaidAdminApproval !== false
      })
    });
    const payload = await response.json() as { data?: BillingSettings; error?: string };
    if (!response.ok) {
      setNotice(payload.error || "Billing settings could not be saved.");
      return;
    }
    if (payload.data) setSettings(payload.data);
    setNotice("Featured payment settings saved.");
  }

  return (
    <div className="grid gap-6">
      <AdminSectionHeader
        eyebrow="Featured billing"
        title="Wallet and Razorpay controls"
        description="Choose how owners pay for featured placement. Wallet balances and top-up approvals are managed from the dedicated wallet page."
      />

      {notice ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink ring-1 ring-slate-200">{notice}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <GlassCard className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Payment mode</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">Featured checkout</h3>
            </div>
            <StatusPill tone={settings.razorpayConfigured ? "green" : "amber"}>
              Razorpay {settings.razorpayConfigured ? "configured" : "needs keys"}
            </StatusPill>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {(["WALLET", "RAZORPAY", "BOTH"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, mode }))}
                  className={`rounded-2xl px-4 py-4 text-left ring-1 transition ${settings.mode === mode ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-slate-200 hover:bg-cloud"}`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {mode === "RAZORPAY" ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                    {mode}
                  </span>
                  <span className={`mt-1 block text-xs ${settings.mode === mode ? "text-white/70" : "text-muted"}`}>
                    {mode === "WALLET" ? "Wallet balance only" : mode === "RAZORPAY" ? "Gateway checkout only" : "Owner can choose"}
                  </span>
                </button>
              ))}
            </div>

            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Currency</span>
              <input
                value={settings.currency || "INR"}
                onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Razorpay key ID</span>
              <input
                value={settings.razorpayKeyId || ""}
                onChange={(event) => setSettings((current) => ({ ...current, razorpayKeyId: event.target.value }))}
                placeholder="rzp_live_or_test_key_id"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none"
              />
              <span className="mt-2 block text-xs leading-5 text-muted">The secret key stays in backend env as RAZORPAY_KEY_SECRET.</span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm font-semibold text-ink ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={settings.allowUnpaidAdminApproval !== false}
                onChange={(event) => setSettings((current) => ({ ...current, allowUnpaidAdminApproval: event.target.checked }))}
                className="mt-1 h-4 w-4"
              />
              <span>
                Allow admin approval for manual unpaid featured requests
                <span className="mt-1 block text-xs font-normal leading-5 text-muted">Useful for offline payments or temporary manual campaigns.</span>
              </span>
            </label>

            <Button variant="gold" onClick={saveSettings}>
              <Save className="mr-2 h-4 w-4" /> Save billing mode
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-champagne">Wallet operations</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">Owner balances and top-ups</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Use the wallet page to search owners, add manual balance, review pending top-up requests, and check recent ledger entries.
          </p>
          <Link href="/admin/wallet" className="mt-5 inline-flex items-center justify-center rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-glass transition hover:-translate-y-0.5">
            <Wallet className="mr-2 h-4 w-4" /> Open Wallet Page
          </Link>
        </GlassCard>
      </section>
    </div>
  );
}
