begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id,email,raw_user_meta_data)
values ('51000000-0000-0000-0000-000000000001','template-test@example.com','{"full_name":"Template Test"}'::jsonb);
insert into public.project_types(id,name) values ('52000000-0000-0000-0000-000000000001','Template Project Type');
insert into public.activity_types(id,name) values ('53000000-0000-0000-0000-000000000001','Template Activity Type');

set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);

select is(
  public.save_project_template('{"id":"54000000-0000-0000-0000-000000000001","name":"Private Dinner","project_type_id":"52000000-0000-0000-0000-000000000001"}'::jsonb),
  '54000000-0000-0000-0000-000000000001'::uuid,
  'authenticated user creates a template through the authoritative function'
);

select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000001","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Menu approval","schedule_rule":"finish_before_project_end","offset_days":7,"duration_days":3,"sort_order":0}'::jsonb)$$,'project-end activity saves');
select lives_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000002","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Print menus","schedule_rule":"start_after_activity_finish","offset_days":1,"duration_days":2,"relative_activity_id":"55000000-0000-0000-0000-000000000001","sort_order":1}'::jsonb)$$,'activity-relative activity saves');

select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')#>>'{activities,0,start_date}','2026-08-31','finish-based duration extends backward');
select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')#>>'{activities,1,due_date}','2026-09-06','start-based duration extends forward');
select is(public.preview_project_template('54000000-0000-0000-0000-000000000001','2026-09-10')->>'project_start_date','2026-08-31','preview derives project start from earliest activity');

create temporary table generated_project as
select public.create_project_from_template('54000000-0000-0000-0000-000000000001','Dinner on the Lawn','2026-09-10') id;

select is((select status::text||'|'||start_date::text||'|'||end_date::text from public.projects where id=(select id from generated_project)),'draft|2026-08-31|2026-09-10','materialization creates the derived Draft project window');
select is((select count(*)::integer from public.activities where project_id=(select id from generated_project) and status='not_started' and priority='normal' and notes=''),2,'materialization creates clean Not Started activities');
select is((select count(*)::integer from public.activity_dependencies dependency join public.activities activity on activity.id=dependency.activity_id where activity.project_id=(select id from generated_project) and dependency.constraint_type='finish_to_start'),1,'materialization creates the corresponding dependency');
select is((select count(*)::integer from public.project_owners where project_id=(select id from generated_project))+(select count(*)::integer from public.activity_owners owner join public.activities activity on activity.id=owner.activity_id where activity.project_id=(select id from generated_project)),0,'materialization does not assign team members');

select throws_ok($$insert into public.project_templates(name,project_type_id) values('Bypass','52000000-0000-0000-0000-000000000001')$$,'42501',null,'authenticated direct template writes are denied');
select throws_ok($$select public.save_project_template_activity('{"id":"55000000-0000-0000-0000-000000000001","template_id":"54000000-0000-0000-0000-000000000001","activity_type_id":"53000000-0000-0000-0000-000000000001","name":"Menu approval","schedule_rule":"start_after_activity_finish","offset_days":0,"duration_days":0,"relative_activity_id":"55000000-0000-0000-0000-000000000002","sort_order":0}'::jsonb)$$,'P0001','This rule would create a circular template schedule.','cycle creation is rejected');

reset role;
select * from finish();
rollback;
