# Composición del piloto A1 módulo 1

Se reutiliza el reproductor ilustrado aprobado, con el nuevo programa en un curso independiente. Las unidades vigentes y sus audios se conservan. Este documento fija los criterios previos a la implementación; las capturas reales y sus comparaciones se añadirán al informe de aceptación.

| Familia de pantalla | Referencia aprobada | Composición requerida |
|---|---|---|
| Orientación y arranque | graphic-guide-v1/background-campus-actual.jpg | Entorno pintado completo; título Georgia y texto breve en zona clara; tablas largas bajo desplegables; sin imponer conocimiento previo |
| Modelo y lenguaje | graphic-guide-v1/lucas-canvas-v4-reference.png; content-format-mockups/v3/03-language.webp | Lectura separada de la ilustración, vocabulario con significado y ejemplos; no sustituir entornos por retratos aislados ni tarjetas genéricas |
| Comprensión y selección | graphic-guide-v1/auto-choice-reference.png | Opciones verticales legibles, comprobación al clic, feedback en la opción y una acción de avance; Saltar blanco con texto azul oscuro |
| Huecos | graphic-guide-v1/auto-fill-reference.png | Campo dentro de la frase; sin una línea de respuesta separada; feedback y navegación coherentes |
| Escucha | graphic-guide-v1/auto-listening-reference.png | Reproductor en superficie clara, sin autoplay; grabación nueva identificada como sintética; transcripción accesible; no fingir audio pendiente |
| Producción | graphic-guide-v1/writing-instruction-reference.png; content-format-mockups/v3/05-production.webp | Consigna breve, detalles y ejemplo desplegables; selector profesora/individual; micrófono redondo; revisión con criterios de comunicación |
| Misión y transferencia | graphic-guide-v1/writing-instruction-reference.png | Datos nuevos y roles claros, ensayo autónomo distinguido de interacción observada, criterios verificables; texto sin superposición a objetos/personajes |

## Reglas comunes

- Entornos editoriales cálidos completos, objetos y luz preservados, aproximadamente media pantalla de detalle en escritorio y espacio claro a la izquierda para contenido. Identidad de personajes solo si la escena los usa y coincide con el referente; no añadir retratos decorativos incongruentes.
- Navy `#10245C`, cobalt `#245CFF`, lilac `#EEE8FA`, fondo ivory; cuerpo Nunito de 16 px o más, título Georgia. Controles de 44 px o más.
- Un CTA principal por pie, Paso anterior y Saltar secundarios; no repetir Anterior/Siguiente dentro y fuera de la actividad.
- Transiciones existentes y respuesta correcta animada; respetar movimiento reducido. Nada debe bloquear la siguiente interacción.
- En móvil, mantener un entorno reconocible sin sacrificar lectura, controles o foco; ninguna columna debe salirse del viewport. Escuchar y grabar requieren acción explícita; no aceptar permisos de micrófono inesperados durante QA.

## Puerta de aceptación

Comparar capturas reales de escritorio y móvil con las referencias a escala comparable, incluidas selección correcta/incorrecta, hueco, lectura, escucha y producción. Registrar por familia ilustración, jerarquía, controles, espaciado y responsive. Pruebas técnicas por sí solas no confirman fidelidad visual.
