"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/api-response";
import { saveAuthSession } from "@/lib/admin-auth";
import { getApiBase } from "@/lib/profiles";

/**
 * Second half of registration, reached only from the emailed link.
 *
 * By the time this renders the address has been proved, so the account it
 * creates is verified from the start and the visitor is signed straight in —
 * an owner lands on the add-profile form rather than being asked to check
 * their inbox again.
 */
type Invite = { email: string; role: string };

export function CompleteSignupCard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const found = new URLSearchParams(window.location.search).get("token") || "";
    setToken(found);
    if (!found) {
      setError("This link is missing its token. Please use the link from your email.");
      setChecking(false);
      return;
    }

    let active = true;
    fetch(`${getApiBase()}/api/auth/signup-invite?token=${encodeURIComponent(found)}`, { cache: "no-store" })
      .then((response) => readApiJson<{ data?: Invite; error?: string }>(response, "signup link"))
      .then((payload) => {
        if (!active) return;
        if (payload.data) setInvite(payload.data);
        else setError(payload.error || "This link is invalid or has expired.");
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : "Could not check this link."))
      .finally(() => active && setChecking(false));

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`${getApiBase()}/api/auth/complete-signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Auth-Mode": "cookie" },
        body: JSON.stringify({ token, name: form.name, password: form.password })
      });
      const payload = await readApiJson<{ data?: { role?: string; name: string; email: string; id: string; status: string }; error?: string }>(response, "signup");
      if (!response.ok || !payload.data) throw new Error(payload.error || "Could not create your account.");

      saveAuthSession(payload.data as never);
      router.push(payload.data.role === "OWNER" ? "/dashboard/add-profile" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="shell flex min-h-[60vh] items-center justify-center py-16">
        <p className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
        </p>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="shell flex min-h-[60vh] items-center justify-center py-16">
        <GlassCard className="w-full max-w-md p-7 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Link no longer valid</h1>
          <p className="mt-3 text-sm leading-7 text-muted">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/signup" variant="gold" size="sm">Request a new link</Button>
            <Button href="/login" variant="ghost" size="sm">Sign in instead</Button>
          </div>
        </GlassCard>
      </main>
    );
  }

  const isOwner = invite.role === "OWNER";

  return (
    <main className="shell flex min-h-[70vh] items-center justify-center py-14 md:py-20">
      <GlassCard className="w-full max-w-md p-7 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-champagne/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-champagne">
          <BadgeCheck className="h-4 w-4" /> Email confirmed
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">
          {isOwner ? "Finish setting up your business account" : "Finish creating your account"}
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          Signing up as <span className="font-semibold text-ink">{invite.email}</span>
          {isOwner ? " — you can publish your listing straight after this." : "."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Full name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={isOwner ? "Your name" : "Your name"}
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              className="min-h-[46px] w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors focus:border-copper-600"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">Create a password</span>
            <span className="relative block">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="At least 10 characters"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                className="min-h-[46px] w-full rounded-xl border border-line bg-surface px-4 pr-12 text-sm text-ink outline-none transition-colors focus:border-copper-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </span>
          </label>

          {error ? <p className="rounded-xl bg-clay-600/10 px-4 py-3 text-sm font-semibold text-clay-700">{error}</p> : null}

          <Button type="submit" variant="gold" className="w-full" disabled={saving}>
            {saving ? "Creating your account…" : isOwner ? "Create account and continue" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-jade-600" />
          Your email is already confirmed, so you will not need to verify it again.
        </p>

        <p className="mt-4 text-center text-sm text-muted">
          Wrong address?{" "}
          <Link href="/signup" className="-my-1.5 inline-block py-1.5 font-semibold text-champagne underline underline-offset-2">
            Start again
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}
