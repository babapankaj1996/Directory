"use client";

import { useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { getApiBase } from "@/lib/profiles";

/**
 * Shown when an owner account has not confirmed its email address yet.
 *
 * The API rejects every owner-scoped read and write until the address is
 * confirmed ("Please verify your email before managing listings"), and the
 * callers swallow those 403s. Without this the owner dashboard renders a
 * complete, working-looking page of zeroes and the add-profile form accepts a
 * full submission before failing — in both cases with no stated reason and no
 * way forward. This states the reason and offers the one action that clears it.
 */
export function VerifyEmailNotice({ email, className = "" }: { email: string; className?: string }) {
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);

  async function resend() {
    if (!email) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch(`${getApiBase()}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; error?: string };
      setSent(response.ok);
      setNotice(response.ok
        ? payload.message || `Verification email sent to ${email}. Check your inbox and spam folder.`
        : payload.error || "Could not send the verification email. Please try again in a few minutes.");
    } catch {
      setNotice("Could not reach the server. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      id="verify-email-notice"
      role="status"
      className={`rounded-2xl border border-gold-300/60 bg-gold-50/40 p-5 md:p-6 ${className}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
          <div>
            <p className="text-base font-semibold text-ink">Confirm your email to start posting</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
              We sent a confirmation link to <span className="font-semibold text-ink">{email}</span>. Until it is
              confirmed you can look around, but adding a profile, wallet top-ups and campaign requests stay locked.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={resend}
          disabled={sending || sent}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-onaccent transition-colors hover:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : sent ? "Email sent" : "Resend email"}
        </button>
      </div>
      {notice ? <p className="mt-4 border-t border-gold-300/40 pt-3 text-sm text-ink-soft">{notice}</p> : null}
    </div>
  );
}
