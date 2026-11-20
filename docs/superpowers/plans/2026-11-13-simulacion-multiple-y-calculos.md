# Simulación múltiple y explicación de los cálculos

Implementar en la PWA un escenario académico de Santa Cruz con selección de ubicación en Leaflet, catálogo ampliado y una matriz de transporte que se pueda explicar en la exposición.

1. Habilitar clic o toque para mover la ubicación del incidente individual y la de cada persona seleccionada en el modo múltiple. Invalidar búsquedas al cambiar el punto y mantener fijo el incidente durante el despacho.
2. Mostrar 25 hospitales y clínicas con nombre, coordenadas verificables y fuente. Mantener el catálogo local y el seed de Supabase alineados. Identificar camas y flota como simuladas.
3. Ofrecer un escenario inicial con cuatro bases, cinco personas y tres unidades. Enviar personas, bases, unidades libres y plazas ocupadas a `POST /simulations/transport/solve`. El backend devuelve costos, trazas, asignaciones y pendientes.
4. Maximizar primero la cantidad de despachos con los recursos disponibles. Balancear la matriz con filas y columnas auxiliares y minimizar los minutos de base a persona con Vogel y salto de piedra. Conservar el costo mínimo como comparación. Elegir el hospital receptor viable por menor tiempo de traslado y reservar su plaza.
5. Mostrar **Cómo se calculó** como una pizarra. Las filas H representan bases y las columnas P representan personas. Mostrar oferta, demanda, minutos por celda y cantidades asignadas. Permitir alternar entre solución inicial y final. Al seleccionar una celda, mostrar proveedor, distancia, tiempo y fórmula de la tarifa en Bs. Distinguir rutas viales de estimaciones.
6. Mostrar penalizaciones de Vogel, cantidades asignadas, ciclos con signos de salto de piedra y la suma de minutos por unidades. La tarifa simulada se calcula como base más cargo por kilómetro por distancia de ida. Mostrar por separado llegada al incidente y traslado al hospital.
7. Animar los tramos con geometría vial. Al completar un despacho, devolver la unidad al conjunto libre en el hospital receptor y recalcular los pendientes al cambiar los recursos. Conservar las plazas ocupadas y los viajes activos en la simulación.
8. Verificar una matriz con mejora, una solución ya óptima, capacidad limitada, ubicación y trazas visibles. Ejecutar las pruebas y compilaciones de ambos proyectos y comprobar la interfaz responsive.

Fuente de nombres y coordenadas: [Guía Urbana de Santa Cruz de la Sierra](https://guiaurbana.gmsantacruz.gob.bo/guiaurbana/), capas de salud 21, 25, DEPARTAMENTAL y 20.1.

Para explicar una celda en la exposición: si el proveedor devuelve 444 segundos y 2.4 km, se muestran 7.4 minutos (444 ÷ 60). Con base de Bs 70 y tarifa de Bs 7/km, el precio de ida es Bs 86.80 (70 + 7 × 2.4). El tiempo de traslado al hospital se consulta por separado. Vogel usa los minutos de llegada; los bolivianos se muestran para comparar la tarifa.
