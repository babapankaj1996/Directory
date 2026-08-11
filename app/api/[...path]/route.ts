import { proxyBackendRequest } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return proxyBackendRequest(request, `/api/${encodedPath}`);
}

export { handler as DELETE, handler as GET, handler as HEAD, handler as OPTIONS, handler as PATCH, handler as POST, handler as PUT };
