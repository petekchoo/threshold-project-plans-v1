import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const base = process.env.GITHUB_BASE_SHA || process.argv[2];
const head = process.env.GITHUB_HEAD_SHA || process.argv[3] || 'HEAD';
if (!base) throw new Error('Provide a base revision through GITHUB_BASE_SHA or the first argument.');
const diff = spawnSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' });
if (diff.status !== 0) throw new Error(diff.stderr || 'Unable to inspect changed files.');
const files = diff.stdout.trim().split(/\r?\n/).filter(Boolean);

const alwaysFull = [
  /^e2e\//, /^playwright\.config\./, /^scripts\/(?:e2e-scope|run-local-e2e)\.mjs$/,
  /^app\/(?:globals|extended)\.css$/, /^app\/layout\./, /^components\/shared\//,
  /^components\/shell\//, /^components\/threshold-app\./, /^lib\/(?:data|supabase)\//,
  /^supabase\//, /^package(?:-lock)?\.json$/, /^pnpm-lock\.yaml$/,
];
const tags = new Set(['@auth']);
let mode = 'scoped';
if (!files.length || files.some(file => alwaysFull.some(pattern => pattern.test(file)))) mode = 'all';
for (const file of files) {
  if (/^(?:components|app)\/activities\/|^app\/activities|^lib\/planning\/activity/.test(file)) {
    tags.add('@activities'); tags.add('@dependencies');
  }
  if (/^(?:components|app)\/projects\/|^app\/projects|^lib\/planning\/project/.test(file)) tags.add('@projects');
  if (/^(?:components|app)\/overview\/|^app\/page|^lib\/planning\/overview/.test(file)) tags.add('@overview');
  if (/^(?:components|app)\/administration\/|^app\/administration/.test(file)) tags.add('@administration');
  if (/^(?:components|app)\/templates\/|^app\/templates|^lib\/planning\/project-template/.test(file)) tags.add('@templates');
  if (/^(?:app\/(?:globals|extended)\.css|components\/(?:shared|shell)\/|e2e\/accessibility-baseline|playwright\.config\.)/.test(file)) tags.add('@accessibility');
}
if (files.every(file => /^(?:plans\/|docs\/|.*\.md$|implementation-map\.yaml$|TASKS\.md$|DESIGN\.md$)/.test(file))) mode = 'none';
if (process.env.THRESHOLD_E2E_FORCE_ALL === '1') mode = 'all';
const grep = [...tags].join('|');
const output = `mode=${mode}\ngrep=${grep}\nfiles=${files.length}\n`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
else process.stdout.write(output);
