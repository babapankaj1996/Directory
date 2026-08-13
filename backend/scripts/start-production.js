import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeEnv = { ...process.env };
let api;
let stopping = false;

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
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

async function deployMigrations() {
  const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');
  console.log('Applying pending database migrations...');
  await runNode([prismaCli, 'migrate', 'deploy']);
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  if (api && !api.killed) api.kill('SIGTERM');
  setTimeout(() => process.exit(code), 1_000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  try {
    await deployMigrations();
  } catch (error) {
    console.error('Database migrations failed; the API cannot start safely.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }


  if (runtimeEnv.ADMIN_BOOTSTRAP_PASSWORD) {
    try {
      console.log('Checking the configured admin bootstrap account...');
      await runNode(['src/bootstrap-admin.js']);
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
}

void main().catch((error) => {
  console.error('Unexpected backend startup failure:', error);
  process.exitCode = 1;
});
