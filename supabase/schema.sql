create table if not exists public.reports (
  id text primary key,
  name text not null,
  site text default '',
  client text default '',
  author text default '',
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reports enable row level security;

create policy "reports_insert"
  on public.reports for insert
  to anon, authenticated
  with check (true);

create policy "reports_select"
  on public.reports for select
  to anon, authenticated
  using (true);

create policy "reports_update"
  on public.reports for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "reports_delete"
  on public.reports for delete
  to anon, authenticated
  using (true);

create storage bucket if not exists 'media' with (public = true);
