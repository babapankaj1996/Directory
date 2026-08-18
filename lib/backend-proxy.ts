function jsonError(status: number, error: string) {
  return Response.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function backendOrigin() {
  const raw = process.env.BACKEND_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:4000");
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function isProxyLoop(origin: string, request: Request) {
  const configuredPublicUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || "";
  try {
    if (new URL(request.url).origin === origin) return true;
    return Boolean(configuredPublicUrl && new URL(configuredPublicUrl).origin === origin);
  } catch {
    return true;
  }
}

export async function proxyBackendRequest(request: Request, pathname: string) {
  const origin = backendOrigin();
  if (!origin) return jsonError(500, "BACKEND_API_URL is missing or invalid.");
  if (isProxyLoop(origin, request)) {
    return jsonError(503, "BACKEND_API_URL must point to the private API service, not this frontend URL.");
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(pathname, `${origin}/`);
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.set("accept-encoding", "identity");
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));

  /*
   * Pass the visitor's address through.
   *
   * Every browser call reaches the API via this proxy, so without an explicit
   * X-Forwarded-For the backend sees this server's address for everyone and the
   * rate limits collapse into one shared bucket — eight signups an hour for the
   * entire site, after which nobody can register. The incoming request already
   * carries the client address from the edge; forward the first entry, which is
   * the original client rather than an intermediary.
   */
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim() || request.headers.get("x-real-ip") || "";
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
    headers.set("x-real-ip", clientIp);
  }

  try {
    const method = request.method.toUpperCase();
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: request.signal
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("connection");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const cookies = getSetCookie?.call(upstream.headers) || [];
    if (cookies.length) {
      responseHeaders.delete("set-cookie");
      cookies.forEach((cookie) => responseHeaders.append("set-cookie", cookie));
    }

    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    if (request.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      return new Response(null, { status: 499 });
    }
    console.error(`Backend proxy request failed for ${pathname}:`, error instanceof Error ? error.message : error);
    return jsonError(502, "Backend API is unavailable.");
  }
}
