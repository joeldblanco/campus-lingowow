import { Course } from '@/types/shop'

// Sample data
export const courses: Course[] = [
  {
    id: 'spanish-101',
    title: 'Español para principiantes',
    description:
      'Aprende los fundamentos del español con nuestro completo curso para principiantes.',
    levels: ['Principiante', 'Intermedio', 'Avanzado'],
    language: 'Español',
    category: 'Idioma',
    image: '/media/images/sagrada_familia-min.png?height=200&width=300',
    plans: [
      {
        id: 'spanish-101-basic',
        name: 'Básico',
        price: 49.99,
        features: [
          'Acceso por 3 meses',
          '10 lecciones',
          'Ejercicios básicos',
          'Soporte por correo electrónico',
        ],
      },
      {
        id: 'spanish-101-standard',
        name: 'Estándar',
        price: 89.99,
        features: [
          'Acceso por 6 meses',
          '20 lecciones',
          'Ejercicios interactivos',
          'Soporte por correo electrónico y chat',
          '1 sesión en vivo por mes',
        ],
      },
      {
        id: 'spanish-101-premium',
        name: 'Premium',
        price: 149.99,
        features: [
          'Acceso por 12 meses',
          'Todas las lecciones',
          'Ejercicios avanzados',
          'Soporte prioritario',
          '4 sesiones en vivo por mes',
          'Certificado de finalización',
        ],
      },
    ],
  },
  {
    id: 'french-101',
    title: 'Francés Esencial',
    description: 'Domina los fundamentos del idioma y la cultura francesa.',
    levels: ['Principiante'],
    language: 'Francés',
    category: 'Idioma',
    image: '/media/images/eiffel_tower-min.png?height=200&width=300',
    plans: [
      {
        id: 'french-101-basic',
        name: 'Básico',
        price: 49.99,
        features: [
          'Acceso por 3 meses',
          '10 lecciones',
          'Ejercicios básicos',
          'Soporte por correo electrónico',
        ],
      },
      {
        id: 'french-101-standard',
        name: 'Estándar',
        price: 89.99,
        features: [
          'Acceso por 6 meses',
          '20 lecciones',
          'Ejercicios interactivos',
          'Soporte por correo electrónico y chat',
          '1 sesión en vivo por mes',
        ],
      },
      {
        id: 'french-101-premium',
        name: 'Premium',
        price: 149.99,
        features: [
          'Acceso por 12 meses',
          'Todas las lecciones',
          'Ejercicios avanzados',
          'Soporte prioritario',
          '4 sesiones en vivo por mes',
          'Certificado de finalización',
        ],
      },
    ],
  },
  {
    id: 'german-101',
    title: 'Fundamentos de Alemán',
    description: 'Construye una base sólida en habilidades del idioma alemán.',
    levels: ['Avanzado'],
    language: 'Alemán',
    category: 'Idioma',
    image: '/media/images/brandenburg_gate-min.png?height=200&width=300',
    plans: [
      {
        id: 'german-101-basic',
        name: 'Básico',
        price: 49.99,
        features: [
          'Acceso por 3 meses',
          '10 lecciones',
          'Ejercicios básicos',
          'Soporte por correo electrónico',
        ],
      },
      {
        id: 'german-101-standard',
        name: 'Estándar',
        price: 89.99,
        features: [
          'Acceso por 6 meses',
          '20 lecciones',
          'Ejercicios interactivos',
          'Soporte por correo electrónico y chat',
          '1 sesión en vivo por mes',
        ],
      },
      {
        id: 'german-101-premium',
        name: 'Premium',
        price: 149.99,
        features: [
          'Acceso por 12 meses',
          'Todas las lecciones',
          'Ejercicios avanzados',
          'Soporte prioritario',
          '4 sesiones en vivo por mes',
          'Certificado de finalización',
        ],
      },
    ],
  },
  {
    id: 'english-101',
    title: 'Fundamentos de Inglés',
    description: 'Aprende los fundamentos del idioma inglés y sus sistemas de escritura.',
    levels: ['Principiante', 'Intermedio', 'Avanzado'],
    language: 'Inglés',
    category: 'Idioma',
    image: '/media/images/statue_of_liberty-min.png?height=200&width=300',
    plans: [
      {
        id: 'english-101-basic',
        name: 'Básico',
        price: 59.99,
        features: [
          'Acceso por 3 meses',
          '10 lecciones',
          'Ejercicios básicos',
          'Soporte por correo electrónico',
        ],
      },
      {
        id: 'english-101-standard',
        name: 'Estándar',
        price: 99.99,
        features: [
          'Acceso por 6 meses',
          '20 lecciones',
          'Ejercicios interactivos',
          'Soporte por correo electrónico y chat',
          '1 sesión en vivo por mes',
        ],
      },
      {
        id: 'english-101-premium',
        name: 'Premium',
        price: 169.99,
        features: [
          'Acceso por 12 meses',
          'Todas las lecciones',
          'Ejercicios avanzados',
          'Soporte prioritario',
          '4 sesiones en vivo por mes',
          'Certificado de finalización',
        ],
      },
    ],
  },
]
