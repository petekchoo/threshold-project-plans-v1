begin;

select plan(12);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ),
  'anonymous users have no public table grants'
);

select ok(
  (select bool_and(has_table_privilege('authenticated', format('public.%I', name), 'select'))
   from unnest(array[
     'profiles', 'team_members', 'project_types', 'activity_types', 'projects',
     'project_owners', 'activities', 'activity_owners', 'activity_links',
     'activity_dependencies', 'project_templates', 'project_template_activities',
     'project_template_activity_rules'
   ]) as tables(name)),
  'authenticated users can read every application table'
);

select ok(
  (select bool_and(has_table_privilege('authenticated', format('public.%I', name), 'insert,update,delete'))
   from unnest(array['profiles', 'team_members', 'project_types', 'activity_types']) as tables(name)),
  'authenticated users can manage profile and reference tables'
);

select ok(
  (select bool_and(not has_table_privilege('authenticated', format('public.%I', name), 'insert,update,delete'))
   from unnest(array[
     'projects', 'project_owners', 'activities', 'activity_owners', 'activity_links',
     'activity_dependencies', 'project_templates', 'project_template_activities',
     'project_template_activity_rules'
   ]) as tables(name)),
  'authenticated direct writes stay blocked on aggregate-managed tables'
);

select ok(
  (select bool_and(has_table_privilege('service_role', format('public.%I', name), 'select,insert,update,delete'))
   from unnest(array[
     'profiles', 'team_members', 'project_types', 'activity_types', 'projects',
     'project_owners', 'activities', 'activity_owners', 'activity_links',
     'activity_dependencies', 'project_templates', 'project_template_activities',
     'project_template_activity_rules'
   ]) as tables(name)),
  'service role retains administrative table access'
);

select ok(
  (select bool_and(has_function_privilege('authenticated', signature, 'execute'))
   from unnest(array[
     'public.save_project(jsonb,uuid[])',
     'public.save_activity(jsonb,uuid[],jsonb,jsonb)',
     'public.archive_activity(uuid)',
     'public.archive_project(uuid)',
     'public.preview_project_reschedule(uuid,date,date)',
     'public.reschedule_project(jsonb,uuid[],text)',
     'public.save_project_template(jsonb)',
     'public.save_project_template_activity(jsonb)',
     'public.preview_project_template(uuid,date)',
     'public.create_project_from_template(uuid,text,date)',
     'public.archive_project_template(uuid)',
     'public.archive_project_template_activity(uuid)'
   ]) as functions(signature)),
  'authenticated users can execute only the application mutation and preview API'
);

select ok(
  not has_function_privilege('authenticated', 'public.set_updated_at()', 'execute')
  and not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
  and not has_function_privilege('authenticated', 'public.validate_project_schedule(uuid)', 'execute'),
  'authenticated users cannot execute internal helper functions'
);

select ok(
  not has_function_privilege('anon', 'public.save_project(jsonb,uuid[])', 'execute')
  and not has_function_privilege('anon', 'public.set_updated_at()', 'execute'),
  'anonymous users cannot execute public application or helper functions'
);

select ok(
  has_function_privilege('service_role', 'public.save_project(jsonb,uuid[])', 'execute')
  and has_function_privilege('service_role', 'public.set_updated_at()', 'execute'),
  'service role retains administrative function execution'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) x
    left join pg_namespace n on n.oid = d.defaclnamespace
    where d.defaclrole = 'postgres'::regrole
      and coalesce(n.nspname, 'public') = 'public'
      and d.defaclobjtype in ('r', 'S', 'f')
      and (x.grantee = 0 or pg_get_userbyid(x.grantee) in ('anon', 'authenticated', 'service_role'))
  ),
  'future public objects receive no automatic Data API grants'
);

select ok(
  (select bool_and(relrowsecurity)
   from pg_class
   where oid = any(array[
     'public.profiles'::regclass, 'public.team_members'::regclass,
     'public.project_types'::regclass, 'public.activity_types'::regclass,
     'public.projects'::regclass, 'public.project_owners'::regclass,
     'public.activities'::regclass, 'public.activity_owners'::regclass,
     'public.activity_links'::regclass, 'public.activity_dependencies'::regclass,
     'public.project_templates'::regclass, 'public.project_template_activities'::regclass,
     'public.project_template_activity_rules'::regclass
   ])),
  'row-level security remains enabled on every application table'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public'),
  13,
  'the existing row-level policy set remains intact'
);

select * from finish();
rollback;
