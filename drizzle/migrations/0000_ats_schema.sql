create type public.app_role as enum ('admin', 'customer');
create type public.candidate_stage as enum ('applied','screening','interview','offer','hired','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own role read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "jobs access" on public.jobs for all to authenticated
  using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  linkedin_url text,
  notes text,
  cv_text text,
  stage public.candidate_stage not null default 'applied',
  ai_score int,
  ai_summary text,
  ai_evaluated_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.candidates to authenticated;
grant all on public.candidates to service_role;
alter table public.candidates enable row level security;
create policy "candidates access" on public.candidates for all to authenticated
  using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.candidate_customer_matches_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.jobs j where j.id = new.job_id and j.customer_id = new.customer_id) then
    raise exception 'Candidate customer must match job customer';
  end if;
  return new;
end $$;
create trigger candidates_customer_check before insert or update of job_id, customer_id on public.candidates
  for each row execute function public.candidate_customer_matches_job();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where role = 'admin') $$;
grant execute on function public.admin_exists() to anon, authenticated;

create index on public.jobs(customer_id);
create index on public.candidates(job_id);
create index on public.candidates(customer_id);