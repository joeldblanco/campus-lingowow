# Cuatro opciones por dato

Referencia aprobada: `match-four-options-reference.png`, mockup aprobado por el usuario con la instrucción de implementarlo y publicarlo en dev. Afinamientos también aprobados: el dato debe ser menor que el título principal, feedback breve antes del avance y distractores del mismo tipo cuando sea posible.

Composición requerida:

- Conservar el escenario completo de aula y su amplia cobertura, objetos y fundido blanco alrededor de controles; header/sidebar quedan fuera del lienzo.
- Quitar la tarjeta exterior y el falso input del dato. Un solo contador «Dato 1 de 9» y dato destacado, menor que el título.
- Cuatro respuestas en una columna, superficies blancas suaves, borde lila sutil, esquinas de 18px, texto azul marino y separación cómoda. Correcta más tres distractores pertinentes; orden aleatorio estable por pregunta.
- Seleccionar confirma, muestra corrección brevemente y avanza automáticamente. Sin «Comprobar» ni «Siguiente» duplicados. Al final, resumen y «Continuar» principal del viewer.
- «Saltar ejercicio» blanco opaco, texto azul marino y borde sutil; menor protagonismo sin perder lectura sobre ilustraciones. «Paso anterior» conserva su ámbito.
- Móvil: opciones de ancho disponible, texto largo ajustado y ninguna respuesta tapada por el pie.

Comparación: `match-four-options-comparison.html`. Capturas reales locales `match-four-options-desktop-actual.jpg`, `match-four-options-feedback-actual.jpg`, `match-four-options-summary-actual.jpg` y `match-four-options-mobile-actual.jpg`. Escritorio a 1920×1080; móvil con viewport 390×844, captura de página completa escalada por el navegador.

- Escenario completo, objetos y amplia cobertura con fundido blanco: pasa.
- Sin tarjeta exterior/falso input; un contador y dato menor que el título: pasa.
- Cuatro opciones verticales suaves, visibles sin solapamiento: pasa. Los distractores ahora son del mismo tipo; es el afinamiento aprobado después del mockup.
- Selección por clic/Enter, corrección visible y avance automático: pasa. Pausa de 900 ms en aciertos y 1800 ms en errores; no son duraciones de animación.
- Regreso desde otro paso: misma pregunta y mismo orden de opciones, comprobado en Chrome. Sin avance de preguntas mientras el paso está oculto: cubierto por prueba.
- Resumen real de 6/9 aciertos conserva las tres respuestas incorrectas y su corrección. Un único «Continuar» lleva al siguiente paso: pasa.
- Salto blanco opaco con texto azul marino sobre el escenario: pasa.
- Móvil con respuestas largas: todas legibles, ajuste de líneas y ancho del documento igual al viewport; pie en flujo normal, sin cubrir controles: pasa.
- Una actividad aún pendiente no muestra «Completada» solo porque la lección fue completada antes: prueba añadida que fallaba antes del cambio y pasa después.

## Ventanas de escritorio bajas

La revisión pública del primer despliegue detectó que el pie sticky podía tapar la cuarta opción en una ventana de 1536×667. Se corrigió poniendo únicamente el pie del matching ilustrado en flujo normal. Capturas reales: `match-four-options-short-desktop-actual.jpg` y `match-four-options-short-desktop-footer-actual.jpg`. La cuarta opción termina en y=640.8 y el pie comienza en y=708.8, sin intersección. El acceso por teclado desplaza la vista hasta los controles sin tapar respuestas. Pasa. Es un ajuste de estilo comprobado visualmente; no se añade una prueba que replique clases CSS.

Límites: la ruta local temporal usa los bloques reales y el header de lección, sin el shell autenticado completo; se elimina antes del commit. No se escribieron respuestas/calificaciones en cuentas de estudiantes. La validación pública inicial confirmó cuatro opciones, ausencia de «Comprobar» y salto legible; el ajuste de altura se vuelve a comprobar tras su despliegue. Los distractores adicionales se limitan al perfil de la unidad 1; los bloques desconocidos usan sus opciones publicadas, hasta cuatro sin inventar contenido. Fondo, audio y valores correctos publicados no se modifican.

## Corrección del objetivo pedagógico

Instrucción aprobada posterior: mostrar un ejemplo personal y reconocer su tipo, en vez de recordar datos de Peter. Se conserva la composición del mockup, el entorno completo, cuatro superficies verticales, contraste del salto y pie en flujo normal. Título «Identifica el dato.»; consigna «¿Qué tipo de dato es?». Ejemplos contextualizados de nombres, apellidos, profesión, deletreo, edad, origen, dirección, teléfono y estado civil; no forman una biografía ni pretenden transcribir el audio. «Phone Number» sustituye a «Phone/Mail» solo en esta actividad para que la etiqueta corresponda al ejemplo telefónico. Las otras actividades, audio, datos publicados y renderer clásico no se modifican. Las respuestas correctas ahora son categorías; la corrección, avance automático y resumen usan esas mismas categorías. Distractores seleccionados aleatoriamente de otras categorías y orden estable por pregunta.

Aceptación visual: capturas reales `match-category-desktop-actual.jpg`, `match-category-feedback-actual.jpg` y `match-category-mobile-actual.jpg`; comparación añadida a `match-four-options-comparison.html`. Escritorio 1920×1080: ambiente, escala, objetos, fundido blanco, jerarquía y cuatro opciones verticales conservados: pasa. Error «Age» al identificar el nombre muestra «Respuesta correcta: Name» y avanza al ejemplo del apellido: pasa. Móvil 390×844: texto y opciones legibles, ancho del documento igual a 390px, sin desbordamiento horizontal: pasa. El entorno continúa bajo los controles en el diseño móvil existente; pie en flujo normal. No hay desviaciones materiales del diseño aprobado. La ruta temporal se elimina antes del commit; no se envían respuestas a cuentas de estudiantes.
