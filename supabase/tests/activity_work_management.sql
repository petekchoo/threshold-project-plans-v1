begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

insert into auth.users(id, email, raw_user_meta_data)
values
  ('61000000-0000-0000-0000-000000000001', 'activity-test-one@example.com', '{"full_name":"Activity Test One"}'::jsonb),
  ('61000000-0000-0000-0000-000000000002', 'activity-test-two@example.com', '{"full_name":"Activity Test Two"}'::jsonb);

insert into public.team_members(id, full_name, initials)
values ('62000000-0000-0000-0000-000000000001', 'Database Test Owner', 'DT');

insert into public.project_types(id, name)
values ('63000000-0000-0000-0000-000000000001', 'Database Test Project Type');

insert into public.activity_types(id, name)
values ('64000000-0000-0000-0000-000000000001', 'Database Test Activity Type');

insert into public.projects(id, name, description, project_type_id, status, start_date, end_date, created_by)
values
  ('65000000-0000-0000-0000-000000000001', 'Activity Save Project', '', '63000000-0000-0000-0000-000000000001', 'on_track', '2026-04-01', '2026-04-20', '61000000-0000-0000-0000-000000000001'),
  ('65000000-0000-0000-0000-000000000002', 'Archive Project', '', '63000000-0000-0000-0000-000000000001', 'on_track', '2026-05-01', '2026-05-20', '61000000-0000-0000-0000-000000000001');

insert into public.activities(
  id, project_id, activity_type_id, name, status, priority, start_date, due_date, notes,
  allow_outside_project, created_by
) values
  ('66000000-0000-0000-0000-000000000001', '65000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', 'Prerequisite', 'not_started', 'normal', '2026-04-05', '2026-04-10', '', false, '61000000-0000-0000-0000-000000000001'),
  ('66000000-0000-0000-0000-000000000002', '65000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', 'Archive Target', 'not_started', 'normal', '2026-04-11', '2026-04-12', '', false, '61000000-0000-0000-0000-000000000001'),
  ('66000000-0000-0000-0000-000000000003', '65000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', 'Archive Dependent', 'not_started', 'normal', '2026-04-12', '2026-04-13', '', false, '61000000-0000-0000-0000-000000000001'),
  ('66000000-0000-0000-0000-000000000004', '65000000-0000-0000-0000-000000000002', '64000000-0000-0000-0000-000000000001', 'Project Archive Activity', 'not_started', 'normal', '2026-05-02', '2026-05-05', '', false, '61000000-0000-0000-0000-000000000001'),
  ('66000000-0000-0000-0000-000000000010', '65000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', 'Activity to update', 'not_started', 'normal', '2026-04-10', '2026-04-15', '', false, '61000000-0000-0000-0000-000000000001'),
  ('66000000-0000-0000-0000-000000000011', '65000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', 'Fixed downstream activity', 'not_started', 'normal', '2026-04-16', '2026-04-18', '', false, '61000000-0000-0000-0000-000000000001');

insert into public.activity_links(id, activity_id, label, url)
values
  ('67000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000002', 'Archive target link', 'https://example.com/archive-target'),
  ('67000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000004', 'Project archive link', 'https://example.com/archive-project');

insert into public.activity_dependencies(id, activity_id, depends_on_activity_id, constraint_type)
values
  ('68000000-0000-0000-0000-000000000001', '66000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000001', 'finish_to_start'),
  ('68000000-0000-0000-0000-000000000002', '66000000-0000-0000-0000-000000000003', '66000000-0000-0000-0000-000000000002', 'finish_to_start'),
  ('68000000-0000-0000-0000-000000000003', '66000000-0000-0000-0000-000000000004', '66000000-0000-0000-0000-000000000003', 'finish_to_start'),
  ('68000000-0000-0000-0000-000000000004', '66000000-0000-0000-0000-000000000011', '66000000-0000-0000-0000-000000000010', 'finish_to_start');

set local role anon;
select throws_ok(
  $$select count(*) from public.projects$$,
  '42501', null,
  'anonymous users are denied at the project table permission boundary'
);
select throws_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Anonymous","status":"not_started","priority":"normal","start_date":"2026-04-01","due_date":"2026-04-01"}'::jsonb)$$,
  '42501', null,
  'anonymous users cannot call the authoritative activity save function'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000002', true);

select is((select count(*)::integer from public.projects), 2, 'every authenticated user can read shared project data');
select is((select count(*)::integer from public.activities), 6, 'every authenticated user can read shared activity data');

select throws_ok(
  $$insert into public.activities(project_id, name, status, priority, start_date, due_date) values ('65000000-0000-0000-0000-000000000001', 'Direct write', 'not_started', 'normal', '2026-04-01', '2026-04-01')$$,
  '42501', null,
  'authenticated direct activity inserts are denied'
);
select throws_ok(
  $$insert into public.activity_owners(activity_id, team_member_id) values ('66000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'authenticated direct activity-owner writes are denied'
);
select throws_ok(
  $$insert into public.activity_links(activity_id, url) values ('66000000-0000-0000-0000-000000000001', 'https://example.com/direct')$$,
  '42501', null,
  'authenticated direct activity-link writes are denied'
);
select throws_ok(
  $$insert into public.activity_dependencies(activity_id, depends_on_activity_id, constraint_type) values ('66000000-0000-0000-0000-000000000003', '66000000-0000-0000-0000-000000000001', 'finish_to_finish')$$,
  '42501', null,
  'authenticated direct dependency writes are denied'
);

select lives_ok(
  $$select public.save_activity(
    '{"id":"66000000-0000-0000-0000-000000000010","project_id":"65000000-0000-0000-0000-000000000001","activity_type_id":"64000000-0000-0000-0000-000000000001","name":"Saved activity","status":"in_progress","priority":"high","start_date":"2026-04-10","due_date":"2026-04-15","notes":"Saved atomically"}'::jsonb,
    array['62000000-0000-0000-0000-000000000001']::uuid[],
    '[{"label":"Runbook","url":"https://example.com/runbook","sort_order":0}]'::jsonb,
    '[{"depends_on_activity_id":"66000000-0000-0000-0000-000000000001","constraint_type":"finish_to_start"}]'::jsonb
  )$$,
  'authoritative activity save accepts a valid aggregate'
);
select is(
  (select name || '|' || status::text || '|' || priority::text || '|' || start_date::text || '|' || due_date::text || '|' || notes
   from public.activities where id = '66000000-0000-0000-0000-000000000010'),
  'Saved activity|in_progress|high|2026-04-10|2026-04-15|Saved atomically',
  'activity save persists the core activity fields'
);
select is((select count(*)::integer from public.activity_owners where activity_id = '66000000-0000-0000-0000-000000000010'), 1, 'activity save persists owners');
select is((select count(*)::integer from public.activity_links where activity_id = '66000000-0000-0000-0000-000000000010' and archived_at is null), 1, 'activity save persists active links');
select is((select count(*)::integer from public.activity_dependencies where activity_id = '66000000-0000-0000-0000-000000000010' and archived_at is null), 1, 'activity save persists active dependencies');

select throws_ok(
  $$select public.save_activity(
    '{"id":"66000000-0000-0000-0000-000000000010","project_id":"65000000-0000-0000-0000-000000000001","activity_type_id":"64000000-0000-0000-0000-000000000001","name":"Saved activity","status":"in_progress","priority":"high","start_date":"2026-04-12","due_date":"2026-04-17","notes":"Invalid incoming boundary"}'::jsonb,
    array['62000000-0000-0000-0000-000000000001']::uuid[],
    '[]'::jsonb,
    '[{"depends_on_activity_id":"66000000-0000-0000-0000-000000000001","constraint_type":"finish_to_start"}]'::jsonb
  )$$,
  'P0001', 'Activity "Fixed downstream activity" starts before prerequisite "Saved activity" finishes.',
  'authoritative save keeps an incoming dependent fixed and rejects the current activity conflict'
);
select is(
  (select due_date::text from public.activities where id = '66000000-0000-0000-0000-000000000010'),
  '2026-04-15',
  'incoming-boundary rejection rolls back the current activity edit'
);

select throws_ok(
  $$select public.save_activity(
    '{"id":"66000000-0000-0000-0000-000000000001","project_id":"65000000-0000-0000-0000-000000000001","activity_type_id":"64000000-0000-0000-0000-000000000001","name":"Prerequisite","status":"not_started","priority":"normal","start_date":"2026-04-05","due_date":"2026-04-10"}'::jsonb,
    '{}'::uuid[], '[]'::jsonb,
    '[{"depends_on_activity_id":"66000000-0000-0000-0000-000000000010","constraint_type":"finish_to_start"}]'::jsonb
  )$$,
  'P0001', 'This dependency would create a circular relationship.',
  'authoritative activity save rejects a dependency cycle'
);
select is((select count(*)::integer from public.activity_dependencies where activity_id = '66000000-0000-0000-0000-000000000001' and archived_at is null), 0, 'cycle rejection rolls back the aggregate edit');

select lives_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Advance deadline boundary","status":"not_started","priority":"normal","start_date":"2026-04-16","due_date":"2026-04-17","allow_outside_project":false,"project_timing_rule":"advance_deadline","project_timing_boundary":"end","project_timing_offset_days":3}'::jsonb)$$,
  'advance-deadline activity may finish on its inclusive deadline'
);
select throws_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Late advance deadline","status":"not_started","priority":"normal","start_date":"2026-04-16","due_date":"2026-04-18","allow_outside_project":false,"project_timing_rule":"advance_deadline","project_timing_boundary":"end","project_timing_offset_days":3}'::jsonb)$$,
  'P0001', 'Activity "Late advance deadline" finishes after its project timing deadline.',
  'advance-deadline activity cannot finish after its deadline'
);
select lives_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Post-project boundary","status":"not_started","priority":"normal","start_date":"2026-04-19","due_date":"2026-04-23","allow_outside_project":true,"project_timing_rule":"post_project_deadline","project_timing_boundary":"end","project_timing_offset_days":3}'::jsonb)$$,
  'post-project activity may finish on its inclusive deadline'
);
select throws_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Post-project lower bound","status":"not_started","priority":"normal","start_date":"2026-04-19","due_date":"2026-04-20","allow_outside_project":false,"project_timing_rule":"post_project_deadline","project_timing_boundary":"end","project_timing_offset_days":3}'::jsonb)$$,
  'P0001', 'Activity "Post-project lower bound" finishes outside its post-project timing window.',
  'post-project activity must finish after project end'
);
select throws_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Unauthorized outside finish","status":"not_started","priority":"normal","start_date":"2026-04-19","due_date":"2026-04-21","allow_outside_project":false}'::jsonb)$$,
  'P0001', 'Activity "Unauthorized outside finish" has an inconsistent project-date exception.',
  'activity cannot finish after project end without an exception'
);
select throws_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Unneeded exception","status":"not_started","priority":"normal","start_date":"2026-04-19","due_date":"2026-04-20","allow_outside_project":true}'::jsonb)$$,
  'P0001', 'Activity "Unneeded exception" has an inconsistent project-date exception.',
  'activity cannot store an exception when it finishes within project dates'
);
select throws_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Earlier activity","status":"not_started","priority":"normal","start_date":"2026-03-30","due_date":"2026-04-02","allow_outside_project":false}'::jsonb)$$,
  'P0001', 'Activity start date (2026-03-30) is earlier than the project start date (2026-04-01).',
  'activity cannot begin before project start without the atomic adjustment'
);
select lives_ok(
  $$select public.save_activity('{"project_id":"65000000-0000-0000-0000-000000000001","name":"Earlier activity","status":"not_started","priority":"normal","start_date":"2026-03-30","due_date":"2026-04-02","allow_outside_project":false,"adjust_project_start":true}'::jsonb)$$,
  'activity save may atomically move project start earlier'
);
select is((select start_date::text from public.projects where id = '65000000-0000-0000-0000-000000000001'), '2026-03-30', 'atomic activity save persists the earlier project start');

select throws_ok(
  $$select public.save_activity(
    '{"project_id":"65000000-0000-0000-0000-000000000001","name":"Invalid finish-to-start","status":"not_started","priority":"normal","start_date":"2026-04-09","due_date":"2026-04-12","allow_outside_project":false}'::jsonb,
    '{}'::uuid[], '[]'::jsonb,
    '[{"depends_on_activity_id":"66000000-0000-0000-0000-000000000001","constraint_type":"finish_to_start"}]'::jsonb
  )$$,
  'P0001', 'Activity "Invalid finish-to-start" starts before prerequisite "Prerequisite" finishes.',
  'finish-to-start chronology is enforced at the authoritative save boundary'
);
select throws_ok(
  $$select public.save_activity(
    '{"project_id":"65000000-0000-0000-0000-000000000001","name":"Invalid finish-to-finish","status":"not_started","priority":"normal","start_date":"2026-04-05","due_date":"2026-04-09","allow_outside_project":false}'::jsonb,
    '{}'::uuid[], '[]'::jsonb,
    '[{"depends_on_activity_id":"66000000-0000-0000-0000-000000000001","constraint_type":"finish_to_finish"}]'::jsonb
  )$$,
  'P0001', 'Activity "Invalid finish-to-finish" finishes before prerequisite "Prerequisite" finishes.',
  'finish-to-finish chronology is enforced at the authoritative save boundary'
);
select throws_ok(
  $$select public.save_activity(
    '{"project_id":"65000000-0000-0000-0000-000000000001","name":"Completed dependent","status":"completed","priority":"normal","start_date":"2026-04-10","due_date":"2026-04-12","allow_outside_project":false}'::jsonb,
    '{}'::uuid[], '[]'::jsonb,
    '[{"depends_on_activity_id":"66000000-0000-0000-0000-000000000001","constraint_type":"finish_to_start"}]'::jsonb
  )$$,
  'P0001', 'Completed activity "Completed dependent" has incomplete prerequisite "Prerequisite".',
  'completed dependents cannot retain incomplete prerequisites'
);

select lives_ok($$select public.archive_activity('66000000-0000-0000-0000-000000000002')$$, 'authenticated user can archive an activity');
select ok((select archived_at is not null from public.activities where id = '66000000-0000-0000-0000-000000000002'), 'activity archive retains and marks the activity');
select is((select count(*)::integer from public.activity_links where activity_id = '66000000-0000-0000-0000-000000000002' and archived_at is not null), 1, 'activity archive marks its links');
select is((select count(*)::integer from public.activity_dependencies where (activity_id = '66000000-0000-0000-0000-000000000002' or depends_on_activity_id = '66000000-0000-0000-0000-000000000002') and archived_at is not null), 2, 'activity archive marks incoming and outgoing dependencies');
select ok((select archived_at is null from public.activities where id = '66000000-0000-0000-0000-000000000003'), 'activity archive leaves downstream activities active');

select lives_ok($$select public.archive_project('65000000-0000-0000-0000-000000000002')$$, 'authenticated user can archive a project');
select ok((select archived_at is not null from public.projects where id = '65000000-0000-0000-0000-000000000002'), 'project archive retains and marks the project');
select is((select count(*)::integer from public.activities where project_id = '65000000-0000-0000-0000-000000000002' and archived_at is not null), 1, 'project archive marks its activities');
select is((select count(*)::integer from public.activity_links where activity_id = '66000000-0000-0000-0000-000000000004' and archived_at is not null), 1, 'project archive marks activity links');
select ok((select archived_at is not null from public.activity_dependencies where id = '68000000-0000-0000-0000-000000000003'), 'project archive marks cross-project dependencies');

reset role;
select * from finish();
rollback;
