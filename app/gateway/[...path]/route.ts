import { proxyBackendRequest } from "@/lib/backend-proxy";

/**
 * Browser-facing entry point to the backend API.
 *
 * The host's edge returns a 403 for any request under /api/ before it reaches
 * this application, which broke every client-side call — login included — while
 * server-rendered pages kept working, since those reach the backend directly.
 * Serving the same proxy from a path the edge does not filter restores it.
 *
 * Callers build `${getApiBase()}/api/...`, so `path` already begins with "api"
 * and is forwarded unchanged.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return proxyBackendRequest(request, `/${encodedPath}`);
}

export { handler as DELETE, handler as GET, handler as HEAD, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };
