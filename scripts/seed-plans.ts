import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding plans and features...')

  // Crear características comunes
  const features = await Promise.all([
    prisma.feature.upsert({
      where: { id: 'feature-1' },
      update: {},
      create: {
        id: 'feature-1',
        name: 'Materiales incluidos',
        description: 'Acceso a todos los materiales de estudio',
        icon: '📚',
        isActive: true,
      },
    }),
    prisma.feature.upsert({
      where: { id: 'feature-2' },
      update: {},
      create: {
        id: 'feature-2',
        name: 'Plataforma online',
        description: 'Acceso 24/7 a la plataforma de aprendizaje',
        icon: '💻',
        isActive: true,
      },
    }),
    prisma.feature.upsert({
      where: { id: 'feature-3' },
      update: {},
      create: {
        id: 'feature-3',
        name: 'Certificado de finalización',
        description: 'Certificado al completar el curso',
        icon: '🎓',
        isActive: true,
      },
    }),
    prisma.feature.upsert({
      where: { id: 'feature-4' },
      update: {},
      create: {
        id: 'feature-4',
        name: 'Soporte prioritario',
        description: 'Atención prioritaria de nuestro equipo',
        icon: '⚡',
        isActive: true,
      },
    }),
    prisma.feature.upsert({
      where: { id: 'feature-5' },
      update: {},
      create: {
        id: 'feature-5',
        name: 'Clases de conversación',
        description: 'Sesiones grupales de práctica',
        icon: '💬',
        isActive: true,
      },
    }),
    prisma.feature.upsert({
      where: { id: 'feature-6' },
      update: {},
      create: {
        id: 'feature-6',
        name: 'Tutorías personalizadas',
        description: 'Sesiones 1-a-1 con tu profesor',
        icon: '👨‍🏫',
        isActive: true,
      },
    }),
  ])

  console.log(`✅ Created ${features.length} features`)

  // Buscar un curso de ejemplo (o crear uno si no existe)
  let course = await prisma.course.findFirst({
    where: { language: 'Inglés' },
  })

  if (!course) {
    // Buscar un usuario admin para asignar como creador
    const admin = await prisma.user.findFirst({
      where: { roles: { has: 'ADMIN' } },
    })

    if (admin) {
      course = await prisma.course.create({
        data: {
          title: 'Inglés General',
          description: 'Curso completo de inglés desde nivel básico hasta avanzado',
          language: 'Inglés',
          level: 'A1-C2',
          isPublished: true,
          createdById: admin.id,
        },
      })
      console.log('✅ Created sample course')
    }
  }

  // Crear planes
  const planBasico = await prisma.plan.upsert({
    where: { slug: 'plan-basico' },
    update: {},
    create: {
      name: 'Plan Básico',
      slug: 'plan-basico',
      description: 'Perfecto para comenzar tu aprendizaje de inglés',
      price: 99.99,
      comparePrice: 129.99,
      duration: 30,
      isActive: true,
      isPopular: false,
      sortOrder: 1,
      includesClasses: true,
      classesPerPeriod: 8,
      classesPerWeek: 2,
      allowProration: true,
      autoRenewal: true,
      billingCycle: 'MONTHLY',
      courseId: course?.id,
    },
  })

  const planEstandar = await prisma.plan.upsert({
    where: { slug: 'plan-estandar' },
    update: {},
    create: {
      name: 'Plan Estándar',
      slug: 'plan-estandar',
      description: 'El equilibrio perfecto entre clases y precio',
      price: 149.99,
      comparePrice: 189.99,
      duration: 30,
      isActive: true,
      isPopular: true,
      sortOrder: 2,
      includesClasses: true,
      classesPerPeriod: 12,
      classesPerWeek: 3,
      allowProration: true,
      autoRenewal: true,
      billingCycle: 'MONTHLY',
      courseId: course?.id,
    },
  })

  const planPremium = await prisma.plan.upsert({
    where: { slug: 'plan-premium' },
    update: {},
    create: {
      name: 'Plan Premium',
      slug: 'plan-premium',
      description: 'Máximo progreso con clases intensivas y soporte prioritario',
      price: 249.99,
      comparePrice: 319.99,
      duration: 30,
      isActive: true,
      isPopular: false,
      sortOrder: 3,
      includesClasses: true,
      classesPerPeriod: 20,
      classesPerWeek: 5,
      allowProration: true,
      autoRenewal: true,
      billingCycle: 'MONTHLY',
      courseId: course?.id,
    },
  })

  console.log('✅ Created 3 plans')

  // Asignar características a planes
  // Plan Básico: características básicas
  await prisma.planFeature.upsert({
    where: {
      planId_featureId: {
        planId: planBasico.id,
        featureId: features[0].id, // Materiales incluidos
      },
    },
    update: {},
    create: {
      planId: planBasico.id,
      featureId: features[0].id,
      included: true,
    },
  })

  await prisma.planFeature.upsert({
    where: {
      planId_featureId: {
        planId: planBasico.id,
        featureId: features[1].id, // Plataforma online
      },
    },
    update: {},
    create: {
      planId: planBasico.id,
      featureId: features[1].id,
      included: true,
    },
  })

  await prisma.planFeature.upsert({
    where: {
      planId_featureId: {
        planId: planBasico.id,
        featureId: features[2].id, // Certificado
      },
    },
    update: {},
    create: {
      planId: planBasico.id,
      featureId: features[2].id,
      included: true,
    },
  })

  // Plan Estándar: todas las básicas + conversación
  for (let i = 0; i < 5; i++) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: planEstandar.id,
          featureId: features[i].id,
        },
      },
      update: {},
      create: {
        planId: planEstandar.id,
        featureId: features[i].id,
        included: true,
      },
    })
  }

  // Plan Premium: todas las características
  for (const feature of features) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: planPremium.id,
          featureId: feature.id,
        },
      },
      update: {},
      create: {
        planId: planPremium.id,
        featureId: feature.id,
        included: true,
      },
    })
  }

  console.log('✅ Assigned features to plans')

  console.log('\n🎉 Seeding completed successfully!')
  console.log('\nPlanes creados:')
  console.log(`- ${planBasico.name}: $${planBasico.price}/mes (${planBasico.classesPerPeriod} clases)`)
  console.log(`- ${planEstandar.name}: $${planEstandar.price}/mes (${planEstandar.classesPerPeriod} clases)`)
  console.log(`- ${planPremium.name}: $${planPremium.price}/mes (${planPremium.classesPerPeriod} clases)`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
