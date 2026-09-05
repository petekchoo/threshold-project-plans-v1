begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into public.team_members(id, full_name, initials)
values ('10000000-0000-0000-0000-000000000001', 'Test Owner', 'TO');

insert into public.projects(id, name, description, status, start_date, end_date)
values
  ('20000000-0000-0000-0000-000000000001', 'Whole Schedule', '', 'on_track', '2026-04-01', '2026-04-10'),
  ('20000000-0000-0000-0000-000000000002', 'Remaining Work', '', 'on_track', '2026-04-01', '2026-04-10'),
  ('20000000-0000-0000-0000-000000000003', 'External Project', '', 'on_track', '2026-04-01', '2026-04-30'),
  ('20000000-0000-0000-0000-000000000004', 'Completed Project', '', 'completed', '2026-04-01', '2026-04-10');

insert into public.activities(
  id, project_id, name, status, priority, start_date, due_date,
  allow_outside_project, project_timing_rule, project_timing_boundary,
  project_timing_offset_days
) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Plan menu', 'not_started', 'normal', '2026-04-02', '2026-04-04', false, null, null, null),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Order food', 'not_started', 'normal', '2026-04-06', '2026-04-09', false, null, null, null),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Completed setup', 'completed', 'normal', '2026-04-02', '2026-04-03', false, null, null, null),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Remaining setup', 'not_started', 'normal', '2026-04-06', '2026-04-08', false, null, null, null),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'External prerequisite', 'not_started', 'normal', '2026-04-01', '2026-04-12', false, null, null, null);

insert into public.activity_dependencies(id, activity_id, depends_on_activity_id, constraint_type)
values ('40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001', 'finish_to_start');

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

select is(
  public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000001', '2026-04-06', '2026-04-15'
  )->>'mode',
  'move_entire_schedule',
  'preview selects whole-schedule mode'
);

select is(
  (public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000001', '2026-04-06', '2026-04-15'
  )->>'end_delta_days')::integer,
  5,
  'preview derives the calendar-day end delta'
);

select is(
  public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000001', '2026-04-06', '2026-04-15'
  )#>>'{activity_changes,0,proposed_start_date}',
  '2026-04-07',
  'preview moves active activity dates without writing'
);

select is(
  (select start_date::text from public.activities where id = '30000000-0000-0000-0000-000000000001'),
  '2026-04-02',
  'preview is read-only'
);

select is(
  public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000002', '2026-04-01', '2026-04-15'
  )->>'mode',
  'reschedule_remaining_work',
  'completed work selects remaining-work mode'
);

select is(
  public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000002', '2026-04-01', '2026-04-15'
  )#>>'{activity_changes,0,disposition}',
  'preserved_completed',
  'completed activity dates remain fixed'
);

select ok(
  not (public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000002', '2026-04-02', '2026-04-15'
  )->>'can_confirm')::boolean,
  'remaining-work preview blocks a project-start change'
);

select ok(
  (public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000004', '2026-04-01', '2026-04-15'
  )->'conflicts') @> '[{"code":"PROJECT_COMPLETED"}]'::jsonb,
  'completed project requires a separate reopen'
);

select throws_ok(
  $$update public.projects set end_date = '2026-04-15' where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'authenticated direct project updates are denied'
);

select throws_ok(
  $$insert into public.project_owners(project_id, team_member_id) values (
    '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'authenticated direct project-owner writes are denied'
);

select throws_ok(
  $$insert into public.activity_dependencies(activity_id, depends_on_activity_id, constraint_type) values (
    '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'finish_to_start')$$,
  '42501', null,
  'authenticated direct dependency writes are denied'
);

select lives_ok(
  $$select public.save_project(
    '{"id":"20000000-0000-0000-0000-000000000001","name":"Whole Schedule Renamed","description":"Metadata only","status":"on_track","start_date":"2026-04-01","end_date":"2026-04-10"}'::jsonb,
    array['10000000-0000-0000-0000-000000000001']::uuid[]
  )$$,
  'authoritative project save permits metadata-only edits'
);

select throws_ok(
  $$select public.save_project(
    '{"id":"20000000-0000-0000-0000-000000000001","name":"Bypass","description":"","status":"on_track","start_date":"2026-04-01","end_date":"2026-04-15"}'::jsonb,
    '{}'::uuid[]
  )$$,
  'P0001', 'Project date changes require a reschedule preview.',
  'ordinary project save cannot bypass rescheduling'
);

create temporary table prj06_preview as
select public.preview_project_reschedule(
  '20000000-0000-0000-0000-000000000001', '2026-04-06', '2026-04-15'
) plan;

select lives_ok(
  $$select public.reschedule_project(
    '{"id":"20000000-0000-0000-0000-000000000001","name":"Whole Schedule Renamed","description":"Committed","status":"on_track","start_date":"2026-04-06","end_date":"2026-04-15"}'::jsonb,
    array['10000000-0000-0000-0000-000000000001']::uuid[],
    (select plan->>'schedule_fingerprint' from prj06_preview)
  )$$,
  'valid authoritative preview commits atomically'
);

select is(
  (select start_date::text || '|' || end_date::text from public.projects where id = '20000000-0000-0000-0000-000000000001'),
  '2026-04-06|2026-04-15',
  'commit writes the proposed project window'
);

select is(
  (select start_date::text || '|' || due_date::text from public.activities where id = '30000000-0000-0000-0000-000000000001'),
  '2026-04-07|2026-04-09',
  'commit writes exactly the proposed activity dates'
);

create temporary table prj06_stale as
select public.preview_project_reschedule(
  '20000000-0000-0000-0000-000000000002', '2026-04-01', '2026-04-16'
) plan;

reset role;
update public.activities set status = 'blocked'
where id = '30000000-0000-0000-0000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$select public.reschedule_project(
    '{"id":"20000000-0000-0000-0000-000000000002","name":"Remaining Work","description":"","status":"on_track","start_date":"2026-04-01","end_date":"2026-04-16"}'::jsonb,
    '{}'::uuid[],
    (select plan->>'schedule_fingerprint' from prj06_stale)
  )$$,
  'P0001', 'The project schedule changed after preview. Refresh and review the updated preview.',
  'stale preview is rejected after an activity change'
);

select is(
  (select end_date::text from public.projects where id = '20000000-0000-0000-0000-000000000002'),
  '2026-04-10',
  'stale rejection leaves the project unchanged'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok(
  $$select public.preview_project_reschedule(
    '20000000-0000-0000-0000-000000000001', '2026-04-06', '2026-04-15')$$,
  'P0001', 'Authentication is required.',
  'anonymous preview is denied'
);

reset role;
select * from finish();
rollback;
