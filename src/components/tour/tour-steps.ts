import type { TourStep } from './tour-types'

export const teacherTourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    content:
      '¡Bienvenido al Campus Lingowow! Esta es tu barra lateral de navegación donde encontrarás todas las secciones principales.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content:
      'Aquí está tu Panel de Control. Verás un resumen de tus clases del día, estadísticas y acciones rápidas.',
    placement: 'bottom',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="stats"]',
    content:
      'Aquí puedes ver tus estadísticas: asistencia semanal, ganancias del mes, estudiantes activos y mensajes sin leer.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="schedule"]',
    content:
      'En tu horario de hoy puedes ver todas las clases programadas. Cuando sea hora de iniciar, aparecerá el botón "Entrar al Aula".',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="courses"]',
    content:
      'Tus cursos activos aparecen aquí. Haz clic en cualquiera para ver el progreso y los materiales.',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="quick-actions"]',
    content:
      'Estas son tus acciones rápidas: crear actividades, ver ganancias, editar horario y gestionar lecciones personalizadas.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-actividades"]',
    content:
      'En la sección de Actividades puedes crear ejercicios interactivos para tus estudiantes.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="nav-biblioteca"]',
    content: 'La Biblioteca contiene recursos educativos que puedes usar en tus clases.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-mis-ganancias"]',
    content: 'Consulta tus ganancias y el historial de pagos en esta sección.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="user-menu"]',
    content:
      '¡Listo! Desde aquí puedes acceder a tu perfil, configuración y cerrar sesión. ¡Buena suerte con tus clases!',
    placement: 'top',
    skipBeacon: true,
    skipScroll: true,
  },
]

export const studentTourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    content: '¡Bienvenido a Lingowow! Esta es tu barra lateral donde encontrarás todas las secciones del campus.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="student-course"]',
    content:
      'Aquí verás tu siguiente paso. Entra al curso para abrir sus lecciones. Al terminar, usa “Completar y continuar” para guardar tu progreso y avanzar, o “Completar Lección” si es la última. Al regresar verás “Lección completada”; para repasar y avanzar puedes usar “Siguiente Lección”.',
    placement: 'bottom',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="nav-actividades"]',
    content:
      'En Actividades puedes practicar y revisar cuáles ejercicios ya están completados.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="nav-biblioteca"]',
    content: 'En Biblioteca encontrarás los recursos y materiales adicionales de aprendizaje.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="tour-help"]',
    content: 'Puedes cerrar el recorrido en cualquier momento y volver a abrirlo desde este botón.',
    placement: 'top',
    skipBeacon: true,
    skipScroll: true,
  },
]

export const guestTourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    content: '¡Bienvenido a Lingowow! Explora nuestra plataforma de aprendizaje de idiomas.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="hero-banner"]',
    content: 'Descubre nuestros cursos disponibles y las inscripciones abiertas.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="stats-cards"]',
    content:
      'Conoce nuestras estadísticas: idiomas disponibles, profesores certificados y clases de prueba gratuitas.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '[data-tour="popular-courses"]',
    content:
      'Explora nuestros cursos más populares. Haz clic en "Ver Detalles" para más información.',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '[data-tour="webinars"]',
    content: 'Inscríbete en webinars gratuitos para conocer nuestra metodología.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="resources"]',
    content: 'Accede a recursos gratuitos: PDFs, audios y materiales de práctica.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '[data-tour="nav-tienda"]',
    content: 'Visita nuestra tienda para ver todos los cursos y planes disponibles.',
    placement: 'right',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="cta-section"]',
    content: '¿Listo para comenzar? ¡Inscríbete en un curso y comienza tu viaje de aprendizaje!',
    placement: 'top',
    skipBeacon: true,
    skipScroll: true,
  },
  {
    target: '[data-tour="user-menu"]',
    content: 'Desde aquí puedes acceder a tu perfil. ¡Esperamos verte pronto como estudiante!',
    placement: 'top',
    skipBeacon: true,
  },
]

export const getTourSteps = (tourType: 'teacher' | 'student' | 'guest'): TourStep[] => {
  switch (tourType) {
    case 'teacher':
      return teacherTourSteps
    case 'student':
      return studentTourSteps
    case 'guest':
      return guestTourSteps
    default:
      return []
  }
}
