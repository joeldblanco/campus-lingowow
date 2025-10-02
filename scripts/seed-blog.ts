import { PrismaClient, BlogStatus, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

const blogPosts = [
  {
    title: '5 técnicas efectivas para mejorar tu fluidez en un idioma extranjero',
    excerpt:
      'Descubre los métodos más efectivos que utilizan los políglotas para alcanzar una fluidez natural en tiempo récord.',
    content: {
      blocks: [
        {
          type: 'paragraph',
          content:
            'La fluidez en un idioma extranjero es el objetivo de muchos estudiantes, pero alcanzarla requiere más que solo memorizar vocabulario y gramática.',
        },
        {
          type: 'heading',
          level: 2,
          content: '1. Inmersión Total',
        },
        {
          type: 'paragraph',
          content:
            'Rodéate del idioma tanto como sea posible. Cambia el idioma de tu teléfono, ve películas sin subtítulos, y escucha podcasts en el idioma objetivo.',
        },
        {
          type: 'heading',
          level: 2,
          content: '2. Práctica de Shadowing',
        },
        {
          type: 'paragraph',
          content:
            'Repite en voz alta lo que escuchas de hablantes nativos, imitando su pronunciación, entonación y ritmo.',
        },
        {
          type: 'heading',
          level: 2,
          content: '3. Conversación Regular',
        },
        {
          type: 'paragraph',
          content:
            'Practica con hablantes nativos al menos 3 veces por semana. La práctica constante es clave para desarrollar fluidez.',
        },
        {
          type: 'heading',
          level: 2,
          content: '4. Lectura Extensiva',
        },
        {
          type: 'paragraph',
          content:
            'Lee materiales variados en el idioma objetivo: novelas, artículos, blogs. Esto expande tu vocabulario y mejora tu comprensión.',
        },
        {
          type: 'heading',
          level: 2,
          content: '5. Pensamiento en el Idioma',
        },
        {
          type: 'paragraph',
          content:
            'Intenta pensar directamente en el idioma objetivo sin traducir desde tu lengua materna. Esto acelera tu tiempo de respuesta.',
        },
      ],
    },
    category: 'Técnicas de Aprendizaje',
    tags: ['fluidez', 'técnicas', 'aprendizaje', 'práctica'],
    coverImage: '/api/placeholder/800/450',
  },
  {
    title: 'Cómo la música puede acelerar tu aprendizaje de idiomas',
    excerpt:
      'La música no es solo entretenimiento, es una poderosa herramienta para memorizar vocabulario y mejorar la pronunciación.',
    content: {
      blocks: [
        {
          type: 'paragraph',
          content:
            'La música es una de las herramientas más subestimadas en el aprendizaje de idiomas. Los estudios demuestran que puede mejorar significativamente la retención de vocabulario y la pronunciación.',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Beneficios de Aprender con Música',
        },
        {
          type: 'list',
          items: [
            'Mejora la memoria a largo plazo',
            'Ayuda con la pronunciación y entonación',
            'Hace el aprendizaje más divertido',
            'Expone a expresiones coloquiales',
            'Desarrolla el oído para el idioma',
          ],
        },
        {
          type: 'heading',
          level: 2,
          content: 'Cómo Usar la Música Efectivamente',
        },
        {
          type: 'paragraph',
          content:
            'Elige canciones con letra clara, busca las letras y traducciones, canta junto con la música, y analiza las estructuras gramaticales presentes en las canciones.',
        },
      ],
    },
    category: 'Recursos',
    tags: ['música', 'memoria', 'pronunciación'],
    coverImage: '/api/placeholder/800/450',
  },
  {
    title: 'El método de inmersión: ventajas y desventajas',
    excerpt:
      'Analizamos en profundidad cómo funciona el método de inmersión y si realmente es tan efectivo como dicen.',
    content: {
      blocks: [
        {
          type: 'paragraph',
          content:
            'El método de inmersión es ampliamente considerado como una de las formas más efectivas de aprender un idioma, pero ¿es realmente para todos?',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Ventajas del Método de Inmersión',
        },
        {
          type: 'list',
          items: [
            'Aprendizaje natural y contextual',
            'Desarrollo rápido de habilidades de comprensión',
            'Exposición a lenguaje auténtico',
            'Mejora significativa en la fluidez',
          ],
        },
        {
          type: 'heading',
          level: 2,
          content: 'Desventajas y Desafíos',
        },
        {
          type: 'list',
          items: [
            'Puede ser abrumador para principiantes',
            'Requiere mucho tiempo y dedicación',
            'No siempre es práctico o accesible',
            'Puede faltar estructura gramatical formal',
          ],
        },
      ],
    },
    category: 'Metodologías',
    tags: ['inmersión', 'metodología', 'aprendizaje'],
    coverImage: '/api/placeholder/800/450',
  },
  {
    title: 'Viajando mientras aprendes: consejos para practicar idiomas en el extranjero',
    excerpt:
      'Viajar es una de las mejores formas de practicar un idioma. Te contamos cómo aprovecharlo al máximo.',
    content: {
      blocks: [
        {
          type: 'paragraph',
          content:
            'Viajar al extranjero ofrece una oportunidad única para practicar un idioma en contextos reales y auténticos.',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Antes del Viaje',
        },
        {
          type: 'paragraph',
          content:
            'Aprende frases básicas de supervivencia, estudia la cultura local, y prepara un vocabulario específico para situaciones comunes.',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Durante el Viaje',
        },
        {
          type: 'list',
          items: [
            'Habla con locales en cada oportunidad',
            'Evita grupos de turistas de tu idioma',
            'Toma notas de nuevas palabras y expresiones',
            'Participa en tours y actividades locales',
            'Usa aplicaciones de intercambio de idiomas',
          ],
        },
      ],
    },
    category: 'Viajes y Cultura',
    tags: ['viajes', 'práctica', 'cultura'],
    coverImage: '/api/placeholder/800/450',
  },
  {
    title: 'Los errores más comunes al aprender inglés y cómo evitarlos',
    excerpt:
      'Conociendo estos errores frecuentes al aprender inglés podrás avanzar más rápido y mejorar tu fluidez.',
    content: {
      blocks: [
        {
          type: 'paragraph',
          content:
            'Todos cometemos errores al aprender un idioma, pero conocer los más comunes puede ayudarte a evitarlos.',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Errores Comunes',
        },
        {
          type: 'list',
          items: [
            'Traducir literalmente desde tu idioma nativo',
            'Enfocarse solo en gramática y olvidar la práctica oral',
            'No practicar la escucha activa',
            'Tener miedo de cometer errores al hablar',
            'No revisar y repasar lo aprendido',
          ],
        },
        {
          type: 'heading',
          level: 2,
          content: 'Cómo Evitarlos',
        },
        {
          type: 'paragraph',
          content:
            'Practica pensando directamente en inglés, equilibra el estudio de gramática con práctica conversacional, escucha contenido auténtico diariamente, y no tengas miedo de cometer errores.',
        },
      ],
    },
    category: 'Errores Comunes',
    tags: ['inglés', 'errores', 'gramática'],
    coverImage: '/api/placeholder/800/450',
  },
  {
    title: 'Beneficios cognitivos del bilingüismo: lo que dice la ciencia',
    excerpt:
      'Estudios recientes confirman que hablar más de un idioma aporta importantes beneficios para nuestro cerebro.',
    content: {
      blocks: [
        {
          type: 'paragraph',
          content:
            'La investigación científica ha demostrado que el bilingüismo tiene efectos profundos y positivos en el cerebro humano.',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Beneficios Comprobados',
        },
        {
          type: 'list',
          items: [
            'Mejora de la función ejecutiva',
            'Mayor capacidad de multitarea',
            'Retraso en el deterioro cognitivo',
            'Mejor memoria de trabajo',
            'Mayor creatividad y flexibilidad mental',
          ],
        },
        {
          type: 'heading',
          level: 2,
          content: 'Impacto a Largo Plazo',
        },
        {
          type: 'paragraph',
          content:
            'Los estudios muestran que las personas bilingües tienen un retraso promedio de 4-5 años en la aparición de síntomas de demencia comparado con monolingües.',
        },
      ],
    },
    category: 'Ciencia y Aprendizaje',
    tags: ['bilingüismo', 'ciencia', 'beneficios', 'cerebro'],
    coverImage: '/api/placeholder/800/450',
  },
]

async function main() {
  console.log('🌱 Iniciando seed de blog posts...')

  // Buscar o crear un usuario EDITOR para ser el autor
  let editor = await prisma.user.findFirst({
    where: {
      roles: {
        has: UserRole.EDITOR,
      },
    },
  })

  // Si no existe un editor, buscar un admin
  if (!editor) {
    editor = await prisma.user.findFirst({
      where: {
        roles: {
          has: UserRole.ADMIN,
        },
      },
    })
  }

  // Si no existe ninguno, crear un usuario editor de ejemplo
  if (!editor) {
    console.log('📝 Creando usuario editor de ejemplo...')
    editor = await prisma.user.create({
      data: {
        name: 'Editor',
        lastName: 'Blog',
        email: 'editor@lingowow.com',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1u', // password123
        roles: [UserRole.EDITOR],
        status: 'ACTIVE',
        bio: 'Editor del blog de Lingowow',
      },
    })
    console.log('✅ Usuario editor creado')
  }

  console.log(`📚 Usando autor: ${editor.name} ${editor.lastName} (${editor.email})`)

  // Crear los blog posts
  for (const post of blogPosts) {
    const slug = post.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    // Verificar si ya existe
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
    })

    if (existing) {
      console.log(`⏭️  Post ya existe: ${post.title}`)
      continue
    }

    // Calcular tiempo de lectura
    const wordCount = JSON.stringify(post.content).split(/\s+/).length
    const readTime = Math.ceil(wordCount / 200)

    await prisma.blogPost.create({
      data: {
        title: post.title,
        slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        category: post.category,
        tags: post.tags,
        status: BlogStatus.PUBLISHED,
        authorId: editor.id,
        readTime,
        publishedAt: new Date(),
        metaTitle: post.title,
        metaDescription: post.excerpt,
      },
    })

    console.log(`✅ Creado: ${post.title}`)
  }

  console.log('🎉 Seed de blog posts completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
