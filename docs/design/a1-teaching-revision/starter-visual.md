# Auditoría visual final del arranque A1 desde cero

**Fecha:** 2026-10-12
**Alcance:** las 41 escenas starter de `a1-general-start`.
**Método:** revisión con `view_image` de cada JPG reemplazado, después del render estable indicado para la captura (heading exacto, animaciones terminadas e imágenes decodificadas visibles). No se modificaron repo ni DB.

**Referencia aprobada:** `docs/design/graphic-guide-v1/README.md`, `auto-choice-reference.png`, `auto-fill-reference.png` y `background-campus-actual.jpg`. El criterio aplicado exige entorno pintado completo con detalle principal a la derecha, zona clara y legible a la izquierda, títulos Georgia/navy, texto de lectura claro, controles de aproximadamente 44 px y ausencia de solapes.

## Estado de la evidencia

Las 41 capturas están presentes y cada archivo corresponde a su paso/escena. Todas miden **1920×1061**, el viewport real usado para esta revisión. Los controles visibles no se solapan. El pie de página no aparece dentro de estas capturas y queda sin verificar en esta evidencia.

**Resultado:** las 41 escenas cumplen visualmente en las capturas posteriores a ocho `requestAnimationFrame` sin animaciones activas. Las nueve escenas señaladas en la revisión anterior ahora muestran entorno, contenido y controles legibles.

## Resultados por archivo

| # | `sceneId` / título | Arte y entorno | Legibilidad | Densidad | Controles / CTA | Estado |
|---:|---|---|---|---|---|---|
| 1 | `a1m1-start-s1-teach.jpg` · Hello, I’m / My name is | Listening-lounge completo a la derecha, con transición clara a la zona izquierda. | Alta; explicación, modelo, tarjetas y audio nítidos. | Tres tarjetas + ayuda + reproductor, ordenados. | `Continuar` y audio visibles; sin solape. | OK |
| 2 | `a1m1-start-s1-check-1.jpg` · Hello, I’m / My name is · comprobación 1 | Biblioteca completa a la derecha. | Alta; consigna y opciones claras. | Tres opciones equilibradas. | `Paso anterior`/`Saltar ejercicio`; CTA de comprobación condicionado a selección. | OK |
| 3 | `a1m1-start-s1-check-2.jpg` · Hello, I’m / My name is · comprobación 2 | Music-room completo a la derecha. | Alta; consigna y campo claros. | Una demanda, espacio suficiente. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 4 | `a1m1-start-s1-check-3.jpg` · Hello, I’m / My name is · comprobación 3 | Workshop completo a la derecha. | Alta; pregunta y tres opciones claras. | Compacta. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 5 | `a1m1-start-s2-teach.jpg` · Abecedario y deletreo | Laboratorio completo, detalle a la derecha. | Alta; enseñanza, tarjetas y apoyos nítidos. | Dos tarjetas + dos ayudas, sin aglomeración. | `Paso anterior`/`Continuar`, sin solape. | OK |
| 6 | `a1teach-start-s2-micro-1.jpg` · Primer grupo de letras de TORRES | Airport-lounge completo y reconocible. | Alta; explicación y T/O/R legibles. | Tres tarjetas, adecuada. | `Paso anterior`/`Continuar`. | OK |
| 7 | `a1teach-start-s2-micro-2.jpg` · Último grupo de letras de TORRES | Art-studio completo a la derecha. | Alta; E/S y explicación legibles. | Dos tarjetas, sin sobrecarga. | `Paso anterior`/`Continuar`. | OK |
| 8 | `a1teach-start-s2-micro-3.jpg` · Letras J, X y Y de las comprobaciones | Bakery completa a la derecha. | Alta. | Tres tarjetas compactas. | `Paso anterior`/`Continuar`. | OK |
| 9 | `a1teach-start-s2-micro-4.jpg` · Letra Z de la comprobación | Entorno completo, detalle de estudio a la derecha. | Alta; Z y explicación legibles. | Una tarjeta, aire suficiente. | `Paso anterior`/`Continuar`. | OK |
| 10 | `a1m1-start-s2-check-1.jpg` · Abecedario y deletreo · comprobación 1 | Campus completo a la derecha. | Alta. | Tres opciones compactas. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 11 | `a1m1-start-s2-check-2.jpg` · Abecedario y deletreo · comprobación 2 | Entorno pintado completo a la derecha. | Alta: título, instrucción, ayuda, filas y flechas legibles. | Tres filas de ordenamiento bien separadas. | `Paso anterior`, `Saltar ejercicio`, `Reiniciar orden`; sin solape. | OK |
| 12 | `a1m1-start-s2-check-3.jpg` · Abecedario y deletreo · comprobación 3 | Biblioteca completa a la derecha. | Alta. | Campo único, equilibrado. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 13 | `a1m1-start-s2-check-4.jpg` · Abecedario y deletreo · comprobación 4 | Daily-kitchen completo a la derecha. | Alta. | Campo único, aire suficiente. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 14 | `a1m1-start-s2-check-5.jpg` · Abecedario y deletreo · comprobación 5 | Family-room completo a la derecha. | Alta: instrucción, ayuda, pregunta y G/J/K legibles. | Tres opciones, proporción correcta. | `Paso anterior`/`Saltar ejercicio` visibles. | OK |
| 15 | `a1m1-start-s2-check-6.jpg` · Abecedario y deletreo · comprobación 6 | Flower-courtyard completo. | Alta. | Campo único compacto. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 16 | `a1m1-start-s3-teach.jpg` · Números para contacto | Garden completo a la derecha. | Alta; modelo, tabla y apoyos legibles. | Tres tarjetas + tres ayudas, organizados. | `Paso anterior`/`Continuar`. | OK |
| 17 | `a1teach-start-s3-micro-1.jpg` · Dígitos 3, 4 y 5 | Harbor-promenade completo. | Alta; 3/4/5 y explicación legibles. | Tres tarjetas. | `Paso anterior`/`Continuar`. | OK |
| 18 | `a1teach-start-s3-micro-2.jpg` · Dígitos 6, 7 y 8 | Lakeside completo a la derecha. | Alta: título, explicación, tarjetas 6/7/8 y audio legibles. | Tres tarjetas compactas y equilibradas. | `Paso anterior`/`Continuar` visibles. | OK |
| 19 | `a1teach-start-s3-micro-3.jpg` · Dígito 9 | Market completo; captura ya coincide con `Dígito 9`, paso 19/41. | Alta; tarjeta 9 y explicación claras. | Una tarjeta, aire suficiente. | `Paso anterior`/`Continuar`. | OK |
| 20 | `a1teach-start-s3-micro-4.jpg` · Hora de clase | Mountain-cabin completo a la derecha. | Alta. | Dos tarjetas compactas. | `Paso anterior`/`Continuar`. | OK |
| 21 | `a1teach-start-s3-micro-5.jpg` · Aula y teléfono | Museum-gallery completo a la derecha. | Alta. | Dos tarjetas compactas. | `Paso anterior`/`Continuar`. | OK |
| 22 | `a1m1-start-s3-check-1.jpg` · Números para contacto · comprobación 1 | Family/living-room completo a la derecha. | Alta; pregunta y opciones claras. | Tres opciones equilibradas. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 23 | `a1m1-start-s3-check-2.jpg` · Números para contacto · comprobación 2 | Seaside/terrace completo a la derecha. | Alta. | Campo único. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 24 | `a1m1-start-s3-check-3.jpg` · Números para contacto · comprobación 3 | Campus/parque completo a la derecha. | Alta. | Campo único, equilibrado. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 25 | `a1m1-start-s3-check-4.jpg` · Números para contacto · comprobación 4 | Travel-station completo a la derecha. | Alta: pregunta y opciones `eight/six a.m./p.m.` legibles. | Tres opciones con separación adecuada. | `Paso anterior`/`Saltar ejercicio` visibles. | OK |
| 26 | `a1m1-start-s3-check-5.jpg` · Números para contacto · comprobación 5 | Village-square completo. | Alta. | Tres opciones compactas. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 27 | `a1m1-start-s3-check-6.jpg` · Números para contacto · comprobación 6 | Listening-lounge completo. | Alta. | Tres opciones compactas. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 28 | `a1m1-start-s4-teach.jpg` · Escucha una presentación | Library completo a la derecha. | Alta; `from`, `live in`, modelo, ayuda y audio legibles. | Tres tarjetas + dos ayudas + reproductor, organizados. | `Paso anterior`/`Continuar`; sin solape. | OK |
| 29 | `a1m1-start-s4-check-1.jpg` · Escucha una presentación · comprobación 1 | Music-room completo. | Alta; audio, pregunta y opciones claros. | Audio + tres opciones, densa pero ordenada. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 30 | `a1m1-start-s4-check-2.jpg` · Escucha una presentación · comprobación 2 | Art completo a la derecha. | Alta: audio, pregunta y Lima/Cusco/Quito legibles. | Audio + tres opciones, estructura correcta. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 31 | `a1m1-start-s4-check-3.jpg` · Escucha una presentación · comprobación 3 | Science-lab completo a la derecha. | Alta; audio y campo claros. | Audio + campo, equilibrados. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 32 | `a1m1-start-s5-teach.jpg` · Ficha digital puente para la unidad 1 | Airport-lounge completo a la derecha. | Alta: explicación, modelo, tarjetas y audio legibles. | Tres tarjetas + ayuda + reproductor, sin solape. | `Paso anterior`/`Continuar`. | OK |
| 33 | `a1teach-start-s5-micro-1.jpg` · Hora y aula | Entorno de estudio completo a la derecha. | Alta: explicación, tarjetas `at six` / `in room two oh four` y audio legibles. | Dos tarjetas compactas y equilibradas. | `Paso anterior`/`Continuar`. | OK |
| 34 | `a1m1-start-s5-check-1.jpg` · Ficha digital puente para la unidad 1 · comprobación 1 | Bakery completa a la derecha. | Alta: consigna, ayuda y filas de ordenamiento legibles. | Tres filas, separación correcta. | `Paso anterior`, `Saltar ejercicio`, `Reiniciar orden`. | OK |
| 35 | `a1m1-start-s5-check-2.jpg` · Ficha digital puente para la unidad 1 · comprobación 2 | Entorno completo a la derecha. | Alta; pregunta y Room 24/204/240 claras. | Tres opciones equilibradas. | `Paso anterior`/`Saltar ejercicio`. | OK |
| 36 | `a1m1-start-s5-check-3.jpg` · Ficha digital puente para la unidad 1 · comprobación 3 | Entorno completo a la derecha. | Alta. | Campo único, aire suficiente. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 37 | `a1m1-start-s5-check-4.jpg` · Ficha digital puente para la unidad 1 · comprobación 4 | Entorno completo a la derecha. | Alta. | Campo único, equilibrado. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` deshabilitado. | OK |
| 38 | `a1teach-start-s5-transfer-prep-1.jpg` · Letras nuevas del nombre Luis | Biblioteca completa a la derecha. | Alta: explicación y tarjetas L/U/I legibles. | Tres tarjetas previstas, sin solape. | `Paso anterior`/`Continuar`. | OK |
| 39 | `a1teach-start-s5-transfer-prep-2.jpg` · Letras nuevas del apellido Vega | Kitchen completo a la derecha. | Alta; V/G, explicación y apoyos claros. | Dos tarjetas compactas. | `Paso anterior`/`Continuar`. | OK |
| 40 | `a1teach-start-s5-transfer-prep-3.jpg` · Sonidos de los datos nuevos | Family-room completo a la derecha. | Alta; Thursday, seven y one oh five claros. | Tres tarjetas, equilibradas. | `Paso anterior`/`Continuar`. | OK |
| 41 | `a1teach-start-s5-transfer.jpg` · Transferencia · datos nuevos | Flower-courtyard completo. | Alta; modelo, tabla Luis Vega/Chile/Thursday/7 p.m./Room 105 y demanda legibles. | Tabla + ayuda + respuesta, sin solape. | `Paso anterior`, `Saltar ejercicio`, `Comprobar` visibles; escena final. | OK |

## Resultado de la reauditoría

Las nueve escenas que fallaban en la captura anterior quedan aprobadas en la evidencia nueva: el entorno pintado está presente, la zona izquierda mantiene contraste suficiente para leer la demanda y los controles no se solapan. `a1teach-start-s5-micro-1` ahora muestra la explicación y las dos tarjetas de pronunciación completas.

El viewport real de 1920×1061 es válido para esta revisión. El pie de página no aparece en las capturas y queda pendiente de una comprobación específica si se necesita validar ese elemento.
