# Pilotos curriculares: unidades 2, 22 y 46

## Alcance y referencias aprobadas

Se rediseñan tres unidades de Lingowow Esencial: país y nacionalidad (U2), normas y consejos (U22), e interpretación de modales perfectos (U46). Son 12, 9 y 10 escenas respectivamente. No se declara terminado el rediseño de las otras 53 unidades.

Referencias: `../design/graphic-guide-v1/auto-choice-reference.png`, `writing-instruction-reference.png` y `practice-canvas-v4-reference.png`, junto con `../design/content-format-mockups/v3/`. Se conservan ambientes ilustrados completos, tipografía y jerarquía aprobadas, texto protegido de la ilustración, botón primario único en el pie y control de grabación circular. Los ambientes no se repiten dentro de cada piloto.

## Evidencia real y comparación

`visual-acceptance.json` registra cada una de las 31 escenas, su referencia aprobada, ilustración, capturas reales de escritorio y móvil, y resultado por requisito. Se revisaron todas las composiciones a 1440×1000 y 390×844, incluidas opciones iniciales, acierto, error, práctica con profesora y autoevaluación. No se observó desbordamiento horizontal en móvil ni desviaciones materiales de la composición aprobada.

Las capturas se tomaron del componente real mediante un selector QA temporal en localhost; ese selector y sus datos se retiraron. La cabecera autenticada existente no se rediseña. Además, `actual/u22-teacher-guide-desktop.jpg` demuestra la entrada real mediante LessonContent y la guía pedagógica; `actual/u46-reference-desktop.jpg` muestra los ejemplos desplegados. Las pruebas verifican también el mapeo real de registros y la habilitación del recorrido para los tres IDs exactos.

Ejemplos representativos y estados están conservados en `actual/`. El informe HTML completo y las 93 capturas de las escenas permanecen en el directorio de la revisión pedagógica de esta conversación.

## Comportamiento y límites

Las opciones se corrigen al clic; las explicaciones permanecen hasta que el estudiante decide avanzar. Las actividades de producción incluyen criterios de revisión y dos modalidades de práctica. La autoevaluación registra una revisión realizada, no certifica dominio ni inventa una calificación. La grabación se probó con MediaRecorder simulado; no se solicitó micrófono en el navegador.

Se mantienen las seis grabaciones originales, sus URLs e identidades. La verificación binaria confirmó sus SHA256 originales. Las preguntas usan las fuentes auditadas; no se afirma una nueva transcripción completa de los audios.

El compilador conserva las 100 filas originales y sus tipos/payload históricos, marcando explícitamente las reemplazadas como archivo excluido del recorrido. Añade 66 filas. El aplicador transaccional exige la base dev, compara exactamente los datos previos y verifica que progreso, respuestas y unidad 1 permanezcan intactos. La simulación concluyó en ROLLBACK. Producción queda fuera del alcance.

## Validación técnica

171 archivos y 1.251 pruebas de aplicación en verde; lint sin errores y TypeScript sin errores. Las 191 pruebas Python del contenido y los aplicadores pasan. Se añaden pruebas de corrección por pregunta, avance manual, modalidades accesibles, revisión de escritura y grabación, exclusión de archivos históricos, mapeo real y entrada desde el curso. Ninguna prueba fue eliminada o debilitada.
