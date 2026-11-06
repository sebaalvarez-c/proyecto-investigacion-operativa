-- Tarifas de demostración, expresadas en bolivianos; no son precios reales.
alter table public.ambulances
  add column if not exists base_fare numeric(10, 2) not null default 80 check (base_fare >= 0),
  add column if not exists fare_per_km numeric(10, 2) not null default 8 check (fare_per_km >= 0);
