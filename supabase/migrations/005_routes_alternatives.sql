alter table public.routes
  add column if not exists alternatives jsonb not null default '[]'::jsonb;
