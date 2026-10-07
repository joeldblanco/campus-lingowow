# Biblioteca de fondos — aceptación local

Referencia vigente: captura del usuario `background-library-reference.png`; guía gráfica v1; requisito posterior de no repetir fondos durante una unidad salvo continuidad necesaria.

Composición requerida: escenario completo a escala de la vista de lección, fuera de header/sidebar; sin recorte ornamental ni panel; fundido blanco cerca de controles; estilo editorial pintado semirrealista adulto; controles reales por encima de decoración sin interceptar eventos; contenido primero en móvil.

## Asignación de la unidad 1

| Paso | Escenario | Repetición |
|---|---|---|
| 1–3 | Peter / aula | Continuidad explícita de la presentación dividida |
| 4 | Escritorio original | Único |
| 5 | Lucas | Único |
| 6 | Biblioteca | Único |
| 7 | Campus | Único |
| 8 | Panadería | Único |
| 9 | Carl | Único |
| 10 | Estudio botánico | Único |
| 11 | Sala de escucha | Único |
| 12 | Escritura | Único |
| 13 | Grabación | Único |

## Evidencia

Comparación lado a lado: `background-library-comparison.html`. Capturas reales locales a 1920×1080 de biblioteca, campus, panadería, estudio botánico y sala de escucha. Móvil a 390×844, captura superior y escena tras desplazamiento. El shell local mantiene espacios de header/sidebar pero no reproduce los controles autenticados; no es verificación pública de dev.

| Requisito | Resultado |
|---|---|
| Escenarios diferentes por actividad | Pasa: 11 fuentes distintas; solo Peter 1–3 conserva continuidad |
| Cobertura de lienzo y objetos grandes | Pasa en las cinco composiciones de escritorio capturadas |
| Sin caja ni recorte ornamental alrededor del escenario | Pasa |
| Fundido blanco junto al contenido | Pasa |
| Estilo uniforme de ilustración | Pasa: referencia de generación study-room-v3 y revisión visual de los cinco activos |
| Controles por encima de decoración | Pasa; no se enviaron respuestas ni calificaciones |
| Móvil | Pasa para sala de escucha: contenido antes de escena, escena de 320px, sin desbordamiento horizontal |
| Foco del input sin rectángulo oscuro | Pasa: outline none y borde inferior azul en campo enfocado |

## Límites pendientes

La biblioteca cubre ocho pasos sin personaje de esta unidad. Antes de habilitar unidades más extensas hay que ampliar el catálogo: el asignador rechaza capacidad insuficiente para impedir repeticiones silenciosas. La revisión pública autenticada y el despliegue todavía no se han realizado.

Los problemas de interacción/navegación y fondo crema de lectura señalados en turnos anteriores tienen solicitudes de autorización de pruebas pendientes. No forman parte del cumplimiento de esta biblioteca y siguen sin corregirse. La fixture local conserva contenido anterior de listening; esta revisión no altera datos ni su revisión ya publicada en dev.
