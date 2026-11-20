create table if not exists public.dispatch_events (
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.emergencies(id) on delete cascade,
  event_type text not null check (event_type in ('CREATED', 'OPTIONS_FOUND', 'ASSIGNED', 'ARRIVED_AT_INCIDENT', 'TRANSFER_STARTED', 'ARRIVED_AT_HOSPITAL', 'CANCELLED')),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists dispatch_events_emergency_idx
  on public.dispatch_events(emergency_id, occurred_at);

alter table public.dispatch_events enable row level security;

create policy "authenticated users can view dispatch events"
  on public.dispatch_events for select to authenticated using (true);

-- Inserts remain backend-only so clients cannot forge the operational history.
