#!/usr/bin/env node
/**
 * Deploy a Node.js app to Hostinger from CI.
 *
 * Hostinger has no git-source deployment: the only route is uploading a source
 * archive, and that upload is a multi-step handshake (broker upload credentials
 * -> push to a file service -> resolve build settings -> trigger the build).
 * Rather than reimplement those internals, this drives the official
 * `hostinger-api-mcp` package over stdio and calls the same supported tool the
 * Hostinger tooling exposes, then polls the build to completion.
 *
 * Usage: node hostinger-deploy.mjs --domain <domain> --archive <path> [--timeout <sec>]
 * Requires: HOSTINGER_API_TOKEN in the environment.
 */
import { spawn } from "node:child_process";
import process from "node:process";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, [])
);

const domain = args.domain;
const archive = args.archive;
const listOnly = "list-tools" in args;
const timeoutSeconds = Number(args.timeout || 900);

if (!process.env.HOSTINGER_API_TOKEN) {
  console.error("HOSTINGER_API_TOKEN is not set.");
  process.exit(1);
}
if (!listOnly && (!domain || !archive)) {
  console.error("Usage: hostinger-deploy.mjs --domain <domain> --archive <path>");
  process.exit(1);
}

// shell:true on Windows — Node cannot spawn a .cmd shim directly (EINVAL).
const isWindows = process.platform === "win32";
const child = spawn(
  isWindows ? "npx.cmd" : "npx",
  ["--yes", "--package=hostinger-api-mcp@latest", "hostinger-hosting-mcp"],
  { stdio: ["pipe", "pipe", "pipe"], env: process.env, shell: isWindows }
);

child.stderr.on("data", (chunk) => {
  const text = String(chunk).trim();
  if (text && !/^\s*$/.test(text)) console.error(`[mcp] ${text}`);
});

let buffer = "";
const pending = new Map();
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (message.id != null && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  }
});

let nextId = 1;
function send(method, params) {
  const id = nextId++;
  const payload = { jsonrpc: "2.0", id, method, ...(params ? { params } : {}) };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  });
}
function notify(method) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method })}\n`);
}

/** MCP tool results arrive as content blocks; unwrap the JSON payload. */
async function callTool(name, toolArgs) {
  const result = await send("tools/call", { name, arguments: toolArgs });
  const text = (result?.content || []).map((c) => c.text ?? "").join("");
  if (result?.isError) throw new Error(`${name} failed: ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return text; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "hostinger-ci-deploy", version: "1.0.0" }
  });
  notify("notifications/initialized");

  if (listOnly) {
    const tools = await send("tools/list");
    const names = (tools?.tools || []).map((t) => t.name);
    console.log(`connected; ${names.length} tools available`);
    console.log(["hosting_deployJsApplication", "hosting_listJsDeployments", "hosting_getNodeJSBuildLogsV1", "hosting_clearWebsiteCacheV1"]
      .map((n) => `  ${names.includes(n) ? "present" : "MISSING"}  ${n}`).join("\n"));
    child.kill();
    process.exit(names.includes("hosting_deployJsApplication") ? 0 : 1);
  }

  console.log(`Uploading ${archive} to ${domain} ...`);
  const deploy = await callTool("hosting_deployJsApplication", { domain, archivePath: archive });
  if (deploy?.build?.status !== "success") {
    console.error("Deploy did not start:", JSON.stringify(deploy).slice(0, 600));
    process.exit(1);
  }
  const uuid = deploy.build.data.uuid;
  console.log(`Build ${uuid} started; waiting for completion ...`);

  const deadline = Date.now() + timeoutSeconds * 1000;
  let state = "pending";
  let delay = 10000;
  while (Date.now() < deadline) {
    await sleep(delay);
    delay = Math.min(delay * 1.3, 30000);
    const list = await callTool("hosting_listJsDeployments", { domain, perPage: 5 });
    const build = (list?.deployments?.data || []).find((d) => d.uuid === uuid);
    if (!build) continue;
    if (build.state !== state) {
      state = build.state;
      console.log(`  state: ${state}`);
    }
    if (state === "completed" || state === "failed") break;
  }

  if (state !== "completed") {
    console.error(`Build ended in state "${state}". Logs:`);
    const logs = await callTool("hosting_showJsDeploymentLogs", { domain, buildUuid: uuid }).catch(() => null);
    if (logs) console.error(String(logs.logs || JSON.stringify(logs)).slice(-4000));
    process.exit(1);
  }

  console.log("Build completed. Purging CDN cache ...");
  await callTool("hosting_clearWebsiteCacheV1", { username: args.username, domain }).catch((e) => {
    console.warn(`  cache purge skipped: ${e.message.slice(0, 120)}`);
  });
  console.log("Deploy finished.");
  child.kill();
  process.exit(0);
} catch (error) {
  console.error("Deploy error:", error.message);
  child.kill();
  process.exit(1);
}
