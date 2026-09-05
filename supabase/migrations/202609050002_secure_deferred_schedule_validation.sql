-- PRJ-06 Slice 2.1: deferred constraint triggers fire after security-definer
-- RPCs return, so the trigger must retain access to the private validator.

create or replace function public.enforce_project_schedule() returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := to_jsonb(old);
  v_project_id uuid;
  v_old_project_id uuid;
begin
  if tg_table_name = 'projects' then
    v_project_id := coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  else
    v_project_id := coalesce((v_new->>'project_id')::uuid, (v_old->>'project_id')::uuid);
    v_old_project_id := (v_old->>'project_id')::uuid;
  end if;
  perform public.validate_project_schedule(v_project_id);
  if tg_table_name = 'activities'
    and v_old_project_id is distinct from (v_new->>'project_id')::uuid then
    perform public.validate_project_schedule(v_old_project_id);
  end if;
  return null;
end;
$$;

revoke execute on function public.enforce_project_schedule() from public, anon, authenticated;
