# Lectura integrada de Carl

Referencia aprobada: `reading-transparent-reference.png`, captura del usuario que rechaza el rectángulo crema alrededor de la lectura.

Requisitos: conservar el escenario completo de Carl y su identidad; texto azul marino sobre el fundido blanco de la composición, sin tarjeta, borde ni fondo crema; conservar toda la lectura y los enlaces seguros; eliminar solamente párrafos vacíos de presentación. En móvil, lectura legible antes del escenario y controles accesibles.

Comparación: `reading-transparent-comparison.html`. Capturas reales locales: `reading-transparent-actual.jpg` (1920×1080) y `reading-transparent-mobile.jpg` (390×844).

- Fondo transparente y ausencia de caja crema: pasa.
- Carl y entorno amplio con fundido alrededor del texto: pasa.
- Lectura completa, tipografía y contenido conservados: pasa.
- Móvil sin desbordamiento horizontal; escenario debajo de la lectura: pasa.
- La navegación nueva distingue «Paso anterior» y «Continuar»: pasa en esta pantalla informativa.

Pruebas de presentación verifican también sanitización, enlaces y eliminación de párrafos vacíos. Las capturas usan los bloques reales en una ruta local temporal, sin el shell autenticado; no verifican por sí solas el despliegue público.
