begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users(id,email,raw_user_meta_data) values ('51000000-0000-0000-0000-000000000001','template-test@example.com','{"full_name":"Template Test"}'::jsonb);
insert into public.project_types(id,name) values ('52000000-0000-0000-0000-000000000001','Template Project Type');
insert into public.activity_types(id,name) values ('53000000-0000-0000-0000-000000000001','Template Activity Type');
set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);

select is(public.save_project_template('{"id":"54000000-0000-0000-0000-000000000001","name":"Private Dinner","project_type_id":"52000000-0000-0000-0000-000000000001"}'::jsonb),'54000000-0000-0000-0000-000000000001'::uuid,'authenticated user creates a template');
select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000001","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Menu lock","duration_days":3,"sort_order":0,"rules":[{"schedule_rule":"finish_before_project_end","offset_days":5,"sort_order":0}]}'::jsonb)$$,'project-end activity saves');
select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000002","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Staff training","duration_days":2,"sort_order":1,"rules":[{"schedule_rule":"finish_before_project_end","offset_days":4,"sort_order":0},{"schedule_rule":"start_after_activity_finish","offset_days":0,"relative_activity_id":"55000000-0000-0000-0000-000000000001","sort_order":1}]}'::jsonb)$$,'multiple-rule activity saves');

select is((select duration_days from public.project_template_activities where id='55000000-0000-0000-0000-000000000001'),3,'positive inclusive duration is stored');
select is((select count(*)::integer from public.project_template_activity_rules where template_activity_id='55000000-0000-0000-0000-000000000002'),2,'all schedule rules are stored');
select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')#>>'{activities,0,start_date}','2026-09-03','inclusive duration extends backward');
select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')#>>'{activities,1,due_date}','2026-09-06','latest valid schedule uses the project bound');
select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')->>'project_start_date','2026-09-03','preview derives project start');

create temporary table generated_project as select public.create_project_from_template('54000000-0000-0000-0000-000000000001','Dinner on the Lawn','2026-09-10') id;
select is((select status::text||'|'||start_date::text||'|'||end_date::text from public.projects where id=(select id from generated_project)),'draft|2026-09-03|2026-09-10','materialization creates the Draft project window');
select is((select count(*)::integer from public.activities where project_id=(select id from generated_project) and status='not_started' and priority='normal' and notes=''),2,'materialization creates clean activities');
select is((select count(*)::integer from public.activity_dependencies d join public.activities a on a.id=d.activity_id where a.project_id=(select id from generated_project) and d.constraint_type='finish_to_start'),1,'materialization creates the dependency');
select is((select count(*)::integer from public.activities where project_id=(select id from generated_project) and project_timing_rule='advance_deadline'),2,'materialization creates project timing rules');
select is((select count(*)::integer from public.project_owners where project_id=(select id from generated_project))+(select count(*)::integer from public.activity_owners o join public.activities a on a.id=o.activity_id where a.project_id=(select id from generated_project)),0,'materialization does not assign team members');

select throws_ok($$select public.save_project_template_activity('{"template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Invalid","duration_days":0,"rules":[]}'::jsonb)$$,'P0001','Duration must be at least one day.','zero duration is rejected');
select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000003","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Needs setup","duration_days":1,"rules":[]}'::jsonb)$$,'an incomplete activity remains editable');
select throws_ok($$select public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')$$,'P0001','“Needs setup” does not trace to a project-end rule.','disconnected activities cannot preview');
select throws_ok($$insert into public.project_templates(name,project_type_id) values('Bypass','52000000-0000-0000-0000-000000000001')$$,'42501',null,'authenticated direct template writes are denied');

select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000002","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Staff training","duration_days":2,"sort_order":1,"rules":[{"schedule_rule":"finish_before_project_end","offset_days":4,"sort_order":0},{"schedule_rule":"start_after_activity_finish","offset_days":0,"relative_activity_id":"55000000-0000-0000-0000-000000000001","sort_order":1},{"schedule_rule":"start_after_activity_finish","offset_days":0,"relative_activity_id":"55000000-0000-0000-0000-000000000003","sort_order":2}]}'::jsonb)$$,'an anchored dependent may reference an activity with no rule');
select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')#>>'{activities,1,due_date}','2026-09-05','incoming relationship derives the unruled prerequisite dates');

select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000003","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Contradictory","duration_days":1,"rules":[{"schedule_rule":"finish_before_project_end","offset_days":0},{"schedule_rule":"finish_after_project_end","offset_days":1}]}'::jsonb)$$,'multiple project rules can be staged');
select throws_ok($$select public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')$$,'P0001','“Contradictory” has schedule rules that cannot coexist.','contradictory rules prevent preview');
select throws_ok($$select public.create_project_from_template('54000000-0000-0000-0000-000000000001','Invalid dinner','2026-09-10')$$,'P0001','“Contradictory” has schedule rules that cannot coexist.','contradictory rules prevent materialization');
select is((select count(*)::integer from public.projects),1,'failed materialization creates no partial project');
select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000001","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Menu lock","duration_days":3,"rules":[{"schedule_rule":"start_after_activity_finish","offset_days":0,"relative_activity_id":"55000000-0000-0000-0000-000000000002"}]}'::jsonb)$$,'first side of a cycle can be staged');
select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000002","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Staff training","duration_days":2,"rules":[{"schedule_rule":"finish_after_activity_finish","offset_days":0,"relative_activity_id":"55000000-0000-0000-0000-000000000001"}]}'::jsonb)$$,'second side of a cycle can remain editable');
select throws_ok($$select public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')$$,'P0001','The schedule contains a cycle.','cycles prevent preview');

reset role;
select * from finish();
rollback;
