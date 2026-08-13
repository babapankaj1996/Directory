import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/index.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runBootstrap() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/bootstrap-admin.js'], {
      cwd: backendRoot,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Admin bootstrap exited with ${signal || code}.`));
    });
  });
}

async function bootstrapAdmin() {
  if (!process.env.ADMIN_BOOTSTRAP_PASSWORD) return;
  try {
    console.log('Checking the configured admin bootstrap account...');
    await runBootstrap();
  } catch (error) {
    console.error('Admin bootstrap was skipped; the API will continue without changing admin access.');
    console.error(error instanceof Error ? error.message : error);
  }
}

void bootstrapAdmin();
