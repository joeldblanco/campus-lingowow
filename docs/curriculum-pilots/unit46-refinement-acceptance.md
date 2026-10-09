# U46: respuesta integrada y consigna compacta

## Referencias y requisitos antes de implementar

Referencias del usuario: `codex-clipboard-50812220-8c82-45c8-ad3d-6685b03d1443.png` (paso 8) y `codex-clipboard-eac8dd57-8c6a-445f-8ebd-512bcb3fee07.png` (paso 9). Complementan la guía gráfica aprobada y las composiciones del piloto.

- Paso 8: conservar el aeropuerto completo, su escala, columna de lectura, título y pie con una acción primaria y Saltar. Colocar un campo corto exactamente dentro del hueco, conservar las pistas y todas las respuestas alternativas válidas. Mantener etiqueta accesible, Enter, feedback y avance existentes.
- Paso 9: conservar la librería completa, su escala, jerarquía tipográfica, selector de modalidad, campo de escritura y criterios. Presentar la consigna una vez y en tres puntos, con ejemplos opcionales y guía de modalidad breve. Evitar instrucciones repetidas sobre la ilustración.
- Verificar ambos pasos en escritorio y móvil, incluyendo respuesta correcta/incorrecta y escritura con criterios. Registrar comparación con las capturas originales y mostrar capturas reales antes de declarar la publicación completa.

## Resultado

Revisión visual realizada sobre los componentes reales en localhost a 1440×1000 y 390×844. El selector QA temporal se retiró y el archivo demo original se restauró con hash idéntico. La cabecera y el sidebar de la aplicación no se modifican; las capturas locales muestran solo el recorrido y una barra QA temporal.

| Pantalla | Referencia | Captura real | Resultado por requisito |
| --- | --- | --- | --- |
| Paso 8 | `unit46-refinement-actual/reference-step8.png` | `inline-desktop.jpg`, `inline-mobile-correct.jpg` | Campo dentro del hueco, pistas conservadas, etiquetas y Enter correctos, aeropuerto completo y controles existentes: pasa |
| Paso 9 | `unit46-refinement-actual/reference-step9.png` y `writing-before-desktop.jpg` | `writing-desktop.jpg`, `writing-mobile-top.jpg`, `writing-mobile-footer.jpg` | Consigna única en tres puntos, ejemplo opcional, modalidades breves, librería completa y criterios: pasa |

Capturas adicionales: `example-desktop.jpg`, `writing-mobile-review.jpg`, `inline-mobile-correct.jpg` y `inline-desktop-wrong.jpg`. Se confirmó en vivo que may have se acepta, el error must muestra must have como respuesta y las tres casillas habilitan Confirmar revisión. No hubo desbordamiento horizontal en móvil (375 px disponibles / 375 px de contenido).

La comparación local al mismo viewport muestra menos texto repetido y una consigna más fácil de recorrer; permanece el scroll cuando el contenido lo requiere. No se reduce el ambiente ilustrado ni se sustituyen elementos por tarjetas genéricas. No hay desviaciones materiales pendientes de la composición solicitada.

La presentación inline se habilita explícitamente en el ejercicio y conserva el tipo y los IDs de las respuestas, su sincronización y las variantes revisadas. Los dos audios de U46 mantienen sus URLs originales. El plan de datos solo modifica tres registros existentes de U46: ejercicio, consigna y escritura; el ejemplo está dentro de la consigna. Se mantienen los 52 registros y las 10 escenas, sin añadir requisitos de progreso a quienes ya habían completado la unidad. La simulación CAS en dev verificó historial y unidad 1 intactos y terminó en ROLLBACK.

Validación técnica: 175 archivos / 1270 pruebas de aplicación, lint y TypeScript en verde; 193 pruebas Python en verde. Dos pruebas nuevas cubren cloze con variantes mediante BlockPreview y conservación del campo normal sin habilitación explícita. Las pruebas de contenido verifican consigna compacta, ejemplo cerrado inicialmente, variantes válidas y preservación estricta de archivos originales en aplicaciones posteriores. No se eliminaron ni debilitaron pruebas anteriores.
