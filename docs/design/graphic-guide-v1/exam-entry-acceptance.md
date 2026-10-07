# Entrada y foco de evaluaciones

## Referencia aprobada

Petición del usuario: antes de tomar una evaluación, modal que explique pantalla completa y proctoring; Cancelar / Entrar; durante la evaluación, sin header ni sidebar de la aplicación, solo controles del examen. Guía gráfica v1 para jerarquía, tipografía, objetivos de 44px y adaptación móvil. No se solicitó reemplazar la interfaz interna del examen.

## Requisitos y resultados

| Requisito | Resultado / evidencia |
|---|---|
| Modal previo al intento/reloj/proctoring | Pasa: los GET de las dos rutas solo leen metadata; acción autenticada se invoca después de aceptar |
| Cancelar sin consumir intento | Pasa en pruebas de diálogo y gate; no se monta ExamViewer antes de aceptar |
| Pantalla completa desde el gesto de entrada | Pasa: Chrome enfocado, botón visible; la interfaz real mostró Proctoring Activo |
| Supervisión explicada con precisión | Pasa: pestaña, ventana, pantalla completa; restricciones configuradas de clipboard/context menu; sin inventar cámara/micrófono |
| Activación de supervisión y pantalla completa | Política de entrada: ambas activadas para evaluaciones estudiantiles, incluidas nivelación; copy/paste y clic derecho conservan configuración |
| Sin navegación global durante examen | Pasa: ExamChrome devuelve null para sidebar, header, banners y tour; controles y respuestas conservan montaje |
| Móvil | Pasa: modal 390×844 con margen lateral; botones legibles; controles reales del examen sin navegación global |
| Error de permisos | Pasa: se bloquea inicio, se muestra error y se permite reintentar; observado antes de enfocar Chrome |
| Acceso y límites existentes | Pasa en pruebas: matrícula/asignación antes de metadata; nivelación ya completada a resultados; máximo de intentos conserva destino; servidor usa identidad autenticada |
| Reanudación | Conserva timestamp, respuestas, flags e índice original; no reinicia reloj de intento existente |

## Capturas reales

- exam-entry-desktop-actual.jpg: aviso en escritorio, 1440×900.
- exam-entry-mobile-actual.jpg: aviso en móvil, 390×844.
- exam-focus-desktop-actual.jpg: ExamViewer después de entrada real en pantalla completa, sin navegación global.
- exam-focus-mobile-actual.jpg: el mismo examen con respuesta ficticia seleccionada, 390×844.
- exam-entry-comparison.html: antes y después lado a lado.

La vista local utiliza los componentes reales de diálogo, foco y ExamViewer, con un intento ficticio que no se crea en la base de datos. El sidebar/header de fondo de la fixture son representativos; el cableado del layout privado se revisó en código y pruebas. La grabación de eventos y el inicio autenticado real se cubren con pruebas del límite servidor; no se creó, respondió ni envió una evaluación de un estudiante para comprobarlo. La verificación pública en dev sigue pendiente del despliegue.

Chrome rechazó inicialmente fullscreen mientras la ventana no tenía foco; tras Page.bringToFront, el clic de entrada funcionó. No se desactivaron protecciones ni se simuló fullscreen mediante cambios de DOM. Se restauraron tamaños y se cerraron los tabs locales al finalizar.
