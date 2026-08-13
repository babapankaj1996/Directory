import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');
const maxAttempts = 4;

function runMigration() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: backendRoot,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true
    });
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`Applying pending database migrations (attempt ${attempt}/${maxAttempts})...`);
    if (await runMigration()) return;
    if (attempt < maxAttempts) await sleep(attempt * 2_000);
  }

  console.error('Database migrations failed after multiple attempts.');
  process.exitCode = 1;
}

void main();
