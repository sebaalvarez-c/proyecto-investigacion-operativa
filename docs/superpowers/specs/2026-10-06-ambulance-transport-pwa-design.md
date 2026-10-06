# Diseño de arquitectura: Ambulance Transport PWA

**Fecha:** 2026-10-06  
**Estado:** Diseño aprobado para especificación inicial  
**Contexto:** Proyecto académico de Investigación Operativa

## 1. Objetivo

Construir una aplicación web responsive tipo PWA que simule el despacho de ambulancias en Santa Cruz, Bolivia. La aplicación demostrará el método de transporte para asignar ambulancias a hospitales considerando tiempos estimados, disponibilidad y rutas alternativas.

El sistema es un prototipo académico y no reemplaza un servicio médico real de emergencias.

## 2. Alcance del MVP

El MVP permitirá:

- Registrar un accidente mediante una ubicación en el mapa.
- Consultar ambulancias simuladas disponibles.
- Consultar hospitales configurados en Santa Cruz.
- Construir una matriz de costos donde el costo representa minutos estimados.
- Ejecutar el método de costo mínimo y mostrar la solución obtenida.
- Asignar una ambulancia y un hospital al incidente.
- Solicitar y mostrar una ruta geográfica.
- Simular bloqueos y seleccionar una ruta alternativa.
- Animar el marcador de la ambulancia.
- Mostrar los estados del viaje hasta la llegada al hospital.

Quedan fuera del MVP los pagos, historial médico real, integración con centrales de emergencia, navegación para conductores y uso operativo en situaciones reales.

## 3. Arquitectura seleccionada

La solución será un monorepo con una PWA React, un backend NestJS, Supabase y Google Maps Platform.

```text
PWA React + TypeScript
        │
        ├── Supabase Auth
        ├── Supabase Realtime
        └── Supabase Data API
                │
                ▼
          PostgreSQL/Supabase
                ▲
                │
Backend NestJS ──┤
  ├── Método de transporte
  ├── Reglas de negocio
  ├── Rutas y alternativas
  └── Integraciones protegidas
```

Supabase será responsable de PostgreSQL, autenticación y eventos de tiempo real. El backend conservará la lógica del método de transporte, las validaciones y las operaciones que requieran secretos. Google Maps se utilizará para mapas, rutas, tiempos y visualización geográfica; no reemplazará el algoritmo de Investigación Operativa.

## 4. Módulos

### Frontend

- `emergency`: registro y estado del incidente.
- `ambulances`: listado, disponibilidad y marcador.
- `hospitals`: hospitales candidatos y disponibilidad.
- `transport-matrix`: matriz, oferta, demanda, iteraciones y costo.
- `map`: mapa, rutas, bloqueos y animación.
- `tracking`: seguimiento del viaje en tiempo real.

### Backend

- `emergencies`: creación y actualización de incidentes.
- `ambulances`: disponibilidad y asignación.
- `hospitals`: consulta de destinos.
- `routes`: cálculo y rutas alternativas.
- `transport-method`: construcción de matriz y optimización.
- `realtime`: publicación de actualizaciones de posición y estado.

## 5. Modelo de datos inicial

### `ambulances`

- `id`
- `code`
- `latitude`
- `longitude`
- `status`: `AVAILABLE`, `DISPATCHED`, `ON_ROUTE`, `ARRIVED`, `UNAVAILABLE`
- `capacity`
- `current_hospital_id`

### `hospitals`

- `id`
- `name`
- `address`
- `latitude`
- `longitude`
- `available_beds`
- `has_emergency_service`

### `emergencies`

- `id`
- `description`
- `latitude`
- `longitude`
- `status`
- `assigned_ambulance_id`
- `assigned_hospital_id`
- `created_at`

### `routes`

- `id`
- `emergency_id`
- `origin`
- `destination`
- `distance_meters`
- `estimated_minutes`
- `has_blockage`
- `alternative_route`
- `status`

### `transport_solutions`

- `id`
- `emergency_id`
- `method`
- `initial_matrix`
- `final_assignment`
- `total_cost_minutes`
- `created_at`

## 6. Flujo principal

1. El usuario registra un accidente.
2. El sistema obtiene la ubicación del incidente.
3. Se consultan ambulancias disponibles y hospitales candidatos.
4. Se calcula el tiempo entre cada ambulancia, el incidente y cada hospital.
5. Se construye la matriz de costos.
6. El motor aplica el método de costo mínimo y registra la solución.
7. Se asignan ambulancia y hospital.
8. Se calcula la ruta mediante Google Maps.
9. Si existe bloqueo, se solicita una alternativa.
10. Se actualizan posición y estado de la ambulancia.
11. El viaje finaliza cuando la ambulancia llega al hospital.

## 7. Método de transporte

Cada ambulancia representa un origen y cada hospital un destino. El costo será el tiempo estimado en minutos. Para el escenario base, cada ambulancia tendrá oferta uno y cada solicitud tendrá demanda uno.

El MVP mostrará:

- Matriz inicial de costos.
- Oferta y demanda.
- Solución inicial por costo mínimo.
- Asignaciones seleccionadas.
- Costo total en minutos.
- Comparación entre alternativas.

El cálculo será independiente de Google Maps. El mapa proporcionará datos geográficos y el motor de Investigación Operativa decidirá la asignación.

## 8. Seguridad y configuración

- Utilizar variables de entorno y un `.env.example` sin secretos.
- Activar Row Level Security en las tablas de Supabase.
- Usar la publishable key de Supabase en el frontend.
- Nunca exponer `service_role`, claves secretas ni credenciales de base de datos.
- Restringir la clave de Google Maps por dominio y APIs habilitadas.
- Validar datos recibidos en el backend.
- Mantener separadas las credenciales de desarrollo y producción.

## 9. Estructura del repositorio

```text
proyecto-investigacion-operativa/
├── frontend/
├── backend/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── README.md
├── docs/
│   ├── arquitectura/
│   ├── metodo-transporte/
│   └── superpowers/specs/
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 10. Verificación del MVP

- Pruebas unitarias del cálculo de costos y asignaciones.
- Pruebas de integración para incidentes, ambulancias y hospitales.
- Verificación visual de la matriz y del movimiento del marcador.
- Escenario reproducible con datos semilla.
- Prueba de ruta bloqueada y ruta alternativa.
- Verificación de que no existan secretos en el repositorio.

