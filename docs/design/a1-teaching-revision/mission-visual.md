# Auditoría visual de la misión A1

**Fecha:** 2026-10-12
**Alcance:** lectura visual de las capturas finales; sin cambios en repositorio, navegador ni base de datos.

## Resultado global

La cobertura visual de escritorio de las cinco escenas queda **PASS** después de reemplazar la captura de briefing: ahora muestra consigna, escenario, roles/ayuda, entorno y CTA. Las cinco conservan la composición aprobada: entorno painterly completo a la derecha, zona de lectura clara a la izquierda, tipografía navy, controles redondeados y una acción primaria cobalto.

La evidencia móvil del diálogo autónomo, del modo con profesora, de la tarjeta y de la mediación es completa, con entorno y pie visibles. Briefing y modelo siguen sin captura móvil. Las capturas desktop de tarjeta y mediación quedaron en una posición superior con scroll y no muestran su pie desktop; por eso el gate visual general queda **PASS escritorio y móvil de producción; briefing/modelo móvil y pie desktop de dos escenas pendientes**.

## Referencias y criterio

Se contrastó el manifest en:

- C:\Users\ACER\.codex\worktrees\a1-general-module1-pilot\web\docs\curriculum\a1-module1-pilot-manifest.json
- C:\Users\ACER\.codex\worktrees\a1-general-module1-pilot\web\docs\design\a1-module1-pilot\visual-acceptance.md
- C:\Users\ACER\.codex\worktrees\a1-general-module1-pilot\web\docs\design\graphic-guide-v1\README.md
- C:\Users\ACER\.codex\worktrees\a1-general-module1-pilot\web\docs\design\graphic-guide-v1\scene-acceptance-v5.md
- C:\Users\ACER\.codex\worktrees\a1-general-module1-pilot\web\docs\design\content-format-mockups\v3\README.md
- Referencias de producción y entorno en docs\design\a1-module1-pilot\actual\, graphic-guide-v1\background-campus-actual.jpg, graphic-guide-v1\footer-v5-mobile.jpg y content-format-mockups\v3\05-production.webp.
- Capturas auditadas: C:\tmp\Lingowow\a1-teaching-revision\actual\ y su subdirectorio all-desktop.

Criterios aplicados: entorno pintado completo sin tarjetas/gradientes abstractos; texto en superficie clara opaca; cuerpo legible; encabezado único; controles de al menos 44 px; pie con una sola acción primaria; micrófono verdaderamente redondo; apilado móvil sin overflow horizontal.

## Veredicto por sceneId

| sceneId | Fondo esperado por manifest | Evidencia | Resultado |
|---|---|---|---|
| a1m1-mission-briefing | botanical-office.webp | actual\all-desktop\a1m1-mission-briefing.jpg (1920×1061) | **PASS escritorio**; móvil no verificado |
| a1m1-mission-model | flower-courtyard.webp | actual\all-desktop\a1m1-mission-model.jpg (1920×1061) | **PASS escritorio**; móvil no verificado |
| a1m1-mission-speak | garden.webp | actual\all-desktop\a1m1-mission-speak.jpg, mission-self-desktop.jpg, mission-teacher-desktop.jpg (1920×1061) | **PASS escritorio y móvil autónomo** |
| a1m1-mission-card | workshop.webp | actual\all-desktop\a1m1-mission-card.jpg (1905×1053), a1m1-mission-card-mobile-final.jpg (375×1750) | **PASS escritorio y móvil** |
| a1m1-mission-mediation | community-bookshop.webp | actual\all-desktop\a1m1-mission-mediation.jpg (1905×1053), a1m1-mission-mediation-mobile-final.jpg (375×1866), mission-mediation-mobile-footer.jpg (390×843) | **PASS escritorio y móvil** |

### a1m1-mission-briefing — PASS escritorio

a1m1-mission-briefing.jpg ya muestra el encabezado “Misión: recepción de un centro de formación”, progreso 1/5, escenario y consigna en español, los enlaces “Roles y entrega”, “Ayuda” y “Tabla de apoyo”, la nota de ruta autónoma/profesora, el entorno botanical-office completo y el CTA Continuar cobalto. La superficie blanca conserva la lectura y el arte queda visible a la derecha, en línea con la referencia aprobada actual\mission-brief-final-1920.jpg.

No hay captura móvil de esta escena ni del estado abierto de sus apoyos; la composición desktop queda verificada.

### a1m1-mission-model — PASS escritorio

La escena flower-courtyard ocupa de forma continua la mitad derecha con fuente, arcos, mesa y objetos visibles; el degradado blanco conserva la lectura en la izquierda. El encabezado “Misión · modelo breve”, la explicación en español, “Guía para docente” y “Tabla de apoyo (abrir si la necesitas)” son legibles. El modelo en inglés es coherente con el propósito de enseñar las formas; no sustituye la consigna española. Se ve un único Continuar cobalto y Paso anterior outline.

La captura no incluye móvil ni el estado abierto de la tabla; la accesibilidad real de sus datos queda pendiente de una captura de interacción.

### a1m1-mission-speak — PASS escritorio y móvil autónomo

En mission-speak.jpg/mission-self-desktop.jpg, el jardín y el invernadero ocupan la derecha sin ser sustituidos por tarjetas. La izquierda mantiene título, consigna española, ejemplo y hoja común. “What’s your name?” y el apoyo breve en español son legibles; el inglés pertenece al turno que se practica. Las pestañas Por mi cuenta/Con mi profesora tienen selección clara.

El micrófono es circular, con icono y etiqueta “Grabar respuesta”, y mantiene un anillo claro. El pie usa Saltar ejercicio como secundario y Confirmar revisión como primaria deshabilitada antes de grabar; no hay dos primarias simultáneas. La escena de mission-teacher-desktop.jpg conserva el mismo entorno y muestra las dos preguntas por turnos, una guía española y el único CTA He practicado.

mission-self-mobile.jpg (375×1439) es una captura full-page: conserva la jerarquía y la legibilidad, muestra la pestaña de profesora, el micrófono circular completo, el entorno debajo del contenido y el pie con tres controles de ancho completo. Se requiere scroll vertical; no se observa overflow horizontal. mission-mobile-footer.jpg confirma el mismo estado inferior en un recorte separado.

mission-teacher-mobile.jpg (375×1258) muestra el modo acompañado completo: pestaña azul, instrucción española, las dos preguntas en inglés, entorno y `He practicado` como única primaria, además de `Saltar ejercicio` y `Paso anterior` outline. La parte superior de esta captura conserva una franja de progreso parcialmente cubierta por la cabecera fija; el contenido de la escena no queda oculto.

El chequeo suministrado del DOM reporta documentWidth=viewportWidth=390; las capturas rasterizadas tienen 375 px de contenido y no muestran overflow horizontal.

### a1m1-mission-card — PASS escritorio y móvil; pie visible en móvil

El workshop pintado ocupa la derecha y deja una superficie clara para la lectura. Son legibles el título, la consigna española, Ver ejemplo, Hoja común (abrir si la necesitas), el textarea y la lista Revisa tu respuesta. Las pestañas de ruta están compuestas como control único y la hoja conserva los cinco datos de la tarjeta.

La captura desktop termina antes del pie y muestra scrollbar. En la captura móvil final la consigna ya no se duplica visualmente: `promptPresentedSeparately` deja la instrucción en su bloque principal y conserva la lista accesible sin ruido adicional. Se ven textarea, los cinco criterios, el entorno workshop y el pie: `Confirmar revisión` deshabilitado, `Saltar ejercicio` y `Paso anterior` outline, todos a ancho completo y sin overflow horizontal.

### a1m1-mission-mediation — PASS escritorio y móvil

La escena community-bookshop aparece completa a la derecha con libros, ventana, sillón y mesa; la izquierda mantiene fondo claro. La instrucción, el modelo en español, la aclaración de que se evalúa transferencia de información, la tabla de apoyo colapsada, el textarea y los criterios son legibles. La separación entre fuente inglesa y respuesta en español es visualmente clara.

La captura desktop termina a mitad de la lista de criterios y muestra scrollbar; el pie no está evidenciado allí. En la captura móvil final la instrucción ya no se duplica visualmente: `promptPresentedSeparately` mantiene el texto principal breve y la lista accesible queda fuera del flujo visual adicional. Se ven contenido, criterios, entorno community-bookshop y pie completo; `mission-mediation-mobile-footer.jpg` confirma `Confirmar revisión` deshabilitado, `Saltar ejercicio` y `Paso anterior` outline.

## Controles, entorno y pie

Las cinco escenas no vacías respetan la familia aprobada: arte editorial painterly adulto, ambiente completo en el lado indicado por sceneSide: "right", máscara blanca difusa detrás del texto y encabezado Georgia navy. Los botones azules son la única acción primaria visible cuando el estado la habilita; los secundarios son blancos con borde. No se observan controles genéricos cuadrados ni una sustitución de la ilustración por CSS.

El pie móvil conserva la transición blanca sin una barra rectangular dura. En diálogo autónomo, tarjeta y mediación, Confirmar revisión aparece deshabilitado antes de responder, seguido por Saltar ejercicio y Paso anterior; esto es coherente con el estado capturado.

## Limitaciones móviles y de evidencia

- Capturas móviles completas disponibles para diálogo autónomo, modo con profesora, tarjeta y mediación; briefing y modelo siguen sin captura móvil.
- La captura de profesora tiene una franja de progreso parcialmente cubierta por la cabecera fija al inicio; el cuerpo de la escena queda legible.
- Sin evidencia del estado abierto de las hojas/tablas de apoyo; las capturas solo demuestran que el enlace está presente.
- Sin pie de escritorio visible en tarjeta y mediación; se necesita una captura inferior si el gate exige validar también ese viewport.

## Siguiente revisión visual

1. Capturar el pie desktop de tarjeta y mediación; recapturar profesora desde el top limpio si la franja de progreso cubierta no es un artefacto del harness.
2. Abrir una vez la hoja común y la tabla de mediación en la evidencia para confirmar que los datos son visibles y legibles al usuario.
3. Añadir capturas móviles de briefing y modelo si se requiere cobertura de cada sceneId.
