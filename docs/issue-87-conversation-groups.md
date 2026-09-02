# Issue #87: estado de los grupos de conversación

## Estado actual

El campus no ofrece hoy grupos de conversación o sesiones grupales como una funcionalidad operativa para el alumno.

Sí existe una base técnica parcial para chats grupales:

- `prisma/schema.prisma`: `FloatingConversation` incluye `title` e `isGroup`.
- `src/lib/actions/floating-chat.ts`: `createFloatingConversation` crea una conversación grupal cuando recibe más de un participante.
- `src/app/(private)/messages/page.tsx`: el alumno puede entrar a Mensajes.

La experiencia disponible sigue siendo individual:

- `src/components/chat/NewChatDialog.tsx` permite seleccionar una sola persona y crea la conversación con un único identificador.
- `src/components/chat/ChatSidebar.tsx` representa cada conversación usando solamente el primer participante distinto del alumno.
- `src/components/chat/MessagesClient.tsx` y `src/components/chat/ChatWindow.tsx` esperan un único `otherUser`.

El resto del flujo académico es individual:

- `ClassBooking` y `ClassAttendance` relacionan una clase con un solo alumno.
- El calendario y el aula consultan por `studentId` y devuelven un único alumno/profesor.
- `CreditUsage.GROUP_SESSION` existe como enum, pero no tiene acciones ni interfaz que consuman ese tipo de crédito.
- Algunos componentes mencionan sesiones o tutorías grupales en textos comerciales, pero no forman parte de un flujo funcional.

No se encontraron modelos, rutas o interfaces para programar sesiones de conversación, definir cupos o recurrencia, asignar facilitadores, ni inscribir alumnos. Por tanto, el soporte genérico de chat grupal no equivale a los grupos de conversación descritos en el producto.

## Accesibilidad para el alumno

El alumno puede abrir `/messages` y crear conversaciones uno a uno. La navegación no ofrece una sección de grupos y el alumno no puede descubrir, inscribirse, consultar el estado ni entrar a una sesión grupal.

## MVP propuesto

1. Crear una entidad de sesión grupal con tema, nivel, profesor, fecha, hora, cupo, estado y enlace de aula.
2. Crear una relación de participantes con estado de inscripción y unicidad por alumno/sesión.
3. Dar al administrador un flujo mínimo para publicar o cancelar sesiones.
4. Dar al alumno un listado para consultar cupos, inscribirse, cancelar su inscripción y entrar cuando la sesión esté habilitada.
5. Aplicar autorización y control de cupo en el servidor. Dejar recurrencia, lista de espera, chat grupal y reportes avanzados fuera del primer alcance.

No se implementó este MVP en el issue #87: requiere una decisión funcional sobre créditos, cancelaciones, administración y membresía antes de ampliar el modelo académico y la interfaz.
