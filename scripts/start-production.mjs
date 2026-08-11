import { spawn } from "node:child_process";

const frontendPort = process.env.PORT || process.env.FRONTEND_PORT || "3000";
const backendPort = process.env.BACKEND_PORT || "4000";
const publicUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || `http://127.0.0.1:${frontendPort}`;
const backendUrl = process.env.BACKEND_API_URL || `http://127.0.0.1:${backendPort}`;

const children = new Set();
let shuttingDown = false;

function isLocalBackend(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...options
  });

  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(`${name} exited with ${signal || code}. Stopping production server.`);
      shutdown(code || 1);
    }
  });

  return child;
}

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500).unref();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBackend() {
  const healthUrl = new URL("/api/health", backendUrl).toString();
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    if (!children.size) return;
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) {
        console.log(`Backend API is ready at ${healthUrl}`);
      } else {
        console.warn(`Backend API responded with HTTP ${response.status} at ${healthUrl}`);
      }
      return;
    } catch {
      await sleep(500);
    }
  }

  console.warn(`Backend API did not respond at ${healthUrl} within 30 seconds. Starting frontend anyway.`);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (isLocalBackend(backendUrl)) {
  startProcess("backend", process.execPath, ["scripts/start-backend.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "production",
      BACKEND_PORT: backendPort,
      PORT: backendPort,
      APP_PUBLIC_URL: process.env.APP_PUBLIC_URL || publicUrl,
      FRONTEND_URL: process.env.FRONTEND_URL || publicUrl,
      CORS_ORIGINS: process.env.CORS_ORIGINS || publicUrl
    }
  });

  await waitForBackend();
} else {
  console.log(`Using external backend at ${backendUrl}`);
}

if (!shuttingDown) startProcess("frontend", process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", frontendPort, "-H", "0.0.0.0"], {
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || "production",
    NEXT_PUBLIC_APP_URL: publicUrl,
    BACKEND_API_URL: backendUrl,
    EMBEDDED_BACKEND: "false"
  }
});
