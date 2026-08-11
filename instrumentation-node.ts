import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

type BackendRuntime = typeof globalThis & {
  directoryBackendProcess?: ChildProcess;
  directoryBackendStopping?: boolean;
};

const runtime = globalThis as BackendRuntime;

function isLocalBackend(rawUrl: string) {
  try {
    const hostname = new URL(rawUrl).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
  } catch {
    return false;
  }
}

async function waitForBackend(child: ChildProcess, backendUrl: string) {
  const healthUrl = new URL("/api/health", backendUrl).toString();
  const startedAt = Date.now();

  while (Date.now() - startedAt < 45_000) {
    if (child.exitCode !== null || child.signalCode) {
      throw new Error("The embedded backend exited before becoming healthy. Check the startup logs above.");
    }
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        console.log(`Embedded backend is ready at ${healthUrl}`);
        return;
      }
    } catch {
      // The API may still be applying migrations or opening its database connection.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`The embedded backend did not become healthy at ${healthUrl} within 45 seconds.`);
}

function stopBackend() {
  if (runtime.directoryBackendStopping) return;
  runtime.directoryBackendStopping = true;
  const child = runtime.directoryBackendProcess;
  if (child && !child.killed) child.kill("SIGTERM");
}

export async function registerEmbeddedBackend() {
  if (process.env.NODE_ENV !== "production") return;
  if (String(process.env.EMBEDDED_BACKEND || "true").toLowerCase() === "false") return;

  const backendPort = process.env.BACKEND_PORT || "4000";
  const backendUrl = process.env.BACKEND_API_URL || `http://127.0.0.1:${backendPort}`;
  if (!isLocalBackend(backendUrl)) {
    console.log(`Using external backend at ${backendUrl}`);
    return;
  }
  if (runtime.directoryBackendProcess) return;

  const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", "start-backend.mjs")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      BACKEND_PORT: backendPort,
      PORT: backendPort
    },
    stdio: "inherit",
    windowsHide: true
  });
  runtime.directoryBackendProcess = child;

  child.once("exit", (code, signal) => {
    runtime.directoryBackendProcess = undefined;
    if (!runtime.directoryBackendStopping) {
      console.error(`Embedded backend stopped with ${signal || code}. Stopping Next.js so the platform can restart both services.`);
      process.exitCode = code || 1;
      setTimeout(() => process.exit(process.exitCode || 1), 250).unref();
    }
  });
  child.once("error", (error) => {
    console.error("Could not launch the embedded backend:", error);
  });

  process.once("SIGINT", stopBackend);
  process.once("SIGTERM", stopBackend);
  process.once("exit", stopBackend);

  await waitForBackend(child, backendUrl);
}
