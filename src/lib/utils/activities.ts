// Obtener el día actual de la semana (0 = Lunes, 6 = Domingo)
export function getCurrentDay() {
  const today = new Date()
  // getDay() en JS: 0 = Domingo, 6 = Sábado
  // Convertir al formato que necesitamos (0 = Lunes, 6 = Domingo)
  return (today.getDay() + 6) % 7
}

// Generar actividades para un nivel específico
export function getActivitiesForLevel(level: number) {
  // Datos ficticios para demostración
  const levelActivities = [
    // Nivel 1
    [
      {
        id: '1-1',
        title: 'Saludos y presentaciones',
        type: 'speaking' as const,
        points: 20,
        duration: 5,
        level: 1,
        completed: false,
        locked: false,
      },
      {
        id: '1-2',
        title: 'Vocabulario básico',
        type: 'vocabulary' as const,
        points: 15,
        duration: 8,
        level: 1,
        completed: false,
        locked: false,
      },
      {
        id: '1-3',
        title: 'Frases útiles',
        type: 'reading' as const,
        points: 10,
        duration: 7,
        level: 1,
        completed: false,
        locked: false,
      },
      {
        id: '1-4',
        title: 'Comprensión auditiva inicial',
        type: 'listening' as const,
        points: 25,
        duration: 10,
        level: 1,
        completed: false,
        locked: false,
      },
      {
        id: '1-5',
        title: 'Escribe tu primera nota',
        type: 'writing' as const,
        points: 30,
        duration: 15,
        level: 1,
        completed: false,
        locked: false,
      },
    ],

    // Nivel 2
    [
      {
        id: '2-1',
        title: 'Conversaciones cotidianas',
        type: 'speaking' as const,
        points: 25,
        duration: 8,
        level: 2,
        completed: false,
        locked: false,
      },
      {
        id: '2-2',
        title: 'Vocabulario de la ciudad',
        type: 'vocabulary' as const,
        points: 20,
        duration: 10,
        level: 2,
        completed: false,
        locked: false,
      },
      {
        id: '2-3',
        title: 'Lectura de un texto simple',
        type: 'reading' as const,
        points: 15,
        duration: 12,
        level: 2,
        completed: false,
        locked: false,
      },
      {
        id: '2-4',
        title: 'Comprensión de diálogos',
        type: 'listening' as const,
        points: 30,
        duration: 15,
        level: 2,
        completed: false,
        locked: false,
      },
      {
        id: '2-5',
        title: 'Escribe sobre tu día',
        type: 'writing' as const,
        points: 35,
        duration: 20,
        level: 2,
        completed: false,
        locked: false,
      },
    ],

    // Nivel 3
    [
      {
        id: '3-1',
        title: 'Conversación en restaurantes',
        type: 'speaking' as const,
        points: 30,
        duration: 10,
        level: 3,
        completed: false,
        locked: false,
      },
      {
        id: '3-2',
        title: 'Vocabulario de comidas',
        type: 'vocabulary' as const,
        points: 25,
        duration: 12,
        level: 3,
        completed: false,
        locked: false,
      },
      {
        id: '3-3',
        title: 'Lectura de un menú',
        type: 'reading' as const,
        points: 20,
        duration: 15,
        level: 3,
        completed: false,
        locked: false,
      },
      {
        id: '3-4',
        title: 'Comprender conversaciones en restaurantes',
        type: 'listening' as const,
        points: 35,
        duration: 18,
        level: 3,
        completed: false,
        locked: false,
      },
      {
        id: '3-5',
        title: 'Escribir una reseña de restaurante',
        type: 'writing' as const,
        points: 40,
        duration: 25,
        level: 3,
        completed: false,
        locked: false,
      },
    ],

    // Nivel 4
    [
      {
        id: '4-1',
        title: 'Expresar opiniones',
        type: 'speaking' as const,
        points: 35,
        duration: 12,
        level: 4,
        completed: false,
        locked: false,
      },
      {
        id: '4-2',
        title: 'Vocabulario de viajes',
        type: 'vocabulary' as const,
        points: 30,
        duration: 15,
        level: 4,
        completed: false,
        locked: false,
      },
      {
        id: '4-3',
        title: 'Lectura de artículos sencillos',
        type: 'reading' as const,
        points: 25,
        duration: 20,
        level: 4,
        completed: false,
        locked: false,
      },
      {
        id: '4-4',
        title: 'Comprender anuncios y avisos',
        type: 'listening' as const,
        points: 40,
        duration: 22,
        level: 4,
        completed: false,
        locked: false,
      },
      {
        id: '4-5',
        title: 'Escribir un correo formal',
        type: 'writing' as const,
        points: 45,
        duration: 30,
        level: 4,
        completed: false,
        locked: false,
      },
    ],

    // Nivel 5
    [
      {
        id: '5-1',
        title: 'Debate sobre temas actuales',
        type: 'speaking' as const,
        points: 40,
        duration: 15,
        level: 5,
        completed: false,
        locked: false,
      },
      {
        id: '5-2',
        title: 'Vocabulario de negocios',
        type: 'vocabulary' as const,
        points: 35,
        duration: 18,
        level: 5,
        completed: false,
        locked: false,
      },
      {
        id: '5-3',
        title: 'Lectura de textos profesionales',
        type: 'reading' as const,
        points: 30,
        duration: 25,
        level: 5,
        completed: false,
        locked: false,
      },
      {
        id: '5-4',
        title: 'Comprender presentaciones',
        type: 'listening' as const,
        points: 45,
        duration: 25,
        level: 5,
        completed: false,
        locked: false,
      },
      {
        id: '5-5',
        title: 'Escribir un informe',
        type: 'writing' as const,
        points: 50,
        duration: 35,
        level: 5,
        completed: false,
        locked: false,
      },
    ],
  ]

  // Asegurarse de que level está dentro del rango disponible
  const safeLevel = Math.min(Math.max(1, level), levelActivities.length)

  // Retornar actividades para el nivel solicitado
  return levelActivities[safeLevel - 1]
}
