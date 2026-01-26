import type { TourStep } from './tour-types'

export const teacherTourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    content:
      '¡Bienvenido al Campus Lingowow! Esta es tu barra lateral de navegación donde encontrarás todas las secciones principales.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content:
      'Aquí está tu Panel de Control. Verás un resumen de tus clases del día, estadísticas y acciones rápidas.',
    placement: 'bottom',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="stats"]',
    content:
      'Aquí puedes ver tus estadísticas: asistencia semanal, ganancias del mes, estudiantes activos y mensajes sin leer.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="schedule"]',
    content:
      'En tu horario de hoy puedes ver todas las clases programadas. Cuando sea hora de iniciar, aparecerá el botón "Entrar al Aula".',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="courses"]',
    content:
      'Tus cursos activos aparecen aquí. Haz clic en cualquiera para ver el progreso y los materiales.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="quick-actions"]',
    content:
      'Estas son tus acciones rápidas: crear actividades, ver ganancias, editar horario y gestionar lecciones personalizadas.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-actividades"]',
    content:
      'En la sección de Actividades puedes crear ejercicios interactivos para tus estudiantes.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="nav-biblioteca"]',
    content: 'La Biblioteca contiene recursos educativos que puedes usar en tus clases.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-mis-ganancias"]',
    content: 'Consulta tus ganancias y el historial de pagos en esta sección.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="user-menu"]',
    content:
      '¡Listo! Desde aquí puedes acceder a tu perfil, configuración y cerrar sesión. ¡Buena suerte con tus clases!',
    placement: 'top',
    disableBeacon: true,
    disableScrolling: true,
  },
]

export const studentTourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    content: '¡Bienvenido a Lingowow! Esta es tu barra lateral donde encontrarás todas las secciones del campus.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content:
      'Este es tu Panel de Control. Aquí verás tu progreso, próximas clases y acciones rápidas.',
    placement: 'bottom',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="continue-learning"]',
    content:
      'Continúa tu aprendizaje desde donde lo dejaste. Haz clic para retomar tu lección actual.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="quick-actions"]',
    content: 'Accesos rápidos a tus cursos, actividades, horario y progreso.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="my-courses"]',
    content:
      'Aquí están todos tus cursos. Haz clic en cualquiera para ver las lecciones y materiales.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="daily-goal"]',
    content: 'Tu meta diaria y racha de estudio. ¡Mantén tu racha para ganar más puntos!',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="upcoming-classes"]',
    content:
      'Tus próximas clases en vivo aparecen aquí. Cuando sea hora, podrás unirte directamente.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-actividades"]',
    content: 'Practica con actividades interactivas para reforzar lo aprendido.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="nav-biblioteca"]',
    content: 'Accede a la biblioteca con recursos adicionales para tu aprendizaje.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="user-menu"]',
    content: '¡Excelente! Desde aquí puedes ver tu perfil y configuración. ¡Disfruta aprendiendo!',
    placement: 'top',
    disableBeacon: true,
    disableScrolling: true,
  },
]

export const guestTourSteps: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    content: '¡Bienvenido a Lingowow! Explora nuestra plataforma de aprendizaje de idiomas.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="hero-banner"]',
    content: 'Descubre nuestros cursos disponibles y las inscripciones abiertas.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="stats-cards"]',
    content:
      'Conoce nuestras estadísticas: idiomas disponibles, profesores certificados y clases de prueba gratuitas.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="popular-courses"]',
    content:
      'Explora nuestros cursos más populares. Haz clic en "Ver Detalles" para más información.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="webinars"]',
    content: 'Inscríbete en webinars gratuitos para conocer nuestra metodología.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="resources"]',
    content: 'Accede a recursos gratuitos: PDFs, audios y materiales de práctica.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-tienda"]',
    content: 'Visita nuestra tienda para ver todos los cursos y planes disponibles.',
    placement: 'right',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="cta-section"]',
    content: '¿Listo para comenzar? ¡Inscríbete en un curso y comienza tu viaje de aprendizaje!',
    placement: 'top',
    disableBeacon: true,
    disableScrolling: true,
  },
  {
    target: '[data-tour="user-menu"]',
    content: 'Desde aquí puedes acceder a tu perfil. ¡Esperamos verte pronto como estudiante!',
    placement: 'top',
    disableBeacon: true,
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
