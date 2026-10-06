# Ambulance Transport PWA

Prototipo académico de Investigación Operativa para simular el despacho de
ambulancias en Santa Cruz, Bolivia mediante el método de transporte.

## Estructura

- `frontend/`: PWA responsive en React y TypeScript.
- `backend/`: API y lógica de negocio en NestJS.
- `supabase/`: migraciones y datos semilla de PostgreSQL.
- `docs/`: arquitectura, método y planes del proyecto.

## Desarrollo

1. Copiar `.env.example` como `.env` y completar los valores reales fuera del
   repositorio.
2. Ejecutar `npm install --legacy-peer-deps`.
3. En una terminal ejecutar `npm --workspace backend run start:dev`.
4. En otra terminal ejecutar `npm --workspace frontend run dev`.

La PWA queda disponible en Vite y la API en `http://localhost:3000`.

## Supabase

1. Crear un proyecto Supabase propio.
2. Copiar las variables de `.env.example` sin subir sus valores.
3. Ejecutar en el SQL Editor, en orden, `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_rls_policies.sql` y `supabase/seed.sql`.
4. Revisar las políticas RLS y habilitar el método de autenticación de demostración.

Mientras no existan credenciales Supabase, el backend usa un adaptador en memoria
determinista para desarrollo y pruebas; esa configuración no es persistente.

## Pruebas y build

```bash
npm test --workspaces --if-present
npm --workspace backend run test:e2e
npm --workspace frontend run build
npm --workspace backend run build
```

## Presentación académica

Consulta [el ejemplo del método de transporte](docs/metodo-transporte/ejemplo.md)
y [el flujo de arquitectura](docs/arquitectura/flujo.md).

El proyecto es un prototipo académico y no reemplaza un servicio médico real
de emergencias.
