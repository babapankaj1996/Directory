import { proxyBackendRequest } from "@/lib/backend-proxy";

/**
 * Browser-facing entry point to the backend API.
 *
 * The host's edge returns a 403 HTML page for any request whose path contains
 * an "api" segment. It first caught /api/..., and later /gateway/api/... as
 * well, so renaming the prefix alone was not durable. Browser-visible URLs now
 * carry no "api" segment at all — the browser asks for /gateway/auth/login —
 * and the prefix is restored here before the request is forwarded.
 *
 * Server-rendered pages call the backend directly and never pass through this.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return proxyBackendRequest(request, `/api/${encodedPath}`);
}

export { handler as DELETE, handler as GET, handler as HEAD, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };
