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
