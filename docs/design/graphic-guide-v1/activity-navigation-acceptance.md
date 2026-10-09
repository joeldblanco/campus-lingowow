# Acciones de ejercicios guiados

Referencias aprobadas: capturas del usuario `activity-choice-reference.png`, `activity-listening-reference.png` y `activity-match-reference.png`, con sus instrucciones posteriores de una acción principal para corregir y avanzar, y «Saltar» secundario. La guía gráfica y el catálogo de escenarios siguen vigentes.

Composición requerida: entorno ilustrado amplio fuera del header/sidebar; fundido blanco alrededor de texto y controles; una acción azul principal; navegación entre preguntas claramente distinta de navegación entre pasos; no continuar antes de corregir todas las preguntas salvo salto explícito. En móvil ninguna opción puede quedar tapada por el pie.

Comparación real: `activity-navigation-comparison.html`. Capturas locales con los bloques actuales del curso. Escritorio 1920×1080 para emparejamiento, selección y listening; móvil 390×844, capturas de página completa para verificar contenido y controles. La captura de frases usa el viewport normal de Chrome.

- Emparejamiento: dato fijo, una selección avanza automáticamente; respuestas usadas dejan de competir; revisión completa antes/después de comprobar; «Cambiar» solo antes de comprobar; reinicio secundario y ausente al empezar. Pasa.
- Frases, selección y verdadero/falso: «Comprobar» → «Siguiente pregunta» → «Continuar» al corregir todas. No botón interno «Siguiente» duplicado ni «Continuar lección» prematuro. Pasa.
- «Pregunta anterior» y «Paso anterior» diferencian ámbitos; la primera pregunta no muestra un retroceso imposible. Pasa.
- «Saltar ejercicio» secundario avanza sin inventar respuestas ni calificaciones. Pasa.
- Escritura: «Corregir» y salto; consigna autónoma y nivel sin etiqueta prominente. Pasa en estado inicial.
- Presentación oral: «Grabar» y salto inicial; avance bloqueado durante grabación, completada solo al recibir corrección válida. Estado inicial visual y estados de corrección/bloqueo cubiertos por pruebas.
- Móvil: pie en flujo normal para evitar cubrir opciones. Pasa; no desbordamiento horizontal observado.
- Escenarios variados, identidad y cobertura conservadas. Pasa.

Límites: no se enviaron calificaciones ni se concedió permiso de micrófono a estudiantes. Éxito/error de corrección IA y guardia de grabación verificados mediante pruebas, sin consumo de servicios de IA. La vista local temporal no contiene el shell autenticado completo; publicación pública se verifica por separado. El audio inicial de Peter conserva la discrepancia pendiente de una nueva grabación; estos cambios no sustituyen ese archivo.
