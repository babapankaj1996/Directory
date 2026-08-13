import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeEnv = { ...process.env };
let api;
let stopping = false;

function runBootstrap() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/bootstrap-admin.js'], {
      cwd: backendRoot,
      env: runtimeEnv,
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

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  if (api && !api.killed) api.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1_000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (runtimeEnv.ADMIN_BOOTSTRAP_PASSWORD) {
  try {
    console.log('Checking the configured admin bootstrap account...');
    await runBootstrap();
  } catch (error) {
    console.error('Admin bootstrap was skipped; the API will continue without changing admin access.');
    console.error(error instanceof Error ? error.message : error);
  }
}

delete runtimeEnv.ADMIN_BOOTSTRAP_EMAIL;
delete runtimeEnv.ADMIN_BOOTSTRAP_NAME;
delete runtimeEnv.ADMIN_BOOTSTRAP_PASSWORD;
delete runtimeEnv.ADMIN_BOOTSTRAP_ROTATE_PASSWORD;

api = spawn(process.execPath, ['src/index.js'], {
  cwd: backendRoot,
  env: runtimeEnv,
  stdio: 'inherit',
  windowsHide: true
});
api.once('error', (error) => {
  console.error('Backend API failed to start:', error);
  shutdown(1);
});
api.once('exit', (code, signal) => {
  if (stopping) return;
  console.error(`Backend API exited with ${signal || code}.`);
  shutdown(code || 1);
});
