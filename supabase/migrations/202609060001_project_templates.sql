create type public.template_schedule_rule as enum (
  'finish_before_project_end',
  'finish_after_project_end',
  'start_after_activity_finish',
  'finish_after_activity_finish'
);

create table public.project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  project_type_id uuid not null references public.project_types(id),
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_template_activities (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.project_templates(id) on delete cascade,
  activity_type_id uuid not null references public.activity_types(id),
  name text not null check (length(trim(name)) > 0),
  schedule_rule public.template_schedule_rule not null,
  offset_days integer not null check (offset_days >= 0),
  duration_days integer not null check (duration_days >= 0),
  relative_activity_id uuid references public.project_template_activities(id),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_activity_not_self check (id <> relative_activity_id),
  constraint template_activity_rule_shape check (
    (schedule_rule in ('finish_before_project_end', 'finish_after_project_end') and relative_activity_id is null)
    or
    (schedule_rule in ('start_after_activity_finish', 'finish_after_activity_finish') and relative_activity_id is not null)
  ),
  constraint template_activity_after_project_offset check (
    schedule_rule <> 'finish_after_project_end' or offset_days >= 1
  )
);

create index project_templates_name_idx on public.project_templates(lower(name)) where archived_at is null;
create index project_template_activities_template_idx on public.project_template_activities(template_id, sort_order) where archived_at is null;

create trigger project_templates_updated before update on public.project_templates
for each row execute function public.set_updated_at();
create trigger project_template_activities_updated before update on public.project_template_activities
for each row execute function public.set_updated_at();

create or replace function public.validate_template_activity_reference() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.relative_activity_id is not null then
    if not exists (
      select 1 from public.project_template_activities referenced
      where referenced.id = new.relative_activity_id
        and referenced.template_id = new.template_id
        and referenced.archived_at is null
    ) then
      raise exception 'The referenced activity must be an active activity in this template.';
    end if;
    if exists (
      with recursive chain(id) as (
        select new.relative_activity_id
        union
        select activity.relative_activity_id
        from public.project_template_activities activity
        join chain on activity.id = chain.id
        where activity.archived_at is null and activity.relative_activity_id is not null
      )
      select 1 from chain where id = new.id
    ) then
      raise exception 'This rule would create a circular template schedule.';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_template_activity_reference
before insert or update on public.project_template_activities
for each row execute function public.validate_template_activity_reference();

alter table public.project_templates enable row level security;
alter table public.project_template_activities enable row level security;
create policy "authenticated shared access" on public.project_templates for select to authenticated using (true);
create policy "authenticated shared access" on public.project_template_activities for select to authenticated using (true);

create or replace function public.save_project_template(p_template jsonb) returns uuid
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_id uuid; v_type_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_template->>'name'), '') is null then raise exception 'Template name is required.'; end if;
  v_type_id := nullif(p_template->>'project_type_id', '')::uuid;
  if not exists(select 1 from public.project_types where id = v_type_id and archived_at is null) then
    raise exception 'Choose an active project type.';
  end if;
  v_id := coalesce(nullif(p_template->>'id', '')::uuid, gen_random_uuid());
  insert into public.project_templates(id, name, project_type_id, created_by)
  values(v_id, trim(p_template->>'name'), v_type_id, auth.uid())
  on conflict(id) do update set name = excluded.name, project_type_id = excluded.project_type_id
  where project_templates.archived_at is null;
  if not found then raise exception 'Template not found.'; end if;
  return v_id;
end;
$$;

create or replace function public.save_project_template_activity(p_activity jsonb) returns uuid
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_id uuid; v_template_id uuid; v_type_id uuid; v_rule public.template_schedule_rule; v_reference uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_activity->>'name'), '') is null then raise exception 'Activity name is required.'; end if;
  v_template_id := (p_activity->>'template_id')::uuid;
  v_type_id := (p_activity->>'activity_type_id')::uuid;
  v_rule := (p_activity->>'schedule_rule')::public.template_schedule_rule;
  v_reference := nullif(p_activity->>'relative_activity_id', '')::uuid;
  if not exists(select 1 from public.project_templates where id = v_template_id and archived_at is null) then raise exception 'Template not found.'; end if;
  if not exists(select 1 from public.activity_types where id = v_type_id and archived_at is null) then raise exception 'Choose an active activity type.'; end if;
  v_id := coalesce(nullif(p_activity->>'id', '')::uuid, gen_random_uuid());
  insert into public.project_template_activities(
    id, template_id, activity_type_id, name, schedule_rule, offset_days, duration_days,
    relative_activity_id, sort_order
  ) values (
    v_id, v_template_id, v_type_id, trim(p_activity->>'name'), v_rule,
    (p_activity->>'offset_days')::integer, (p_activity->>'duration_days')::integer,
    v_reference, coalesce((p_activity->>'sort_order')::integer, 0)
  ) on conflict(id) do update set
    activity_type_id = excluded.activity_type_id, name = excluded.name,
    schedule_rule = excluded.schedule_rule, offset_days = excluded.offset_days,
    duration_days = excluded.duration_days, relative_activity_id = excluded.relative_activity_id,
    sort_order = excluded.sort_order
  where project_template_activities.template_id = excluded.template_id
    and project_template_activities.archived_at is null;
  if not found then raise exception 'Template activity not found.'; end if;
  return v_id;
end;
$$;

create or replace function public.preview_project_template(p_template_id uuid, p_project_end date) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_template public.project_templates%rowtype;
  v_activity public.project_template_activities%rowtype;
  v_reference_due date;
  v_start date;
  v_due date;
  v_earliest date := p_project_end;
  v_total integer;
  v_pass integer := 0;
  v_progress integer;
  v_resolved jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_project_end is null then raise exception 'Project end date is required.'; end if;
  select * into v_template from public.project_templates where id = p_template_id and archived_at is null;
  if not found then raise exception 'Template not found.'; end if;
  if not exists(select 1 from public.project_types where id = v_template.project_type_id and archived_at is null) then raise exception 'The template project type is unavailable.'; end if;
  select count(*) into v_total from public.project_template_activities where template_id = p_template_id and archived_at is null;
  if v_total = 0 then raise exception 'Add at least one activity before using this template.'; end if;

  while jsonb_array_length(v_resolved) < v_total loop
    v_progress := 0;
    for v_activity in
      select activity.* from public.project_template_activities activity
      join public.activity_types type on type.id = activity.activity_type_id and type.archived_at is null
      where activity.template_id = p_template_id and activity.archived_at is null
        and not exists(select 1 from jsonb_array_elements(v_resolved) item where item->>'template_activity_id' = activity.id::text)
      order by activity.sort_order, activity.created_at, activity.id
    loop
      v_reference_due := null;
      if v_activity.schedule_rule in ('start_after_activity_finish', 'finish_after_activity_finish') then
        select (item->>'due_date')::date into v_reference_due
        from jsonb_array_elements(v_resolved) item
        where item->>'template_activity_id' = v_activity.relative_activity_id::text;
        if v_reference_due is null then continue; end if;
      end if;

      if v_activity.schedule_rule = 'finish_before_project_end' then
        v_due := p_project_end - v_activity.offset_days;
        v_start := v_due - v_activity.duration_days;
      elsif v_activity.schedule_rule = 'finish_after_project_end' then
        v_due := p_project_end + v_activity.offset_days;
        v_start := v_due - v_activity.duration_days;
      elsif v_activity.schedule_rule = 'start_after_activity_finish' then
        v_start := v_reference_due + v_activity.offset_days;
        v_due := v_start + v_activity.duration_days;
      else
        v_due := v_reference_due + v_activity.offset_days;
        v_start := v_due - v_activity.duration_days;
      end if;
      v_earliest := least(v_earliest, v_start);
      v_resolved := v_resolved || jsonb_build_array(jsonb_build_object(
        'template_activity_id', v_activity.id, 'name', v_activity.name,
        'activity_type_id', v_activity.activity_type_id, 'schedule_rule', v_activity.schedule_rule,
        'offset_days', v_activity.offset_days, 'duration_days', v_activity.duration_days,
        'relative_activity_id', v_activity.relative_activity_id,
        'start_date', v_start, 'due_date', v_due, 'sort_order', v_activity.sort_order
      ));
      v_progress := v_progress + 1;
    end loop;
    v_pass := v_pass + 1;
    if v_progress = 0 or v_pass > v_total then
      raise exception 'Every template activity must have an acyclic reference chain that reaches project end.';
    end if;
  end loop;
  if jsonb_array_length(v_resolved) <> v_total then raise exception 'One or more template activities use an unavailable activity type.'; end if;
  return jsonb_build_object(
    'template_id', v_template.id, 'template_name', v_template.name,
    'project_type_id', v_template.project_type_id,
    'project_start_date', v_earliest, 'project_end_date', p_project_end,
    'activities', v_resolved
  );
end;
$$;

create or replace function public.create_project_from_template(
  p_template_id uuid, p_project_name text, p_project_end date
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_plan jsonb; v_project_id uuid := gen_random_uuid(); v_item jsonb; v_activity_id uuid; v_ids jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_project_name), '') is null then raise exception 'Project name is required.'; end if;
  v_plan := public.preview_project_template(p_template_id, p_project_end);
  insert into public.projects(id, name, description, project_type_id, status, start_date, end_date, created_by)
  values(v_project_id, trim(p_project_name), '', (v_plan->>'project_type_id')::uuid, 'draft',
    (v_plan->>'project_start_date')::date, p_project_end, auth.uid());

  for v_item in select value from jsonb_array_elements(v_plan->'activities') order by (value->>'sort_order')::integer loop
    v_activity_id := gen_random_uuid();
    v_ids := v_ids || jsonb_build_object(v_item->>'template_activity_id', v_activity_id);
    insert into public.activities(
      id, project_id, activity_type_id, name, status, priority, start_date, due_date, notes,
      allow_outside_project, project_timing_rule, project_timing_boundary, project_timing_offset_days, created_by
    ) values (
      v_activity_id, v_project_id, (v_item->>'activity_type_id')::uuid, v_item->>'name',
      'not_started', 'normal', (v_item->>'start_date')::date, (v_item->>'due_date')::date, '',
      (v_item->>'due_date')::date > p_project_end,
      case when v_item->>'schedule_rule' = 'finish_before_project_end' then 'advance_deadline'
           when v_item->>'schedule_rule' = 'finish_after_project_end' then 'post_project_deadline' end,
      case when v_item->>'schedule_rule' in ('finish_before_project_end', 'finish_after_project_end') then 'end' end,
      case when v_item->>'schedule_rule' in ('finish_before_project_end', 'finish_after_project_end') then (v_item->>'offset_days')::integer end,
      auth.uid()
    );
  end loop;

  for v_item in select value from jsonb_array_elements(v_plan->'activities') loop
    if v_item->>'relative_activity_id' is not null then
      insert into public.activity_dependencies(activity_id, depends_on_activity_id, constraint_type)
      values(
        (v_ids->>(v_item->>'template_activity_id'))::uuid,
        (v_ids->>(v_item->>'relative_activity_id'))::uuid,
        case when v_item->>'schedule_rule' = 'start_after_activity_finish'
          then 'finish_to_start'::public.dependency_type else 'finish_to_finish'::public.dependency_type end
      );
    end if;
  end loop;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project immediate;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project deferred;
  return v_project_id;
end;
$$;

create or replace function public.archive_project_template(p_template_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  update public.project_templates set archived_at = now() where id = p_template_id and archived_at is null;
  if not found then raise exception 'Template not found.'; end if;
  update public.project_template_activities set archived_at = now() where template_id = p_template_id and archived_at is null;
end;
$$;

create or replace function public.archive_project_template_activity(p_activity_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  update public.project_template_activities set archived_at = now() where id = p_activity_id and archived_at is null;
  if not found then raise exception 'Template activity not found.'; end if;
end;
$$;

revoke all on table public.project_templates from anon;
revoke all on table public.project_template_activities from anon;
revoke insert, update, delete on table public.project_templates from authenticated;
revoke insert, update, delete on table public.project_template_activities from authenticated;
revoke execute on function public.save_project_template(jsonb) from public, anon;
revoke execute on function public.save_project_template_activity(jsonb) from public, anon;
revoke execute on function public.preview_project_template(uuid, date) from public, anon;
revoke execute on function public.create_project_from_template(uuid, text, date) from public, anon;
revoke execute on function public.archive_project_template(uuid) from public, anon;
revoke execute on function public.archive_project_template_activity(uuid) from public, anon;
grant execute on function public.save_project_template(jsonb) to authenticated;
grant execute on function public.save_project_template_activity(jsonb) to authenticated;
grant execute on function public.preview_project_template(uuid, date) to authenticated;
grant execute on function public.create_project_from_template(uuid, text, date) to authenticated;
grant execute on function public.archive_project_template(uuid) to authenticated;
grant execute on function public.archive_project_template_activity(uuid) to authenticated;

