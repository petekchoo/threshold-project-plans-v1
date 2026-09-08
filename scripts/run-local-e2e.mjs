import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

function fail(message) {
  throw new Error(`Local E2E setup failed: ${message}`);
}

function localEnvironment() {
  const result = spawnSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
  if (result.status !== 0) fail('the disposable Supabase stack is not running. Start it with pnpm db:start.');
  const values = {};
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) values[match[1]] = match[2];
  }
  const url = values.API_URL;
  const publishableKey = values.ANON_KEY || values.PUBLISHABLE_KEY;
  const serviceKey = values.SERVICE_ROLE_KEY || values.SECRET_KEY;
  if (!url || !publishableKey || !serviceKey) fail('Supabase did not report its local API keys.');
  return { url, publishableKey, serviceKey };
}

async function requireSuccess(operation, label) {
  const result = await operation;
  if (result.error) fail(`${label}: ${result.error.message}`);
  return result.data;
}

function addDays(value) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + value);
  return date.toISOString().slice(0, 10);
}

const ids = {
  members: ['71000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000003'],
  projectTypes: ['72000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002'],
  activityTypes: ['73000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000003'],
  projects: ['74000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000003'],
  activities: ['75000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000004', '75000000-0000-0000-0000-000000000005'],
};

const { url, publishableKey, serviceKey } = localEnvironment();
const email = 'threshold-e2e@example.test';
const password = 'threshold-local-e2e-password';
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
let user;
const users = await requireSuccess(admin.auth.admin.listUsers({ perPage: 100 }), 'list local users');
user = users.users.find(item => item.email === email);
if (user) {
  user = (await requireSuccess(admin.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: { full_name: 'Threshold DEV Tester' } }), 'update local user')).user;
} else {
  user = (await requireSuccess(admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Threshold DEV Tester' } }), 'create local user')).user;
}
if (!user) fail('the local E2E user was not returned.');

await requireSuccess(admin.from('projects').delete().in('id', ids.projects), 'clear projects');
await requireSuccess(admin.from('team_members').delete().in('id', ids.members), 'clear members');
await requireSuccess(admin.from('project_types').delete().in('id', ids.projectTypes), 'clear project types');
await requireSuccess(admin.from('activity_types').delete().like('name', 'DEV QA E2E %'), 'clear QA activity types');
await requireSuccess(admin.from('activity_types').delete().in('id', ids.activityTypes), 'clear activity types');

await requireSuccess(admin.from('team_members').insert([
  { id: ids.members[0], full_name: 'DEV Avery Morgan', initials: 'DA', email: 'avery@example.test' },
  { id: ids.members[1], full_name: 'DEV Jordan Lee', initials: 'DJ', email: 'jordan@example.test' },
  { id: ids.members[2], full_name: 'DEV Riley Chen', initials: 'DR', email: 'riley@example.test' },
]), 'seed members');
await requireSuccess(admin.from('project_types').insert([
  { id: ids.projectTypes[0], name: 'DEV Event' }, { id: ids.projectTypes[1], name: 'DEV Campaign' },
]), 'seed project types');
await requireSuccess(admin.from('activity_types').insert([
  { id: ids.activityTypes[0], name: 'DEV Planning' }, { id: ids.activityTypes[1], name: 'DEV Production' }, { id: ids.activityTypes[2], name: 'DEV Communications' },
]), 'seed activity types');
await requireSuccess(admin.from('projects').insert([
  { id: ids.projects[0], name: 'DEV Gala', description: 'Disposable browser fixture.', project_type_id: ids.projectTypes[0], status: 'on_track', start_date: addDays(-10), end_date: addDays(30), created_by: user.id },
  { id: ids.projects[1], name: 'DEV Fall Campaign', description: 'Future fixture.', project_type_id: ids.projectTypes[1], status: 'draft', start_date: addDays(20), end_date: addDays(60), created_by: user.id },
  { id: ids.projects[2], name: 'DEV Completed Dinner', description: 'Completed fixture.', project_type_id: ids.projectTypes[0], status: 'completed', start_date: addDays(-60), end_date: addDays(-30), created_by: user.id },
]), 'seed projects');
await requireSuccess(admin.from('project_owners').insert([
  { project_id: ids.projects[0], team_member_id: ids.members[0] }, { project_id: ids.projects[0], team_member_id: ids.members[1] }, { project_id: ids.projects[1], team_member_id: ids.members[2] },
]), 'seed project owners');
await requireSuccess(admin.from('activities').insert([
  { id: ids.activities[0], project_id: ids.projects[0], activity_type_id: ids.activityTypes[0], name: 'DEV Confirm gala brief', status: 'completed', priority: 'normal', start_date: addDays(-10), due_date: addDays(-8), notes: 'Completed prerequisite.', allow_outside_project: false, project_timing_rule: null, project_timing_boundary: null, project_timing_offset_days: null, created_by: user.id },
  { id: ids.activities[1], project_id: ids.projects[0], activity_type_id: ids.activityTypes[0], name: 'DEV Finalize guest requirements', status: 'in_progress', priority: 'high', start_date: addDays(-7), due_date: addDays(2), notes: 'Active owned fixture.', allow_outside_project: false, project_timing_rule: null, project_timing_boundary: null, project_timing_offset_days: null, created_by: user.id },
  { id: ids.activities[2], project_id: ids.projects[0], activity_type_id: ids.activityTypes[1], name: 'DEV Produce gala materials', status: 'not_started', priority: 'normal', start_date: addDays(2), due_date: addDays(10), notes: '', allow_outside_project: false, project_timing_rule: null, project_timing_boundary: null, project_timing_offset_days: null, created_by: user.id },
  { id: ids.activities[3], project_id: ids.projects[0], activity_type_id: ids.activityTypes[2], name: 'DEV Resolve overdue invitation list', status: 'blocked', priority: 'urgent', start_date: addDays(-5), due_date: addDays(-1), notes: '', allow_outside_project: false, project_timing_rule: null, project_timing_boundary: null, project_timing_offset_days: null, created_by: user.id },
  { id: ids.activities[4], project_id: ids.projects[0], activity_type_id: ids.activityTypes[2], name: 'DEV Send post-event follow-up', status: 'not_started', priority: 'normal', start_date: addDays(29), due_date: addDays(35), notes: '', allow_outside_project: true, project_timing_rule: 'post_project_deadline', project_timing_boundary: 'end', project_timing_offset_days: 7, created_by: user.id },
]), 'seed activities');
await requireSuccess(admin.from('activity_owners').insert([
  { activity_id: ids.activities[0], team_member_id: ids.members[0] }, { activity_id: ids.activities[1], team_member_id: ids.members[0] }, { activity_id: ids.activities[1], team_member_id: ids.members[1] }, { activity_id: ids.activities[2], team_member_id: ids.members[2] }, { activity_id: ids.activities[4], team_member_id: ids.members[1] },
]), 'seed activity owners');
await requireSuccess(admin.from('activity_links').insert({ id: '76000000-0000-0000-0000-000000000001', activity_id: ids.activities[1], label: 'DEV brief', url: 'https://example.com/dev-brief', sort_order: 0 }), 'seed links');
await requireSuccess(admin.from('activity_dependencies').insert([
  { id: '77000000-0000-0000-0000-000000000001', activity_id: ids.activities[1], depends_on_activity_id: ids.activities[0], constraint_type: 'finish_to_start', offset_days: 0 },
  { id: '77000000-0000-0000-0000-000000000002', activity_id: ids.activities[2], depends_on_activity_id: ids.activities[1], constraint_type: 'finish_to_start', offset_days: 0 },
]), 'seed dependencies');

const result = spawnSync('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    THRESHOLD_DEV_E2E_EMAIL: email,
    THRESHOLD_DEV_E2E_PASSWORD: password,
    THRESHOLD_E2E_LOCAL: '1',
    THRESHOLD_E2E_MUTATIONS: '1',
  },
});
process.exit(result.status ?? 1);
