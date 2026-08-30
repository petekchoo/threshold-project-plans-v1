alter table public.activity_types
  drop constraint if exists activity_types_name_key;

create unique index if not exists activity_types_active_name_unique
  on public.activity_types (lower(name))
  where archived_at is null;

alter table public.project_types
  drop constraint if exists project_types_name_key;

create unique index if not exists project_types_active_name_unique
  on public.project_types (lower(name))
  where archived_at is null;
