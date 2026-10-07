# Regreso al curso al terminar

Referencia aprobada: petición del usuario de volver al curso, revelar la lección recién completada y mostrar su marca de completada con glow. Se conserva la composición existente de la vista del curso.

Requisitos: guardar primero; regresar al curso; abrir el módulo y mostrar la lección aunque esté después del octavo módulo; desplazarse hasta ella; esperar a que sea visible antes de animar; anunciar la finalización y enfocar la fila; respetar movimiento reducido; no celebrar progreso inexistente ni repetir la animación al recargar.

Evidencia real local: `course-completion-desktop-actual.jpg` y `course-completion-mobile-actual.jpg`. Fixture de diez módulos con progreso confirmado para la lección del módulo diez. En ambos tamaños la fila aparece abierta, visible y marcada «Completada», con la acción «Repasar». La URL pierde el marcador después de usarlo.

Pruebas cubren orden de persistencia/navegación, progreso autoritativo, módulos bloqueados y marcadores inválidos, visibilidad profunda, foco y desplazamiento, espera de animación, recarga y movimiento reducido. Las capturas muestran el estado final; la animación temporal se verifica en las pruebas de estado y CSS.

Límite: fixture local sin escritura a cuentas de estudiantes. La captura no sustituye la comprobación de publicación pública.
