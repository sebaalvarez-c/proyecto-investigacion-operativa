create extension if not exists pgcrypto;

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  available_beds integer not null default 0 check (available_beds >= 0),
  has_emergency_service boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ambulances (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'UNAVAILABLE')),
  capacity integer not null default 1 check (capacity > 0),
  current_hospital_id uuid references public.hospitals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emergencies (
  id uuid primary key default gen_random_uuid(),
  description text not null check (char_length(trim(description)) between 3 and 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status text not null default 'PENDING' check (status in ('PENDING', 'OPTIMIZING', 'DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'CANCELLED')),
  assigned_ambulance_id uuid references public.ambulances(id) on delete set null,
  assigned_hospital_id uuid references public.hospitals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.emergencies(id) on delete cascade,
  origin jsonb not null,
  destination jsonb not null,
  distance_meters integer not null check (distance_meters >= 0),
  estimated_minutes numeric(8, 2) not null check (estimated_minutes >= 0),
  has_blockage boolean not null default false,
  alternative_route jsonb,
  status text not null default 'PRIMARY' check (status in ('PRIMARY', 'ALTERNATIVE', 'COMPLETED')),
  created_at timestamptz not null default now()
);

create table public.transport_solutions (
  id uuid primary key default gen_random_uuid(),
  emergency_id uuid not null references public.emergencies(id) on delete cascade,
  method text not null check (method in ('MINIMUM_COST', 'VOGEL', 'MODI')),
  initial_matrix jsonb not null,
  final_assignment jsonb not null,
  total_cost_minutes numeric(8, 2) not null check (total_cost_minutes >= 0),
  created_at timestamptz not null default now()
);

create index ambulances_status_idx on public.ambulances(status);
create index hospitals_emergency_idx on public.hospitals(has_emergency_service, available_beds);
create index emergencies_status_idx on public.emergencies(status);
create index routes_emergency_idx on public.routes(emergency_id);
create index transport_solutions_emergency_idx on public.transport_solutions(emergency_id);
