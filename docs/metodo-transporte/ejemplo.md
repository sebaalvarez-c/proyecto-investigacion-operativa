# Ejemplo académico del método de transporte

## Escenario

Se simula un accidente en Santa Cruz. Las ambulancias son los orígenes, los
hospitales son los destinos y cada costo representa minutos estimados.

## Datos

| Origen / destino | Hospital 1 | Hospital 2 | Hospital 3 | Oferta |
|---|---:|---:|---:|---:|
| Ambulancia A | 12 | 18 | 25 | 1 |
| Ambulancia B | 20 | 10 | 16 | 1 |
| Ambulancia C | 15 | 22 | 8 | 1 |
| Demanda | 1 | 1 | 1 | |

## Método de costo mínimo

1. Se selecciona el costo menor disponible: Ambulancia C → Hospital 3, con 8 minutos.
2. Se elimina la oferta de C y la demanda del Hospital 3.
3. El menor costo restante es Ambulancia B → Hospital 2, con 10 minutos.
4. Finalmente se asigna Ambulancia A → Hospital 1, con 12 minutos.

## Solución

| Ambulancia | Hospital | Cantidad | Costo unitario | Costo asignado |
|---|---|---:|---:|---:|
| C | 3 | 1 | 8 | 8 |
| B | 2 | 1 | 10 | 10 |
| A | 1 | 1 | 12 | 12 |
| **Total** | | | | **30 minutos** |

El solver registra además cada iteración para que la interfaz pueda explicar
cómo se obtiene la asignación. La ruta geográfica se calcula después de esta
decisión; Google Maps aporta calles y tiempos, pero no sustituye el método.

## Interpretación para la exposición

La solución minimiza el costo total de la asignación bajo la oferta y demanda
definidas. En un sistema real, la matriz se actualizaría con tráfico,
disponibilidad, bloqueos y capacidad hospitalaria. En este prototipo esos datos
son simulables y reproducibles.
