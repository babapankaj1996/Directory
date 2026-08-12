import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const backendDir = path.join(projectRoot, "backend");
const prismaCli = path.join(backendDir, "node_modules", "prisma", "build", "index.js");
const backendEntry = path.join(backendDir, "src", "index.js");
const backendPort = process.env.BACKEND_PORT || process.env.PORT || "4000";
const publicUrl = process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const runtimeEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT: backendPort,
  BACKEND_PORT: backendPort,
  APP_PUBLIC_URL: publicUrl,
  FRONTEND_URL: process.env.FRONTEND_URL || publicUrl,
  CORS_ORIGINS: process.env.CORS_ORIGINS || publicUrl
};

let child;
let shuttingDown = false;

function run(name, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const processChild = spawn(command, args, {
      cwd: backendDir,
      env: runtimeEnv,
      stdio: "inherit",
      windowsHide: true,
      ...options
    });

    processChild.once("error", reject);
    processChild.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${name} exited with ${signal || code}.`));
    });
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (child && !child.killed) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 1_000).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  console.log("Applying pending Prisma migrations...");
  await run("Prisma migration", process.execPath, [prismaCli, "migrate", "deploy"]);

  if (runtimeEnv.ADMIN_BOOTSTRAP_PASSWORD) {
    console.log("Checking the configured admin bootstrap account...");
    try {
      await run("Admin bootstrap", process.execPath, ["src/bootstrap-admin.js"]);
    } catch (error) {
      console.error("Admin bootstrap was skipped; the API will continue without changing admin access.");
      console.error(error instanceof Error ? error.message : error);
    }
  } else if (runtimeEnv.ADMIN_BOOTSTRAP_EMAIL) {
    console.log("Admin bootstrap password is not configured; keeping the existing admin account unchanged.");
  }

  const backendEnv = {
    ...runtimeEnv
  };
  delete backendEnv.ADMIN_BOOTSTRAP_EMAIL;
  delete backendEnv.ADMIN_BOOTSTRAP_NAME;
  delete backendEnv.ADMIN_BOOTSTRAP_PASSWORD;
  delete backendEnv.ADMIN_BOOTSTRAP_ROTATE_PASSWORD;

  child = spawn(process.execPath, [backendEntry], {
    cwd: backendDir,
    env: backendEnv,
    stdio: "inherit",
    windowsHide: true
  });
  child.once("error", (error) => {
    console.error("Backend API failed to start:", error);
    shutdown(1);
  });
  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`Backend API exited with ${signal || code}.`);
    shutdown(code || 1);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
