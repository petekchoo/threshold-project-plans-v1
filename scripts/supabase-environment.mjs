import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function readEnvironmentFile() {
  const values = {};
  const path = resolve(root, '.env.local');
  if (existsSync(path)) {
    const source = readFileSync(path, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return { ...values, ...process.env };
}

function projectRefFromUrl(value) {
  try {
    const host = new URL(value).hostname;
    const suffix = '.supabase.co';
    return host.endsWith(suffix) ? host.slice(0, -suffix.length) : null;
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(`Supabase environment check failed: ${message}`);
  process.exit(1);
}

const command = process.argv[2] ?? 'check';
const values = readEnvironmentFile();
const selected = values.THRESHOLD_SUPABASE_ENV;

if (!['development', 'production'].includes(selected)) {
  fail('THRESHOLD_SUPABASE_ENV must be development or production.');
}
if (process.argv.includes('--require-development') && selected !== 'development') {
  fail('local application startup requires the dedicated development backend.');
}

const prefix = selected === 'development' ? 'SUPABASE_DEV' : 'SUPABASE_PROD';
const selectedUrl = values[`${prefix}_URL`];
const selectedKey = values[`${prefix}_PUBLISHABLE_KEY`];
const selectedRef = values[`${prefix}_PROJECT_REF`] || projectRefFromUrl(selectedUrl);
const activeRef = projectRefFromUrl(values.NEXT_PUBLIC_SUPABASE_URL);

if (!selectedUrl || !selectedKey || !selectedRef) {
  fail(`${selected} URL, publishable key, or project reference is missing.`);
}
if (values.NEXT_PUBLIC_SUPABASE_URL !== selectedUrl
  || values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== selectedKey) {
  fail(`active browser configuration does not match the selected ${selected} environment.`);
}
if (activeRef !== selectedRef) {
  fail(`active browser URL does not identify the selected ${selected} project.`);
}

const requiresLink = command !== 'check' || process.argv.includes('--require-link');
if (requiresLink) {
  const linkPath = resolve(root, 'supabase/.temp/project-ref');
  if (!existsSync(linkPath)) fail('the local CLI is not linked to a hosted project.');
  const linkedRef = readFileSync(linkPath, 'utf8').trim();
  if (linkedRef !== selectedRef) {
    fail(`the local CLI link does not match the selected ${selected} environment.`);
  }
}

console.log(`Supabase target verified: ${selected}; app configuration${requiresLink ? ' and CLI link' : ''} match.`);

const commands = {
  status: ['migration', 'list'],
  lint: ['db', 'lint', '--linked', '--level', 'warning'],
  'push-dry-run': ['db', 'push', '--dry-run'],
  push: ['db', 'push'],
  types: ['gen', 'types', 'typescript', '--linked', '--schema', 'public'],
};

if (command === 'check') process.exit(0);
if (!commands[command]) fail(`unknown command ${command}.`);
if (command === 'push' && process.env.THRESHOLD_ALLOW_DB_WRITE !== selected) {
  fail(`set THRESHOLD_ALLOW_DB_WRITE=${selected} for this explicitly authorized write.`);
}

const password = values[`${prefix}_DB_PASSWORD`];
if (selected === 'development' && !password) {
  fail('SUPABASE_DEV_DB_PASSWORD is missing.');
}

const result = spawnSync('supabase', commands[command], {
  cwd: root,
  env: {
    ...process.env,
    ...(password ? { SUPABASE_DB_PASSWORD: password } : {}),
  },
  encoding: command === 'types' ? 'utf8' : undefined,
  stdio: command === 'types' ? ['inherit', 'pipe', 'inherit'] : 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);
if (command === 'types') {
  writeFileSync(resolve(root, 'database.types.ts'), result.stdout);
}
