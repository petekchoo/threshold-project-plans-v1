-- Complete neutral quantified facts for authoritative post-project conflicts.

create or replace function public.complete_project_reschedule_plan(p_plan jsonb) returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select jsonb_set(
    p_plan,
    '{conflicts}',
    coalesce((
      select jsonb_agg(
        case when conflict->>'code' = 'POST_PROJECT_WINDOW_VIOLATION' then
          conflict || jsonb_build_object(
            'difference_days', case
              when (conflict#>>'{dates,activity_due}')::date <= (conflict#>>'{dates,project_end}')::date
                then (conflict#>>'{dates,project_end}')::date - (conflict#>>'{dates,activity_due}')::date
              else (conflict#>>'{dates,activity_due}')::date - (conflict#>>'{dates,deadline}')::date
            end
          )
        else conflict end
      )
      from jsonb_array_elements(coalesce(p_plan->'conflicts', '[]'::jsonb)) conflict
    ), '[]'::jsonb)
  );
$$;

create or replace function public.preview_project_reschedule(
  p_project_id uuid,
  p_new_start date,
  p_new_end date
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_new_start is null or p_new_end is null then raise exception 'Project start and end dates are required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('threshold_schedule_graph', 0));
  return public.complete_project_reschedule_plan(
    public.calculate_project_reschedule(p_project_id, p_new_start, p_new_end)
  );
end;
$$;

revoke execute on function public.complete_project_reschedule_plan(jsonb) from public, anon, authenticated;
revoke execute on function public.preview_project_reschedule(uuid, date, date) from public, anon;
grant execute on function public.preview_project_reschedule(uuid, date, date) to authenticated;
