create table if not exists public.campus_service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_type text not null,
  description text,
  department text,
  keywords text[] not null default '{}',
  requirements text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campus_service_catalog_active_idx on public.campus_service_catalog(active);
create index if not exists campus_service_catalog_type_idx on public.campus_service_catalog(service_type);

alter table public.campus_service_catalog enable row level security;

drop policy if exists "Anyone can read active campus services" on public.campus_service_catalog;
create policy "Anyone can read active campus services"
on public.campus_service_catalog for select
using (active = true or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins manage campus services" on public.campus_service_catalog;
create policy "Admins manage campus services"
on public.campus_service_catalog for all
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

drop trigger if exists campus_service_catalog_updated_at on public.campus_service_catalog;
create trigger campus_service_catalog_updated_at
before update on public.campus_service_catalog
for each row execute function public.update_updated_at_column();

insert into public.campus_service_catalog (name, service_type, description, department, keywords, requirements)
select 'Bonafide Certificate', 'bonafide', 'Request an official bonafide certificate.', 'Academic Office', array['bonafide','bona fide','certificate'], array['Purpose']
where not exists (select 1 from public.campus_service_catalog where service_type = 'bonafide');

insert into public.campus_service_catalog (name, service_type, description, department, keywords, requirements)
select 'Student Support', 'support', 'Raise an issue or request help from the college team.', 'Student Support', array['support','help','complaint','issue','problem'], array['Issue description']
where not exists (select 1 from public.campus_service_catalog where service_type = 'support');