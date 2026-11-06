insert into public.hospitals (id, name, address, latitude, longitude, available_beds, has_emergency_service)
values
  ('10000000-0000-4000-8000-000000000001', 'Hospital Japonés', 'Av. Japón, Santa Cruz de la Sierra', -17.7617, -63.1656, 12, true),
  ('10000000-0000-4000-8000-000000000002', 'Hospital Universitario Japonés', 'Av. Dr. Lucas Saucedo, Santa Cruz de la Sierra', -17.7748, -63.1821, 8, true),
  ('10000000-0000-4000-8000-000000000003', 'Hospital San Juan de Dios', 'Calle La Riva, Santa Cruz de la Sierra', -17.7898, -63.1812, 5, true),
  ('10000000-0000-4000-8000-000000000004', 'Hospital de la ciudad A', 'Santa Cruz de la Sierra (ubicación simulada)', -17.7864, -63.195, 7, true),
  ('10000000-0000-4000-8000-000000000005', 'Hospital de la ciudad B', 'Santa Cruz de la Sierra (ubicación simulada)', -17.795, -63.166, 9, true)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  available_beds = excluded.available_beds,
  has_emergency_service = excluded.has_emergency_service;

insert into public.ambulances (id, code, latitude, longitude, status, capacity, current_hospital_id, base_fare, fare_per_km)
values
  ('20000000-0000-4000-8000-000000000001', 'AMB-SC-01', -17.7617, -63.1656, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000001', 80, 8),
  ('20000000-0000-4000-8000-000000000002', 'AMB-SC-02', -17.7748, -63.1821, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000002', 95, 7),
  ('20000000-0000-4000-8000-000000000003', 'AMB-SC-03', -17.7898, -63.1812, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000003', 65, 6),
  ('20000000-0000-4000-8000-000000000004', 'AMB-SC-04', -17.7864, -63.1950, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000004', 75, 9),
  ('20000000-0000-4000-8000-000000000005', 'AMB-SC-05', -17.7950, -63.1660, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000005', 100, 5)
on conflict (id) do update set
  code = excluded.code,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status = excluded.status,
  capacity = excluded.capacity,
  current_hospital_id = excluded.current_hospital_id,
  base_fare = excluded.base_fare,
  fare_per_km = excluded.fare_per_km,
  updated_at = now();

insert into public.emergencies (id, description, latitude, longitude, status)
values
  ('30000000-0000-4000-8000-000000000001', 'Colisión simulada en Santa Cruz', -17.7804, -63.1745, 'PENDING')
on conflict (id) do update set
  description = excluded.description,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status = excluded.status,
  updated_at = now();

insert into public.routes (id, emergency_id, origin, destination, distance_meters, estimated_minutes, has_blockage, alternative_route, status)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   '{"latitude": -17.7730, "longitude": -63.1700}',
   '{"latitude": -17.7617, "longitude": -63.1656}',
   2400, 9.5, true,
   '{"distanceMeters": 3100, "estimatedMinutes": 11.0, "reason": "Bloqueo simulado en la ruta principal"}',
   'PRIMARY')
on conflict (id) do update set
  has_blockage = excluded.has_blockage,
  alternative_route = excluded.alternative_route,
  estimated_minutes = excluded.estimated_minutes;
