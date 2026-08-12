import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const nextDir = path.resolve(".next");

async function traceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await traceFiles(absolute));
    else if (entry.name.endsWith(".nft.json")) files.push(absolute);
  }
  return files;
}

const traced = new Set();
for (const file of await traceFiles(nextDir)) {
  const payload = JSON.parse(await readFile(file, "utf8"));
  const traceDir = path.dirname(file);
  for (const relative of payload.files || []) {
    traced.add(path.relative(process.cwd(), path.resolve(traceDir, relative)).replaceAll("\\", "/"));
  }
}

const required = [
  "scripts/start-backend.mjs",
  "backend/package.json",
  "backend/src/index.js",
  "backend/node_modules/@prisma/client/package.json",
  "backend/node_modules/.prisma/client/schema.prisma",
  "backend/node_modules/express/package.json",
  "backend/node_modules/sharp/package.json"
];
const missing = required.filter((file) => !traced.has(file));
const privateUploads = [...traced].filter((file) => file.startsWith("backend/uploads/"));

if (missing.length || privateUploads.length) {
  if (missing.length) console.error(`Production trace is missing:\n${missing.join("\n")}`);
  if (privateUploads.length) console.error(`Production trace contains private uploads:\n${privateUploads.join("\n")}`);
  process.exit(1);
}

console.log(`Production trace verified with ${required.length} required backend files and no uploaded media.`);
