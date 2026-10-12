# Auditoría visual read-only U1–U4 · piloto A1 módulo 1

Fecha de revisión: 2026-10-12.
Resultado: **auditoría desktop y móvil final aprobada en las evidencias entregadas**. Las 52 escenas desktop y las dos capturas móviles finales muestran entorno, contenido, jerarquía y controles; queda una observación de coherencia de ordenación descrita abajo.


## Reauditoría final de las cuatro escenas teach

Se abrieron de nuevo las cuatro imágenes actuales después de la espera de render. Todas pasan: el heading de unidad coincide con el título de la escena, la franja muestra Paso 01/13, la zona izquierda mantiene Georgia/navy y consigna/modelo/sentido/cambio legibles, el entorno pintado ocupa la mitad derecha y el CTA Continuar está separado en el pie. No se observan solapamientos. En U2 el diálogo identifica explícitamente a Diego como colega y a Elena como manager antes de “Who is she?”.

- a1m1-u1-teach: claustro pintado, modelo Ana/Luis y sentido de presentación.
- a1m1-u2-teach: biblioteca pintada, referente Diego/Elena y relación de pertenencia.
- a1m1-u3-teach: parque pintado, teléfono/correo y disponibilidad.
- a1m1-u4-teach: estación pintada, reparación/repetición y confirmación.

Resultado de esta reauditoría: **4/4 PASA**. El hallazgo de capturas blancas queda histórico y corregido; las observaciones móviles y de ordenación del resto del informe siguen vigentes.

## Alcance y método

Se usaron los sceneId de docs/curriculum/a1-module1-pilot-manifest.json y se inspeccionó cada JPG de:

C:/tmp/Lingowow/a1-teaching-revision/actual/all-desktop/

Las imágenes se abrieron con inspección visual de alta resolución. Las capturas desktop normales son 1920×1061; transferencia escrita/oral es 1905×1053 por la barra de desplazamiento. Se revisaron además:

- docs/design/graphic-guide-v1/scene-acceptance-v5.md
- docs/design/a1-module1-pilot/visual-acceptance.md
- docs/design/a1-module1-pilot-composition.md
- docs/design/content-format-mockups/v3/README.md, 03-language.webp, 04-multimedia.webp y 05-production.webp
- actual/patterns-mobile.jpg (375×811)
- actual/transfer-writing-desktop.jpg (1905×1053)

No se modificaron el repositorio, el navegador ni la base de datos.

## Criterios de comparación

La referencia aprobada exige un entorno pintado reconocible y completo, aproximadamente media pantalla de imagen con una zona clara de lectura, títulos Georgia, cuerpo Nunito/navy, controles redondeados y una sola acción primaria. Para el contenido nuevo se verificó además:

- sonidos: tarjetas legibles con audio y significado;
- patrones: tablas legibles, sin aglomeración que invada el entorno;
- escucha: reproductor visible y transcripción accesible;
- selección: opciones verticales y ayuda visible/recuperable;
- hueco: campo inline dentro de la frase;
- producción: selector único, consigna breve y micrófono circular;
- escritura: tarjeta y campo de texto legibles; criterios/acciones accesibles mediante scroll;
- no solapamiento entre texto, entorno y controles.

## Hallazgo inicial corregido en la recaptura estable

La versión anterior de estas cuatro capturas solo mostraba la franja local. Ese estado quedó corregido en la recaptura estable revisada el 2026-10-12; las imágenes actuales sí contienen contenido y entorno.

| sceneId | evidencia | resultado |
|---|---|---|
| a1m1-u1-teach | actual/all-desktop/a1m1-u1-teach.jpg | **PASA (recaptura final)** · entorno pintado completo, título e instrucción legibles, modelo visible y CTA único. |
| a1m1-u2-teach | actual/all-desktop/a1m1-u2-teach.jpg | **PASA (recaptura final)** · entorno pintado completo, título e instrucción legibles, modelo visible y CTA único. |
| a1m1-u3-teach | actual/all-desktop/a1m1-u3-teach.jpg | **PASA (recaptura final)** · entorno pintado completo, título e instrucción legibles, modelo visible y CTA único. |
| a1m1-u4-teach | actual/all-desktop/a1m1-u4-teach.jpg | **PASA (recaptura final)** · entorno pintado completo, título e instrucción legibles, modelo visible y CTA único. |

## Revisión por sceneId

Pasa* significa que la composición visible pasa, pero la captura está tomada en la parte superior de una vista con scroll y no prueba el pie completo. Pasa† señala un estado inicial con CTA de comprobación atenuado antes de responder; el texto y el control siguen siendo distinguibles. Observación no es una falla de legibilidad, pero requiere decidir si se mantiene la regla aprobada para ordenar.

### U1 · Saludar y presentarse

| sceneId | resultado | evidencia visual |
|---|---|---|
| a1m1-u1-teach | PASA | Recaptura final: entorno de claustro completo, modelo y sentido visibles; CTA único. |
| a1m1-u1-teaching-sounds-v2 | PASA | Plaza pintada completa a la derecha, zona de lectura clara, tarjetas de frases/audio y navegación sin solapamiento. |
| a1m1-u1-teaching-patterns-v2 | PASA | Biblioteca pintada completa; dos tablas legibles y separadas; densidad alta pero texto y CTA siguen claros. |
| a1m1-u1-listening | PASA | Sala pintada, player blanco visible, transcripción accesible y una acción primaria. |
| a1m1-u1-listening-check | PASA | Entorno completo, título en dos líneas legible, opciones verticales y apoyo visible. |
| a1m1-u1-comprehension | PASA | Entorno completo, opciones verticales y apoyo sin invadir la imagen. |
| a1m1-u1-practice-1 | PASA | Entorno completo, opciones verticales, instrucción corta y controles accesibles. |
| a1m1-u1-practice-2 | PASA† | Campo inline legible; el CTA Comprobar está atenuado antes de entrada, sin solapamiento. |
| a1m1-u1-practice-3 | PASA | Entorno completo, opciones verticales y apoyo local visible. |
| a1m1-u1-practice-4 | PASA† | Línea de respuesta amplia y legible; CTA inicial atenuado, controles sin solapamiento. |
| a1m1-u1-practice-5 | OBSERVACIÓN | Entorno y lista legibles, pero la lista usa flechas arriba/abajo. Comparar con la referencia aprobada de ordenar en fila horizontal con flechas izquierda/derecha si esa interacción sigue siendo el contrato. |
| a1m1-u1-transfer-speak | PASA* | Entorno de cocina completo, tabla de datos, selector único y micrófono circular visibles; el resto queda debajo del scroll. |
| a1m1-u1-transfer-review | PASA* | Entorno, tabla, selector y textarea legibles; checklist y acciones inferiores quedan fuera del primer viewport, accesibles por scroll. |

### U2 · Identificar personas y objetos

| sceneId | resultado | evidencia visual |
|---|---|---|
| a1m1-u2-teach | PASA | Recaptura final: entorno de biblioteca completo, modelo con referente Diego/Elena visible; CTA único. |
| a1m1-u2-teaching-sounds-v2 | PASA | Museo pintado completo, tarjetas de frases/audio legibles y controles sin solapamiento. |
| a1m1-u2-teaching-patterns-v2 | PASA | Estudio pintado completo; dos tablas legibles, con densidad controlada. |
| a1m1-u2-listening | PASA | Mercado pintado completo, player y transcripción visibles, CTA único. |
| a1m1-u2-listening-check | PASA | Entorno completo, título envuelto legiblemente, opciones verticales y apoyo. |
| a1m1-u2-comprehension | PASA | Entorno completo, opciones verticales y apoyo local. |
| a1m1-u2-practice-1 | PASA | Entorno completo, opciones verticales y controles accesibles. |
| a1m1-u2-practice-2 | PASA† | Hueco inline claro; Comprobar atenuado antes de entrada, sin colisión con la ilustración. |
| a1m1-u2-practice-3 | PASA | Entorno completo, opciones verticales y ayuda recuperable. |
| a1m1-u2-practice-4 | PASA† | Respuesta inline amplia y legible; acción inicial atenuada pero distinguible. |
| a1m1-u2-practice-5 | OBSERVACIÓN | Lista de ordenar legible con flechas arriba/abajo; comprobar contra el patrón aprobado de ordenación horizontal/izquierda-derecha. |
| a1m1-u2-transfer-speak | PASA* | Patio pintado completo, tabla, selector único y micrófono circular; contenido inferior requiere scroll. |
| a1m1-u2-transfer-review | PASA* | Invernadero pintado completo, tabla/selector/textarea legibles; checklist y pie no caben en el primer viewport. |

### U3 · Compartir contactos y horarios

| sceneId | resultado | evidencia visual |
|---|---|---|
| a1m1-u3-teach | PASA | Recaptura final: entorno de parque completo, modelo de contacto/horario visible; CTA único. |
| a1m1-u3-teaching-sounds-v2 | PASA | Entorno de lago completo, tarjetas con números/correo/horario legibles y controles claros. |
| a1m1-u3-teaching-patterns-v2 | PASA | Puerto pintado completo; tablas legibles, sin texto sobre objetos. |
| a1m1-u3-listening | PASA | Invernadero pintado completo, player blanco visible y transcripción separada. |
| a1m1-u3-listening-check | PASA | Entorno completo, opciones verticales, apoyo y navegación sin solapamiento. |
| a1m1-u3-comprehension | PASA | Sala de aeropuerto completa, opciones y apoyo legibles. |
| a1m1-u3-practice-1 | PASA | Estudio pintado completo, opciones verticales y ayuda local. |
| a1m1-u3-practice-2 | PASA† | Hueco dentro de la frase y acción Comprobar distinguibles; estado inicial atenuado. |
| a1m1-u3-practice-3 | PASA | Entorno completo, opciones verticales y números legibles. |
| a1m1-u3-practice-4 | PASA† | Línea de producción escrita clara; CTA inicial atenuado sin solapamiento. |
| a1m1-u3-practice-5 | OBSERVACIÓN | Lista vertical legible con flechas arriba/abajo; verificar coherencia con la referencia de ordenar aprobada. |
| a1m1-u3-transfer-speak | PASA* | Biblioteca pintada completa, tarjeta/selector/micrófono visibles; captura superior con scroll. |
| a1m1-u3-transfer-review | PASA* | Cocina pintada completa, tarjeta/selector/textarea/checklist iniciales legibles; pie debajo del viewport. |

### U4 · Pedir repetición y aclaración

| sceneId | resultado | evidencia visual |
|---|---|---|
| a1m1-u4-teach | PASA | Recaptura final: entorno de estación completo, modelo de reparación visible; CTA único. |
| a1m1-u4-teaching-sounds-v2 | PASA | Sala de aeropuerto pintada completa, tarjetas de repetición/confirmación legibles y controles claros. |
| a1m1-u4-teaching-patterns-v2 | PASA | Calle pintada completa; patrones y sustitución legibles, sin solapamiento. |
| a1m1-u4-listening | PASA | Plaza pintada completa, player blanco visible y transcripción accesible. |
| a1m1-u4-listening-check | PASA | Galería pintada completa, título envuelto, opciones verticales y apoyo legibles. |
| a1m1-u4-comprehension | PASA | Estudio pintado completo, opciones verticales y apoyo local. |
| a1m1-u4-practice-1 | PASA | Panadería pintada completa, opciones verticales y una acción de navegación. |
| a1m1-u4-practice-2 | PASA† | Hueco inline claro; botón Comprobar atenuado antes de entrada, sin colisión. |
| a1m1-u4-practice-3 | PASA | Entorno completo, opciones verticales legibles. |
| a1m1-u4-practice-4 | PASA† | Línea de producción clara; acción inicial atenuada pero legible. |
| a1m1-u4-practice-5 | OBSERVACIÓN | Ordenación vertical legible con flechas arriba/abajo; confirmar si corresponde al contrato horizontal aprobado. |
| a1m1-u4-transfer-speak | PASA* | Sala pintada completa, tarjetas/selector/micrófono circular; pie fuera del primer viewport por scroll. |
| a1m1-u4-transfer-review | PASA* | Arco pintado completo, tabla/selector/textarea legibles; criterios y pie continúan debajo del scroll. |

## Móvil y escritura

### patterns-mobile.jpg

La captura final a1m1-u1-teaching-patterns-v2-mobile-final.jpg (375×1324) pasa la comprobación móvil: el encabezado y progreso caben, el título y la instrucción siguen legibles, las dos tablas permanecen dentro del contenedor con la pista explícita de desplazamiento horizontal, el entorno pintado aparece completo después del contenido y los botones Continuar/Paso anterior quedan accesibles al final. La tercera columna se recorta en el estado inicial por el scroll interno, pero la affordance es visible y no hay desbordamiento de página. **Resultado: PASA móvil.**

### Escritura de transferencia

La captura final a1m1-u1-transfer-review-mobile-final.jpg (375×1944) pasa la comprobación móvil completa: título y consigna son legibles, la tarjeta tiene scroll horizontal explícito, el selector único queda visible, el textarea no se desborda, los cuatro criterios son alcanzables, el apoyo queda al alcance, el entorno pintado aparece antes del pie y Confirmar revisión/Saltar ejercicio/Paso anterior quedan separados y operables. No se observa la consigna de misión repetida como bloque adicional. **Resultado: PASA móvil.**

## Conclusión accionable

1. Las cuatro capturas teach fueron recapturadas con espera de render y pasan: entorno, contenido, jerarquía y CTA visibles.
2. Las capturas móviles finales de patrones y transferencia escrita pasan; incluyen entorno, scroll interno explícito, criterios y pie de controles.
3. Resolver explícitamente si la ordenación vertical con flechas arriba/abajo es la interacción aprobada; la referencia citada describe una fila horizontal con flechas izquierda/derecha.
4. La aceptación visual queda cerrada para las evidencias disponibles. Esta auditoría no valida adquisición, pronunciación humana ni calibración MCER.
