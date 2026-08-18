"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/api-response";
import { saveAuthSession } from "@/lib/admin-auth";
import { apiUrl, getApiBase } from "@/lib/profiles";

/**
 * The page behind the confirmation link.
 *
 * Name, password and account type were all chosen at signup, so nothing is
 * asked here — opening the link is the last step. The account is created
 * already verified and the visitor is signed straight in, so an owner lands on
 * the add-profile form rather than being sent back to their inbox.
 *
 * Activation happens through a POST triggered after the page loads, not from
 * the link itself, so a mail client that prefetches URLs cannot silently
 * consume the invitation.
 */
type Invite = { email: string; role: string };

export function CompleteSignupCard() {
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setError("This link is missing its token. Please open the link from your email.");
      return;
    }

    let active = true;
    (async () => {
      try {
        const check = await fetch(apiUrl(`/api/auth/signup-invite?token=${encodeURIComponent(token)}`), { cache: "no-store" });
        const invitePayload = await readApiJson<{ data?: Invite; error?: string }>(check, "signup link");
        if (!active) return;
        if (!invitePayload.data) {
          setError(invitePayload.error || "This link is invalid or has expired.");
          return;
        }
        setInvite(invitePayload.data);

        const response = await fetch(apiUrl(`/api/auth/complete-signup`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-Auth-Mode": "cookie" },
          body: JSON.stringify({ token })
        });
        const result = await readApiJson<{ data?: { id: string; name: string; email: string; role?: string; status: string }; error?: string }>(response, "signup");
        if (!active) return;
        if (!response.ok || !result.data) {
          setError(result.error || "Could not activate your account.");
          return;
        }

        saveAuthSession(result.data as never);
        setDone(true);
        router.push(result.data.role === "OWNER" ? "/dashboard/add-profile" : "/");
        router.refresh();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not activate your account.");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <main className="shell flex min-h-[60vh] items-center justify-center py-16">
        <GlassCard className="w-full max-w-md p-7 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Link no longer valid</h1>
          <p className="mt-3 text-sm leading-7 text-muted">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/signup" variant="gold" size="sm">Sign up again</Button>
            <Button href="/login" variant="ghost" size="sm">Sign in instead</Button>
          </div>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="shell flex min-h-[60vh] items-center justify-center py-16">
      <GlassCard className="w-full max-w-md p-7 text-center">
        {done ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jade-600/10 text-jade-600">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-ink">Email confirmed</h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              Your account is ready
              {invite?.role === "OWNER" ? " — taking you to your listing now." : " — taking you to the directory now."}
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-copper-600" />
            <h1 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-ink">Confirming your email…</h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              {invite?.email ? `Activating the account for ${invite.email}.` : "One moment."}
            </p>
          </>
        )}
      </GlassCard>
    </main>
  );
}
