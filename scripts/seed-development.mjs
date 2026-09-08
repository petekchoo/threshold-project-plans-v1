import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = resolve(import.meta.dirname, '..');
const fixtureIds = {
  members: [
    '71000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000003',
  ],
  projectTypes: [
    '72000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000002',
  ],
  activityTypes: [
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0000-000000000002',
    '73000000-0000-0000-0000-000000000003',
  ],
  projects: [
    '74000000-0000-0000-0000-000000000001',
    '74000000-0000-0000-0000-000000000002',
    '74000000-0000-0000-0000-000000000003',
  ],
};

function readEnvironmentFile() {
  const source = readFileSync(resolve(root, '.env.local'), 'utf8');
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

function fail(message) {
  throw new Error(`Development seed failed: ${message}`);
}

function addDays(value) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + value);
  return date.toISOString().slice(0, 10);
}

async function requireSuccess(operation, label) {
  const result = await operation;
  if (result.error) fail(`${label}: ${result.error.message}`);
  return result.data;
}

const values = readEnvironmentFile();
if (values.THRESHOLD_SUPABASE_ENV !== 'development') fail('development is not the selected environment.');
if (process.env.THRESHOLD_ALLOW_DB_WRITE !== 'development') {
  fail('set THRESHOLD_ALLOW_DB_WRITE=development for this explicitly authorized write.');
}

const guard = spawnSync(process.execPath, [resolve(root, 'scripts/supabase-environment.mjs'), 'check', '--require-development', '--require-link'], {
  cwd: root,
  stdio: 'inherit',
});
if (guard.status !== 0) process.exit(guard.status ?? 1);

const keyResult = spawnSync('supabase', [
  'projects', 'api-keys', '--project-ref', values.SUPABASE_DEV_PROJECT_REF, '--reveal', '--output', 'json',
], { cwd: root, encoding: 'utf8' });
if (keyResult.status !== 0) fail('could not retrieve the development secret key.');
const parsedKeys = JSON.parse(keyResult.stdout);
const keys = Array.isArray(parsedKeys) ? parsedKeys : (parsedKeys.api_keys || parsedKeys.keys || []);
const secretEntry = keys.find((entry) => (entry.type || entry.name || entry.key_type) === 'secret');
const secretKey = secretEntry && (secretEntry.api_key || secretEntry.key || secretEntry.value);
if (!secretKey) fail('development secret key is unavailable.');

const email = values.THRESHOLD_DEV_E2E_EMAIL;
const password = values.THRESHOLD_DEV_E2E_PASSWORD;
if (!email || !password) fail('dedicated E2E credentials are missing.');

const admin = createClient(values.SUPABASE_DEV_URL, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let testUser;
for (let page = 1; !testUser; page += 1) {
  const users = await requireSuccess(admin.auth.admin.listUsers({ page, perPage: 100 }), 'list development users');
  testUser = users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (users.users.length < 100) break;
}
if (testUser) {
  testUser = await requireSuccess(admin.auth.admin.updateUserById(testUser.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Threshold DEV Tester' },
  }), 'update dedicated development user').then((data) => data.user);
} else {
  testUser = await requireSuccess(admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Threshold DEV Tester' },
  }), 'create dedicated development user').then((data) => data.user);
}
if (!testUser) fail('dedicated development user was not returned.');

if (!/^[0-9a-f-]{36}$/i.test(testUser.id)) fail('dedicated development user id is invalid.');

const activities = [
  '75000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000002',
  '75000000-0000-0000-0000-000000000003',
  '75000000-0000-0000-0000-000000000004',
  '75000000-0000-0000-0000-000000000005',
];
const sql = `
begin;
delete from public.projects where id = any(array['${fixtureIds.projects.join("','")}']::uuid[]);
delete from public.team_members where id = any(array['${fixtureIds.members.join("','")}']::uuid[]);
delete from public.project_types where id = any(array['${fixtureIds.projectTypes.join("','")}']::uuid[]);
delete from public.activity_types where id = any(array['${fixtureIds.activityTypes.join("','")}']::uuid[]);

insert into public.team_members (id, full_name, initials, email) values
  ('${fixtureIds.members[0]}', 'DEV Avery Morgan', 'DA', 'avery@example.test'),
  ('${fixtureIds.members[1]}', 'DEV Jordan Lee', 'DJ', 'jordan@example.test'),
  ('${fixtureIds.members[2]}', 'DEV Riley Chen', 'DR', 'riley@example.test');
insert into public.project_types (id, name) values
  ('${fixtureIds.projectTypes[0]}', 'DEV Event'),
  ('${fixtureIds.projectTypes[1]}', 'DEV Campaign');
insert into public.activity_types (id, name) values
  ('${fixtureIds.activityTypes[0]}', 'DEV Planning'),
  ('${fixtureIds.activityTypes[1]}', 'DEV Production'),
  ('${fixtureIds.activityTypes[2]}', 'DEV Communications');

insert into public.projects (id, name, description, project_type_id, status, start_date, end_date, created_by) values
  ('${fixtureIds.projects[0]}', 'DEV Gala', 'Resettable DEV fixture for local development and browser validation.', '${fixtureIds.projectTypes[0]}', 'on_track', '${addDays(-10)}', '${addDays(30)}', '${testUser.id}'),
  ('${fixtureIds.projects[1]}', 'DEV Fall Campaign', 'Future DEV project fixture.', '${fixtureIds.projectTypes[1]}', 'draft', '${addDays(20)}', '${addDays(60)}', '${testUser.id}'),
  ('${fixtureIds.projects[2]}', 'DEV Completed Dinner', 'Completed DEV project fixture.', '${fixtureIds.projectTypes[0]}', 'completed', '${addDays(-60)}', '${addDays(-30)}', '${testUser.id}');
insert into public.project_owners (project_id, team_member_id) values
  ('${fixtureIds.projects[0]}', '${fixtureIds.members[0]}'),
  ('${fixtureIds.projects[0]}', '${fixtureIds.members[1]}'),
  ('${fixtureIds.projects[1]}', '${fixtureIds.members[2]}');

insert into public.activities (id, project_id, activity_type_id, name, status, priority, start_date, due_date, notes, allow_outside_project, project_timing_rule, project_timing_boundary, project_timing_offset_days, created_by) values
  ('${activities[0]}', '${fixtureIds.projects[0]}', '${fixtureIds.activityTypes[0]}', 'DEV Confirm gala brief', 'completed', 'normal', '${addDays(-10)}', '${addDays(-8)}', 'Completed DEV prerequisite fixture.', false, null, null, null, '${testUser.id}'),
  ('${activities[1]}', '${fixtureIds.projects[0]}', '${fixtureIds.activityTypes[0]}', 'DEV Finalize guest requirements', 'in_progress', 'high', '${addDays(-7)}', '${addDays(2)}', 'Active owned DEV fixture.', false, null, null, null, '${testUser.id}'),
  ('${activities[2]}', '${fixtureIds.projects[0]}', '${fixtureIds.activityTypes[1]}', 'DEV Produce gala materials', 'not_started', 'normal', '${addDays(2)}', '${addDays(10)}', '', false, null, null, null, '${testUser.id}'),
  ('${activities[3]}', '${fixtureIds.projects[0]}', '${fixtureIds.activityTypes[2]}', 'DEV Resolve overdue invitation list', 'blocked', 'urgent', '${addDays(-5)}', '${addDays(-1)}', 'Unassigned overdue DEV fixture.', false, null, null, null, '${testUser.id}'),
  ('${activities[4]}', '${fixtureIds.projects[0]}', '${fixtureIds.activityTypes[2]}', 'DEV Send post-event follow-up', 'not_started', 'normal', '${addDays(29)}', '${addDays(35)}', '', true, 'post_project_deadline', 'end', 7, '${testUser.id}');
insert into public.activity_owners (activity_id, team_member_id) values
  ('${activities[0]}', '${fixtureIds.members[0]}'),
  ('${activities[1]}', '${fixtureIds.members[0]}'),
  ('${activities[1]}', '${fixtureIds.members[1]}'),
  ('${activities[2]}', '${fixtureIds.members[2]}'),
  ('${activities[4]}', '${fixtureIds.members[1]}');
insert into public.activity_links (id, activity_id, label, url, sort_order) values
  ('76000000-0000-0000-0000-000000000001', '${activities[1]}', 'DEV brief', 'https://example.com/dev-brief', 0);
insert into public.activity_dependencies (id, activity_id, depends_on_activity_id, constraint_type) values
  ('77000000-0000-0000-0000-000000000001', '${activities[1]}', '${activities[0]}', 'finish_to_start'),
  ('77000000-0000-0000-0000-000000000002', '${activities[2]}', '${activities[1]}', 'finish_to_start');
update public.profiles set full_name = 'Threshold DEV Tester' where id = '${testUser.id}';
commit;
`;

const seedResult = spawnSync('supabase', ['db', 'query', '--linked', sql], {
  cwd: root,
  encoding: 'utf8',
});
if (seedResult.status !== 0) fail('database fixture transaction did not complete.');

console.log('Development-only fixtures reset: 1 DEV test user, 3 DEV projects, 5 DEV activities, and supporting DEV reference data.');
