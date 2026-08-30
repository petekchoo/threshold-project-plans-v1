create extension if not exists pgcrypto;

create type public.project_status as enum ('draft','on_track','at_risk','blocked','completed');
create type public.activity_status as enum ('not_started','in_progress','blocked','completed');
create type public.activity_priority as enum ('low','normal','high','urgent');
create type public.dependency_type as enum ('finish_to_start','finish_to_finish');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', avatar_color text not null default '#b59352',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.team_members (
  id uuid primary key default gen_random_uuid(), full_name text not null, initials text not null,
  email text, active boolean not null default true, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.project_types (
  id uuid primary key default gen_random_uuid(), name text not null unique, color text not null default '#6d746f', archived_at timestamptz
);
create table public.activity_types (
  id uuid primary key default gen_random_uuid(), name text not null unique, color text not null default '#6d746f', archived_at timestamptz
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
  project_type_id uuid references public.project_types(id), status public.project_status not null default 'draft',
  start_date date not null, end_date date not null, archived_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint projects_date_order check (end_date >= start_date)
);
create table public.project_owners (
  project_id uuid references public.projects(id) on delete cascade, team_member_id uuid references public.team_members(id) on delete cascade,
  primary key (project_id, team_member_id)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  activity_type_id uuid references public.activity_types(id), name text not null, status public.activity_status not null default 'not_started',
  priority public.activity_priority not null default 'normal', start_date date not null, due_date date not null,
  notes text not null default '', allow_outside_project boolean not null default false, archived_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint activities_date_order check (due_date >= start_date)
);
create table public.activity_owners (
  activity_id uuid references public.activities(id) on delete cascade, team_member_id uuid references public.team_members(id) on delete cascade,
  primary key (activity_id, team_member_id)
);
create table public.activity_links (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.activities(id) on delete cascade,
  label text, url text not null, sort_order integer not null default 0, archived_at timestamptz
);
create table public.activity_dependencies (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.activities(id) on delete cascade,
  depends_on_activity_id uuid not null references public.activities(id) on delete cascade,
  constraint_type public.dependency_type not null default 'finish_to_start', archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dependency_not_self check (activity_id <> depends_on_activity_id), unique(activity_id, depends_on_activity_id)
);

create index projects_status_idx on public.projects(status) where archived_at is null;
create index activities_project_idx on public.activities(project_id) where archived_at is null;
create index activities_due_idx on public.activities(due_date) where archived_at is null;
create index dependencies_activity_idx on public.activity_dependencies(activity_id) where archived_at is null;
create index dependencies_source_idx on public.activity_dependencies(depends_on_activity_id) where archived_at is null;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger team_members_updated before update on public.team_members for each row execute function public.set_updated_at();
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();
create trigger activities_updated before update on public.activities for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1))) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.prevent_dependency_cycle() returns trigger language plpgsql as $$
begin
  if exists (
    with recursive chain(id) as (
      select new.depends_on_activity_id union
      select d.depends_on_activity_id from public.activity_dependencies d join chain c on d.activity_id=c.id where d.archived_at is null
    ) select 1 from chain where id=new.activity_id
  ) then raise exception 'This dependency would create a circular relationship.'; end if;
  return new;
end $$;
create trigger prevent_dependency_cycle before insert or update on public.activity_dependencies for each row execute function public.prevent_dependency_cycle();

alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.project_types enable row level security;
alter table public.activity_types enable row level security;
alter table public.projects enable row level security;
alter table public.project_owners enable row level security;
alter table public.activities enable row level security;
alter table public.activity_owners enable row level security;
alter table public.activity_links enable row level security;
alter table public.activity_dependencies enable row level security;
do $$ declare t text; begin foreach t in array array['profiles','team_members','project_types','activity_types','projects','project_owners','activities','activity_owners','activity_links','activity_dependencies'] loop
  execute format('create policy "authenticated shared access" on public.%I for all to authenticated using (true) with check (true)',t);
end loop; end $$;
