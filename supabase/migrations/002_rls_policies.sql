alter table public.hospitals enable row level security;
alter table public.ambulances enable row level security;
alter table public.emergencies enable row level security;
alter table public.routes enable row level security;
alter table public.transport_solutions enable row level security;

create policy "authenticated users can view hospitals"
  on public.hospitals for select to authenticated using (true);

create policy "authenticated users can view ambulances"
  on public.ambulances for select to authenticated using (true);

create policy "authenticated users can create emergencies"
  on public.emergencies for insert to authenticated with check (true);

create policy "authenticated users can view emergencies"
  on public.emergencies for select to authenticated using (true);

create policy "authenticated users can view routes"
  on public.routes for select to authenticated using (true);

create policy "authenticated users can view transport solutions"
  on public.transport_solutions for select to authenticated using (true);

-- Dispatch mutations and seed administration are performed by the backend with
-- the server-side secret; it is never exposed to the browser.
