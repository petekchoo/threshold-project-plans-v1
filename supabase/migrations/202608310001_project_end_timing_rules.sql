do $$
declare
  v_activity record;
begin
  for v_activity in
    select a.id, a.name, p.name as project_name
    from public.activities a
    join public.projects p on p.id = a.project_id
    where a.archived_at is null
      and a.project_timing_rule is not null
      and a.project_timing_boundary is distinct from 'end'
    order by p.name, a.name
  loop
    raise notice 'Normalizing active activity "%" (%) in project "%" to the project end boundary.', v_activity.name, v_activity.id, v_activity.project_name;
  end loop;
end;
$$;

update public.activities
set project_timing_boundary = 'end'
where project_timing_rule is not null
  and project_timing_boundary is distinct from 'end';

alter table public.activities
  drop constraint if exists activities_project_timing_complete,
  add constraint activities_project_timing_complete check (
    (project_timing_rule is null and project_timing_boundary is null and project_timing_offset_days is null)
    or (
      project_timing_rule in ('advance_deadline', 'post_project_deadline')
      and project_timing_boundary = 'end'
      and project_timing_offset_days >= 0
    )
  );

create or replace function public.validate_activity_project_timing() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_deadline date;
begin
  select * into v_project from public.projects where id = new.project_id;
  if new.start_date < v_project.start_date then
    raise exception 'Activity start date (%) is earlier than the project start date (%).', new.start_date, v_project.start_date;
  end if;
  if new.project_timing_rule is null then return new; end if;
  if new.project_timing_rule = 'advance_deadline' then
    v_deadline := v_project.end_date - new.project_timing_offset_days;
  else
    v_deadline := v_project.end_date + new.project_timing_offset_days;
  end if;
  if new.due_date > v_deadline then
    raise exception 'Activity finish date (%) is later than its project timing deadline (%).', new.due_date, v_deadline;
  end if;
  return new;
end;
$$;

create or replace function public.validate_project_activity_timing() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_activity public.activities%rowtype;
  v_deadline date;
begin
  if new.start_date = old.start_date and new.end_date = old.end_date then return new; end if;
  for v_activity in select * from public.activities where project_id = new.id and archived_at is null loop
    if v_activity.start_date < new.start_date then
      raise exception 'Project start date (%) is later than activity "%" start date (%).', new.start_date, v_activity.name, v_activity.start_date;
    end if;
    if v_activity.project_timing_rule is not null then
      if v_activity.project_timing_rule = 'advance_deadline' then
        v_deadline := new.end_date - v_activity.project_timing_offset_days;
      else
        v_deadline := new.end_date + v_activity.project_timing_offset_days;
      end if;
      if v_activity.due_date > v_deadline then
        raise exception 'Project date change places activity "%" after its project timing deadline (%).', v_activity.name, v_deadline;
      end if;
    end if;
  end loop;
  return new;
end;
$$;
