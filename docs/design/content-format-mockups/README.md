# Catálogo del nuevo formato de unidades

24 propuestas visuales en seis láminas. Cubren los 23 tipos disponibles en el
editor actual y los tipos adicionales de estructura o compatibilidad.
Las ilustraciones son mockups, no cambios implementados en los ejercicios.

Cada vista centra una tarea, conserva controles reconocibles y usa ilustraciones
para dar contexto. La ayuda indispensable se mantiene; los textos decorativos se
eliminan. Ordenar y clasificar ofrecen botones además del arrastre.

| Lámina | Propuestas | Tipos cubiertos |
| --- | --- | --- |
| [01 · Multimedia](01-multimedia.webp) | Texto/títulos, imagen, video, audio | `text`, `title`, `image`, `video`, `audio` |
| [02 · Lenguaje](02-language.webp) | Vocabulario, gramática, tabla, visualizador | `vocabulary`, `grammar`, `structured-content`, `grammar-visualizer` |
| [03 · Práctica básica](03-basic-practice.webp) | Completar, emparejar, verdadero/falso, opción múltiple | `fill_blanks`, `match`, `true_false`, `multiple_choice` |
| [04 · Práctica avanzada](04-advanced-practice.webp) | Respuesta corta, ordenar, clasificar, selección múltiple | `short_answer`, `ordering`, `drag_drop`, `multi_select` |
| [05 · Producción](05-production.webp) | Ensayo, grabación, tarea, quiz | `essay`, `recording`, `assignment`, `quiz` |
| [06 · Recursos y estructura](06-resources-structure.webp) | Archivos, contenido externo, notas del profesor, grupos | `file`, `embed`, `teacher_notes`, `tab_group`, `tab_item`, `layout`, `column`, `container`, `block_group` |

## Alcance y decisiones pendientes

- Hay 30 nombres declarados en `BlockType`, 29 interfaces distintas en `Block`,
  23 plantillas y 27 casos en el visor actual. No todos son actividades independientes.
- `tab_item` y `column` son hijos de bloques estructurales. Las pestañas se proponen
  como pasos secuenciales; las columnas se adaptan al ancho de pantalla.
- `container` está declarado pero no tiene visor/editor específico. Se incluye en
  la propuesta estructural, sin afirmar que ya funciona como un bloque independiente.
- `assignment` conserva compatibilidad de visualización pero su autoría actual
  es parcial. El mockup muestra las modalidades posibles; una tarea real debe mostrar
  únicamente la modalidad configurada, con sus límites reales.
- Las notas del profesor nunca forman parte del recorrido obligatorio del estudiante.
- Las cantidades de palabras, plazos, preguntas y ejemplos son ilustrativos. El
  contenido publicado y sus reglas prevalecen al adaptar cada unidad.
- Los botones «Comprobar» y los estados de avance son propuestas. No se cambiarán
  reglas de aprobación, bloqueos o pruebas existentes sin revisar su configuración.
- El ejemplo de clasificación debe permitir mover a cualquiera de las categorías,
  mediante controles con texto o teclado, además de arrastrar.

## Imágenes y prompts

Generadas con la herramienta integrada de imágenes. Se conservaron los originales
en el directorio de imágenes generadas y se codificaron copias WebP de calidad 92,
sin reducir sus dimensiones, para este catálogo. No se usarán estas láminas como
imágenes de interfaz: contenido y controles deben seguir siendo elementos reales.

Prompt compartido: cuatro mockups por lámina, estilo adulto de café ilustrado,
fondo marfil con formas orgánicas lila, títulos azul marino, controles cobalto,
una tarea por pantalla, navegación sencilla y texto legible. Referencia: el mockup
aprobado de lectura de Carl. Sin textos decorativos, eslóganes ni rejillas de tarjetas.

Prompts específicos:

1. Lectura con Carl; imagen significativa y pregunta; reproductor de video con
   controles; reproductor de audio con forma de onda.
2. Vocabulario conectado a un personaje; regla en una conversación; tabla clara;
   transformación del orden de palabras con variantes visibles.
3. Espacio en una frase; emparejar por selección; escuchar y responder verdadero/falso;
   elegir una opción sin revelar la correcta.
4. Respuesta corta; ordenar con subir/bajar; clasificar con selección y acción de mover;
   seleccionar varias respuestas con casillas.
5. Ensayo con contador; grabación con micrófono y temporizador; tarea con entrega;
   cuestionario de una pregunta por vez.
6. Descargas; recurso externo con enlace alternativo; notas exclusivas del profesor;
   grupo de conversación/audio convertido en recorrido secuencial.

Ediciones finales: quitar escritura de pizarras, libros y tazas; mantener la camisa
azul de Lucas; corregir la etiqueta «Práctica»; hacer coincidir la modalidad de archivo
seleccionada con el campo mostrado y quitar límites de archivo inventados.
