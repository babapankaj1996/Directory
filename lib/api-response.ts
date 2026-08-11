export async function readApiJson<T>(response: Response, action = "request"): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("application/json")) {
    return await response.json() as T;
  }

  const body = await response.text().catch(() => "");
  const receivedHtml = /^\s*</.test(body);
  const status = response.status ? ` HTTP ${response.status}.` : ".";
  const reason = receivedHtml
    ? "The server returned an HTML page instead of API JSON."
    : "The server returned a non-JSON response.";

  throw new Error(`${reason} Backend API is not reachable for this ${action}.${status} Check the production API startup logs and BACKEND_API_URL.`);
}
