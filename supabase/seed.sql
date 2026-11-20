insert into public.hospitals (id, name, address, latitude, longitude, available_beds, has_emergency_service)
values
  ('10000000-0000-4000-8000-000000000001', 'Hospital Japonés', 'Santa Cruz de la Sierra', -17.7731436, -63.1550478, 12, true),
  ('10000000-0000-4000-8000-000000000002', 'Hospital Universitario Hernández Vera', 'Santa Cruz de la Sierra', -17.7978423, -63.1352013, 8, true),
  ('10000000-0000-4000-8000-000000000003', 'Hospital San Juan de Dios', 'Santa Cruz de la Sierra', -17.779274, -63.1863553, 5, true),
  ('10000000-0000-4000-8000-000000000004', 'Hospital Municipal Pampa de la Isla', 'Santa Cruz de la Sierra', -17.7590925, -63.1084301, 7, true),
  ('10000000-0000-4000-8000-000000000005', 'Hospital Municipal Francés', 'Santa Cruz de la Sierra', -17.8551372, -63.1896206, 9, true),
  ('10000000-0000-4000-8000-000000000006', 'Hospital de Niños Mario Ortiz', 'Santa Cruz de la Sierra', -17.7809723, -63.1863038, 3, true),
  ('10000000-0000-4000-8000-000000000007', 'Maternidad Percy Boland', 'Santa Cruz de la Sierra', -17.7781027, -63.1875549, 3, true),
  ('10000000-0000-4000-8000-000000000008', 'Hospital Municipal Plan 3000', 'Santa Cruz de la Sierra', -17.8387857, -63.1101281, 3, true),
  ('10000000-0000-4000-8000-000000000009', 'Hospital Municipal Villa Primero de Mayo', 'Santa Cruz de la Sierra', -17.7996139, -63.1180817, 3, true),
  ('10000000-0000-4000-8000-000000000010', 'Hospital Municipal Bajío del Oriente', 'Santa Cruz de la Sierra', -17.8317064, -63.2101721, 3, true),
  ('10000000-0000-4000-8000-000000000011', 'Instituto Oncológico del Oriente Boliviano', 'Santa Cruz de la Sierra', -17.7628496, -63.1942782, 0, false),
  ('10000000-0000-4000-8000-000000000012', 'Hospital Privado Jasmin Medical', 'Santa Cruz de la Sierra', -17.8153248, -63.1785087, 3, true),
  ('10000000-0000-4000-8000-000000000013', 'Clínica Médica Solidaria', 'Santa Cruz de la Sierra', -17.8475906, -63.0903889, 3, true),
  ('10000000-0000-4000-8000-000000000014', 'Clínica Médica Señor de los Milagros', 'Santa Cruz de la Sierra', -17.8334687, -63.1139752, 3, true),
  ('10000000-0000-4000-8000-000000000015', 'Clínica IRCA', 'Santa Cruz de la Sierra', -17.8364591, -63.2364949, 3, true),
  ('10000000-0000-4000-8000-000000000016', 'Clínica Médica Andrea', 'Santa Cruz de la Sierra', -17.825324, -63.2283456, 3, true),
  ('10000000-0000-4000-8000-000000000017', 'Clínica Medicmel', 'Santa Cruz de la Sierra', -17.8493661, -63.251141, 3, true),
  ('10000000-0000-4000-8000-000000000018', 'Clínica San Martín de Porres', 'Santa Cruz de la Sierra', -17.8253082, -63.2015919, 3, true),
  ('10000000-0000-4000-8000-000000000019', 'Clínica San Prudencio', 'Santa Cruz de la Sierra', -17.8277849, -63.2262725, 3, true),
  ('10000000-0000-4000-8000-000000000020', 'Clínica Santa Fe', 'Santa Cruz de la Sierra', -17.7931943, -63.1504263, 3, true),
  ('10000000-0000-4000-8000-000000000021', 'Hospital Católico', 'Santa Cruz de la Sierra', -17.7362258, -63.1614352, 3, true),
  ('10000000-0000-4000-8000-000000000022', 'Clínica SINEC', 'Santa Cruz de la Sierra', -17.7388737, -63.146806, 3, true),
  ('10000000-0000-4000-8000-000000000023', 'Clínica Universitaria UCEBOL', 'Santa Cruz de la Sierra', -17.7314345, -63.1695217, 3, true),
  ('10000000-0000-4000-8000-000000000024', 'Clínica Vida y Esperanza', 'Santa Cruz de la Sierra', -17.7435263, -63.1499226, 3, true),
  ('10000000-0000-4000-8000-000000000025', 'Clínica Buena Salud', 'Santa Cruz de la Sierra', -17.7708682, -63.1249356, 3, true)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  available_beds = excluded.available_beds,
  has_emergency_service = excluded.has_emergency_service;

insert into public.ambulances (id, code, latitude, longitude, status, capacity, current_hospital_id, base_fare, fare_per_km)
values
  ('20000000-0000-4000-8000-000000000001', 'AMB-SC-01', -17.7731436, -63.1550478, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000001', 80, 8),
  ('20000000-0000-4000-8000-000000000002', 'AMB-SC-02', -17.7978423, -63.1352013, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000002', 95, 7),
  ('20000000-0000-4000-8000-000000000003', 'AMB-SC-03', -17.779274, -63.1863553, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000003', 65, 6),
  ('20000000-0000-4000-8000-000000000004', 'AMB-SC-04', -17.7590925, -63.1084301, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000004', 75, 9),
  ('20000000-0000-4000-8000-000000000005', 'AMB-SC-05', -17.8551372, -63.1896206, 'AVAILABLE', 1, '10000000-0000-4000-8000-000000000005', 100, 5)
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
