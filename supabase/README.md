# Supabase

Las migraciones y los datos semilla del proyecto vivirán en este directorio.
El entorno de presentación utilizará el proyecto Supabase hospedado y sus
credenciales se configurarán fuera del repositorio mediante `.env`.

No se deben subir claves reales, archivos `.env` ni claves `service_role`.

## Aplicación

1. Ejecutar `migrations/001_initial_schema.sql`.
2. Ejecutar `migrations/002_rls_policies.sql`.
3. Ejecutar `seed.sql`.

La PWA utiliza una sesión autenticada para lecturas de demostración. Las
mutaciones de despacho y administración se reservan al backend con su secreto
de servidor. Las coordenadas y hospitales del seed son datos simulados para la
presentación académica.
