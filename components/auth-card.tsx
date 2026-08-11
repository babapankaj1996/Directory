"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, Chrome, Diamond, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/api-response";
import { saveAuthSession } from "@/lib/admin-auth";
import { getApiBase } from "@/lib/profiles";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified?: boolean;
};

type MailStatus = {
  delivered?: boolean;
  delivery?: string;
  message?: string;
  reason?: string;
};

const SIGNUP_INTENT_COOKIE = "signup_intent";
const OWNER_ADD_PROFILE_INTENT = "OWNER_ADD_PROFILE";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") || "";
}

function hasOwnerAddProfileIntent() {
  return readCookie(SIGNUP_INTENT_COOKIE) === OWNER_ADD_PROFILE_INTENT;
}

function clearSignupIntent() {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNUP_INTENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthCard({
  mode
}: {
  mode: "login" | "signup" | "forgot";
}) {
  const router = useRouter();
  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" });
  const [resetToken, setResetToken] = useState("");
  const [status, setStatus] = useState("");
  const [verificationLink, setVerificationLink] = useState("");
  const [mailStatus, setMailStatus] = useState<MailStatus | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingRole, setPendingRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role")?.toUpperCase();
    const verifyToken = params.get("verify");
    const nextResetToken = params.get("token");
    if (isSignup && hasOwnerAddProfileIntent()) {
      setForm((current) => ({ ...current, role: "OWNER" }));
    } else if (isSignup && (roleParam === "OWNER" || roleParam === "USER")) {
      setForm((current) => ({ ...current, role: roleParam }));
    }
    if (nextResetToken) setResetToken(nextResetToken);
    if (verifyToken) {
      fetch(`${getApiBase()}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken })
      })
        .then((response) => response.ok ? setStatus("Email verified. You can continue.") : setStatus("Verification link is invalid or expired."))
        .catch(() => setStatus("Verification failed. Try again later."));
    }
  }, [isSignup]);

  const nextPath = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : "";
  const loginHref = nextPath?.startsWith("/") && nextPath !== "/dashboard/add-profile" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  const signupHref = "/signup";
  const continueHref = pendingRole === "OWNER" && hasOwnerAddProfileIntent() ? "/dashboard/add-profile" : pendingRole === "OWNER" ? "/dashboard" : "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (isForgot) {
      const endpoint = resetToken ? "reset-password" : "forgot-password";
      setLoading(true);
      try {
        const response = await fetch(`${getApiBase()}/api/auth/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resetToken ? { token: resetToken, password: form.password } : { email: form.email })
        });
        const payload = await readApiJson<{ message?: string; error?: string; resetLink?: string; mail?: MailStatus }>(response, "password request");
        setMailStatus(payload.mail || null);
        if (payload.resetLink) setVerificationLink(payload.resetLink);
        setStatus(response.ok ? payload.message || "Request handled." : payload.error || "Password request failed.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Password request failed.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignup && form.password.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const addProfileIntent = hasOwnerAddProfileIntent();
      const response = await fetch(`${getApiBase()}/api/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Auth-Mode": "cookie" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role })
      });
      const payload = await readApiJson<{ data?: AuthUser; token?: string; error?: string; verificationRequired?: boolean; verificationLink?: string; mail?: MailStatus }>(response, isSignup ? "signup" : "login");
      if (!response.ok || !payload.data) throw new Error(payload.error || "Authentication failed.");

      saveAuthSession(payload.data);
      if (payload.verificationRequired || payload.data.emailVerified === false) {
        if (payload.data.role !== "OWNER") clearSignupIntent();
        setPendingEmail(payload.data.email || form.email);
        setPendingRole(payload.data.role || form.role);
        setVerificationLink(payload.verificationLink || "");
        setMailStatus(payload.mail || null);
        setStatus(`Please verify your email before posting reviews or managing listings.${payload.mail?.message ? ` ${payload.mail.message}` : ""}`);
        return;
      }
      const nextPath = new URLSearchParams(window.location.search).get("next");
      const fallbackPath = payload.data.role === "ADMIN" ? "/admin" : payload.data.role === "OWNER" ? (addProfileIntent ? "/dashboard/add-profile" : "/dashboard") : "/";
      if (addProfileIntent) clearSignupIntent();
      router.push(nextPath?.startsWith("/") ? nextPath : fallbackPath);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    const email = pendingEmail || form.email;
    if (!email.trim()) {
      setStatus("Enter your email address first.");
      return;
    }

    setResending(true);
    setStatus("");
    setVerificationLink("");
    setMailStatus(null);
    try {
      const response = await fetch(`${getApiBase()}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await readApiJson<{ message?: string; error?: string; verificationLink?: string; mail?: MailStatus }>(response, "verification email request");
      setVerificationLink(payload.verificationLink || "");
      setMailStatus(payload.mail || null);
      setStatus(response.ok ? payload.message || "Verification request handled." : payload.error || "Could not resend verification.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not resend verification.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_480px]">
      <section>
        <div className="inline-flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-champagne shadow-sm backdrop-blur-xl">
          <Diamond className="h-4 w-4" /> Premium directory access
        </div>
        <h1 className="mt-7 text-4xl font-semibold tracking-tight text-ink md:text-6xl">
          Manage your profile with luxury-grade UX.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Login, create an account, reset your password, add profiles and manage directory listings from a clean responsive dashboard.
        </p>
      </section>

      <GlassCard className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-champagne">{isForgot ? "Password Help" : isSignup ? "Create Account" : "Welcome Back"}</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink">
            {isForgot && resetToken ? "Set a new password" : isForgot ? "Reset your password" : isSignup ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isForgot && resetToken ? "Enter a new secure password for your account." : isForgot ? "Enter your email and we will send reset instructions." : isSignup ? "Create an account before submitting a listing." : "Use your registered email to continue."}
          </p>
        </div>

        {!isForgot && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" disabled className="flex items-center justify-center gap-2 rounded-2xl bg-white/85 px-4 py-3 text-sm font-semibold text-muted shadow-sm opacity-70">
              <Chrome className="h-4 w-4" /> Google
            </button>
            <button type="button" disabled className="flex items-center justify-center gap-2 rounded-2xl bg-white/85 px-4 py-3 text-sm font-semibold text-muted shadow-sm opacity-70">
              <Apple className="h-4 w-4" /> Apple
            </button>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <Input
                label="Full Name"
                placeholder="Your name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                autoComplete="name"
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-ink">Account Type</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: "USER", label: "Review User", help: "Post reviews only" },
                    { value: "OWNER", label: "Business Owner", help: "Post listings only" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, role: option.value }))}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1 transition ${
                        form.role === option.value ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-slate-200 hover:bg-cloud"
                      }`}
                    >
                      <span className="block">{option.label}</span>
                      <span className={`mt-1 block text-xs ${form.role === option.value ? "text-white/75" : "text-muted"}`}>{option.help}</span>
                    </button>
                  ))}
                </div>
              </label>
            </>
          )}
          {!(isForgot && resetToken) ? (
            <Input
              label="Email Address"
              placeholder={isSignup ? "you@example.com" : "admin@example.com"}
              type="email"
              value={form.email}
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              autoComplete="email"
            />
          ) : null}
          {(!isForgot || resetToken) && (
            <Input
              label="Password"
              placeholder={resetToken ? "New password" : "Password"}
              type="password"
              revealable
              value={form.password}
              onChange={(value) => setForm((current) => ({ ...current, password: value }))}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          )}
          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted"><input type="checkbox" /> Remember me</label>
              <Link href="/forgot-password" className="font-semibold text-champagne">Forgot password?</Link>
            </div>
          )}
          <Button type="submit" variant="gold" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {status ? (
          <div className="mt-4 rounded-2xl bg-white/90 p-4 text-sm font-semibold text-ink ring-1 ring-slate-200">
            <p>{status}</p>
            {mailStatus?.reason ? <p className="mt-2 text-xs leading-5 text-muted">{mailStatus.reason}</p> : null}
            {(isLogin || isSignup || pendingEmail) && (status.toLowerCase().includes("verify") || status.toLowerCase().includes("verification")) ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={resendVerification} disabled={resending}>
                  {resending ? "Sending..." : "Resend Verification"}
                </Button>
                {pendingRole ? (
                  <Button href={continueHref} variant="ghost" className="w-full sm:w-auto">
                    Continue
                  </Button>
                ) : null}
              </div>
            ) : null}
            {verificationLink ? (
              <a href={verificationLink} className="mt-3 block break-all rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                Open local link: {verificationLink}
              </a>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link href={isLogin ? signupHref : loginHref} className="font-semibold text-champagne">
            {isLogin ? "Sign up" : "Login"}
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}

function Input({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
  revealable = false
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  revealable?: boolean;
}) {
  const [showValue, setShowValue] = useState(false);
  const inputType = revealable ? (showValue ? "text" : "password") : type;
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <span className="relative block">
        <input
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-champagne focus:ring-4 focus:ring-amber-100 ${revealable ? "pr-12" : ""}`}
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => setShowValue((current) => !current)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted transition hover:bg-cloud hover:text-ink"
            aria-label={showValue ? "Hide password" : "Show password"}
          >
            {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </span>
    </label>
  );
}
