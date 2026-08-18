import { cookies } from "next/headers";

/**
 * Server-side session check for the guarded areas.
 *
 * This asks the API who the caller is rather than verifying the token locally.
 * That is deliberate: the two applications are deployed as separate Hostinger
 * apps, each with its own environment, and the platform's environment takes
 * precedence over the .env file shipped in the archive. The signing secrets
 * therefore drifted apart, and a locally-verifying guard rejected every real
 * session — an administrator who had just signed in was told their token was
 * forged and bounced back to /login?next=/admin.
 *
 * Asking the issuer removes the shared secret from the picture entirely: the
 * backend is the single authority on whether a session is valid, so the two
 * can never disagree. It also means a session revoked by logging out is
 * refused here immediately, which a self-contained signature check could not
 * know about.
 *
 * The cost is one request per guarded page render, which is acceptable for the
 * admin and owner areas and is not on any public path.
 */
export type SessionUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  emailVerified?: boolean;
};

function apiBase() {
  return (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

/** The signed-in user for this request, or null. */
export async function readSession(requiredRole?: "ADMIN"): Promise<SessionUser | null> {
  const store = await cookies();
  const session = store.get("session_token")?.value;
  const admin = store.get("admin_token")?.value;
  if (!session && !admin) return null;

  const base = apiBase();
  if (!base) return null;

  const cookieHeader = [
    session ? `session_token=${session}` : "",
    admin ? `admin_token=${admin}` : ""
  ]
    .filter(Boolean)
    .join("; ");

  try {
    const response = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store"
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: SessionUser | null; authenticated?: boolean };
    const user = payload.authenticated ? payload.data : null;
    if (!user) return null;
    if (user.status && user.status !== "ACTIVE") return null;
    if (requiredRole && user.role !== requiredRole) return null;
    return user;
  } catch {
    // The API being unreachable must not hand out access.
    return null;
  }
}
