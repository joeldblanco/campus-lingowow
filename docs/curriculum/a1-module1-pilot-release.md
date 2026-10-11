# Piloto A1: módulo 1

Curso independiente de DEV: `a1-general-module1-pilot`. Incluye arranque opcional desde cero, cuatro unidades y una misión. No reemplaza cursos, inscripciones ni audios existentes.

## Audio

Once grabaciones nuevas con voces sintéticas Kokoro-82M: siete apoyos del arranque y cuatro modelos de unidad. Se identifican como sintéticas en pantalla; el arranque no presenta sus apoyos como pruebas auditivas calificadas. Los modelos de unidad tienen seis preguntas propias y una transcripción desplegable.

Fuentes del motor: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) y [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). El generador conserva guion hablado, voces, velocidad y hash de cada archivo. La revisión automática de transcripción se documenta fuera de Git; no sustituye escuchar y revisar pronunciación con una persona.

## Publicación segura

1. Generar con `scripts/content/build-a1-module1-pilot.py`, las fuentes curriculares autorizadas y `--audio-manifest docs/curriculum/a1-module1-audio-integration.json`.
2. Ejecutar pruebas, lint, TypeScript y aceptación visual. La ruta local de revisión debe eliminarse antes de publicar.
3. Desplegar código únicamente en DEV y confirmar contenedor saludable, commit y archivos de audio.
4. Ejecutar `scripts/content/apply-a1-module1-pilot.py docs/curriculum/a1-module1-pilot.json --identities <archivo-privado> --audio-manifest docs/curriculum/a1-module1-audio-manifest.json` sin `--apply`. La transacción revierte por defecto.
5. Si la simulación pasa, repetir con `--apply`. El aplicador solo inserta identidades nuevas, rechaza colisiones y verifica preservación de contenido, audio, progreso, respuestas, actividades e inscripciones.

Los dos manifiestos tienen funciones distintas: `audio-integration` contiene ubicación pedagógica para el compilador; `audio-manifest` contiene únicamente archivos, hashes y guiones para la validación estricta del aplicador. Las identidades privadas nunca se guardan en Git.

## Alcance de validación

La autocorrección comprueba ejercicios cerrados. Escritura, conversación y misión utilizan revisión guiada; no se presentan como certificación MCER ni sustituyen una evaluación docente. El protocolo de prueba humana está en `a1-module1-pilot-testing.md`; todavía requiere participantes y observación real.
