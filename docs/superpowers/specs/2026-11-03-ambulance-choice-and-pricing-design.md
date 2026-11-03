# Diseño: selección de ambulancias y tarifas demostrativas

**Fecha:** 2026-11-03  
**Estado:** Borrador para revisión del usuario  
**Contexto:** Proyecto académico de Investigación Operativa; prototipo demostrativo en Santa Cruz de la Sierra, Bolivia.

## 1. Objetivo

Permitir que la persona que reporta un incidente compare ambulancias disponibles por cercanía, tiempo estimado de llegada y tarifa demostrativa en bolivianos; elija una unidad; y siga en el mapa el trayecto hasta el incidente y, después, desde el incidente hasta el hospital asignado.

El sistema seguirá siendo una simulación académica. No recibirá pagos ni afirmará disponibilidad, precios o tiempos operativos reales.

## 2. Experiencia del usuario

1. La página carga el mapa real de Santa Cruz antes de iniciar una simulación.
2. Al enviar el reporte, aparece el estado **Buscando ambulancias…** mientras se solicitan opciones.
3. La aplicación muestra todas las unidades disponibles dentro del radio de búsqueda configurado. Cada tarjeta indica código de unidad, hospital/base, distancia vial al incidente, ETA y tarifa estimada en Bs.
4. Las opciones se ordenan inicialmente por menor ETA. Se identifican por separado **Más cercana** (menor ETA) y **Más económica** (menor tarifa). El usuario puede ordenar por tiempo o precio y seleccionar cualquier unidad disponible.
5. Tras elegir, la aplicación confirma la unidad y presenta la matriz del método de transporte y la recomendación del sistema. La elección manual y la recomendación algorítmica se distinguen claramente; la tarifa no sustituye el costo en minutos de la matriz.
6. La primera etapa del mapa muestra la ruta vial desde la base de la ambulancia hasta el incidente y anima el marcador de la unidad a lo largo de esa geometría. Al alcanzar el incidente, cambia el estado a **Ambulancia llegó al incidente**.
7. La segunda etapa traza y anima la ruta desde el incidente hasta el hospital de destino recomendado. Al completar el trayecto, el estado pasa a **Llegó al hospital**.

El diseño seguirá siendo responsive: las tarjetas de unidades se apilan en pantallas pequeñas y el mapa, las tarifas, las ETA y los botones permanecen legibles y utilizables.

## 3. Tarifas de demostración

Las tarifas son datos sintéticos configurables para la demostración. Cada unidad tendrá una tarifa base en Bs y una tarifa por kilómetro. El backend calculará el total estimado a partir de la distancia vial entre la base y el incidente, redondeará a dos decimales y devolverá moneda `BOB`.

La interfaz indicará **Tarifa estimada · demo académica** y explicará que no es una cotización real ni se cobrará al usuario. No se solicitarán datos de pago. Los valores se guardarán en los datos de prueba del backend y, si se habilita persistencia Supabase, en el esquema/seed correspondiente; nunca se fijarán solo en el frontend.

## 4. Recomendación y método de transporte

- El listado de elección representa la decisión explícita del usuario: unidad con menor tarifa, menor ETA u otra unidad disponible.
- La marca **Más cercana** se determina por ETA vial calculada hasta el incidente, no por distancia en línea recta.
- La matriz académica continúa usando minutos estimados como costo unitario. El motor de costo mínimo construye una recomendación de asignación ambulancia-hospital y la muestra junto con sus costos y solución.
- Una elección manual diferente no se reescribe como óptima: se registra como elección del usuario y se conserva la recomendación algorítmica para comparación y explicación del proyecto.
- Después de elegir la ambulancia, se consideran hospitales con servicio de urgencias y capacidad disponible. La recomendación de destino minimiza el ETA vial incidente-hospital entre los hospitales elegibles; la matriz presenta la comparación necesaria para defender el método de transporte.

## 5. API y flujo de backend

La API separará descubrimiento, selección y cálculo de etapas:

- `POST /emergencies`: crea el reporte sin reservar recursos.
- `GET /emergencies/:id/ambulance-options`: calcula rutas y devuelve unidades elegibles, ETA, distancia, tarifa y etiquetas de recomendación. No modifica disponibilidad.
- `POST /emergencies/:id/dispatch`: recibe el identificador de la unidad elegida, vuelve a validar disponibilidad y hospital/base, reserva la unidad y calcula la recomendación de hospital y la matriz.
- `POST /emergencies/:id/route/pickup`: devuelve geometría vial y ETA desde la base seleccionada al incidente.
- `POST /emergencies/:id/route/hospital`: devuelve geometría vial y ETA desde el incidente al hospital recomendado.

La selección debe ser idempotente para la misma emergencia y la validación de disponibilidad debe impedir seleccionar una unidad ya ocupada. Si no hay unidades disponibles, el API devolverá una respuesta explícita de opciones vacías; el frontend mantendrá el mapa y ofrecerá reintentar sin simular una asignación.

Las rutas usarán Google Routes cuando esté configurado y el proveedor vial de respaldo existente en el proyecto cuando no lo esté. Si ambos proveedores no responden, el sistema informará que no pudo calcular la ETA vial y no etiquetará una aproximación recta como ruta real.

## 6. Datos

### Ambulancias

Cada unidad requiere hospital/base actual, coordenadas, estado, tarifa base y tarifa por kilómetro. Los datos de prueba incluirán más de una unidad disponible en bases distintas para que cercanía y precio puedan producir recomendaciones diferentes.

### Hospitales

Se ampliará el catálogo demostrativo de Santa Cruz. Cada hospital tendrá nombre, dirección, coordenadas, servicio de urgencias y camas disponibles. Las unidades estarán asociadas a una base mediante `current_hospital_id`.

El seed será reproducible e idempotente. Las ubicaciones y tarifas añadidas serán claramente datos académicos simulados, no un directorio médico verificado.

## 7. Seguimiento y mapa

El mapa tendrá tres estados: inicial con hospitales y ubicación del incidente; etapa 1 con ruta base→incidente; etapa 2 con ruta incidente→hospital. La animación recorrerá los puntos de la polilínea vial seleccionada, interpolando segmento por segmento. Un cambio de estado disparará la transición entre etapas y ajustará el viewport a los puntos relevantes.

La respuesta de cada etapa incluirá origen, destino, ETA, distancia y polilínea. El frontend no inferirá coordenadas de hospitales ni trazará una diagonal como ruta si falta geometría.

## 8. Fuera de alcance

- Cobros, pagos, tarifas reales o promesa de servicio médico.
- Directorio verificado y disponibilidad en vivo de hospitales o ambulancias reales.
- Navegación del conductor, despacho a centrales reales o historial médico.
- Autenticación de operadores y administración de precios desde un panel.

## 9. Criterios de aceptación

- Antes de reportar, el mapa real de Santa Cruz está visible con ubicaciones de hospitales.
- Al reportar, el usuario ve **Buscando ambulancias…** y luego opciones disponibles o una respuesta de no disponibilidad.
- Cada opción muestra ETA vial, distancia y tarifa en Bs, y se puede ordenar por precio o ETA.
- El sistema identifica correctamente menor ETA y menor tarifa sin confundir las dos.
- El usuario puede seleccionar una unidad y el backend valida/reserva disponibilidad antes de continuar.
- La matriz de transporte conserva minutos como costos y se distingue de la tarifa en Bs.
- El mapa anima la ambulancia por la ruta base→incidente y después por la ruta incidente→hospital.
- La interfaz es usable en móvil y escritorio, y muestra claramente que las tarifas y recursos son simulados.
- Ningún secreto de Maps o Supabase se agrega al repositorio.
