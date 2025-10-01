import { PrismaClient, ActivityType, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function seedActivities() {
  console.log('🌱 Seeding test activities...')

  try {
    // First, ensure we have a system user to assign as creator
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@campus-lingowow.com' },
    })

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          name: 'System',
          lastName: 'Admin',
          email: 'system@campus-lingowow.com',
          roles: [UserRole.ADMIN],
        },
      })
    }

    // Create test activities for different levels
    const activities = [
      {
        title: 'Basic Greetings',
        description: 'Learn basic greeting phrases',
        activityType: ActivityType.MULTIPLE_CHOICE,
        level: 1,
        points: 10,
        duration: 5, // 5 minutes
        activityData: {
          type: 'MULTIPLE_CHOICE',
          questions: [
            {
              question: 'How do you say "Hello" in English?',
              options: ['Hola', 'Hello', 'Bonjour', 'Ciao'],
              correctAnswer: 1,
            },
          ],
        },
        steps: {
          instruction: 'Choose the correct answer',
          questions: [
            {
              question: 'How do you say "Hello" in English?',
              options: ['Hola', 'Hello', 'Bonjour', 'Ciao'],
              correctAnswer: 1,
            },
          ],
        },
        questions: [
          {
            question: 'How do you say "Hello" in English?',
            options: ['Hola', 'Hello', 'Bonjour', 'Ciao'],
            correctAnswer: 1,
          },
        ],
        timeLimit: 300, // 5 minutes in seconds
        createdById: systemUser.id,
        isPublished: true,
      },
      {
        title: 'Numbers 1-10',
        description: 'Learn numbers from 1 to 10',
        activityType: ActivityType.LISTENING,
        level: 1,
        points: 15,
        duration: 10, // 10 minutes
        activityData: {
          type: 'LISTENING',
          audioUrl: '/audio/numbers-1-10.mp3',
          questions: [
            {
              question: 'What number did you hear?',
              options: ['One', 'Two', 'Three', 'Four'],
              correctAnswer: 0,
            },
          ],
        },
        steps: {
          instruction: 'Listen to the audio and answer the question',
          audioUrl: '/audio/numbers-1-10.mp3',
          questions: [
            {
              question: 'What number did you hear?',
              options: ['One', 'Two', 'Three', 'Four'],
              correctAnswer: 0,
            },
          ],
        },
        questions: [
          {
            question: 'What number did you hear?',
            options: ['One', 'Two', 'Three', 'Four'],
            correctAnswer: 0,
          },
        ],
        timeLimit: 600, // 10 minutes in seconds
        createdById: systemUser.id,
        isPublished: true,
      },
      {
        title: 'Present Tense Verbs',
        description: 'Practice present tense verb conjugation',
        activityType: ActivityType.FILL_IN_BLANK,
        level: 2,
        points: 20,
        duration: 15, // 15 minutes
        activityData: {
          type: 'FILL_IN_BLANK',
          sentences: [
            {
              text: 'I ___ to school every day.',
              correctAnswer: 'go',
              options: ['go', 'goes', 'going', 'went'],
            },
          ],
        },
        steps: {
          instruction: 'Fill in the blanks with the correct verb form',
          sentences: [
            {
              text: 'I ___ to school every day.',
              correctAnswer: 'go',
              options: ['go', 'goes', 'going', 'went'],
            },
          ],
        },
        questions: [
          {
            sentence: 'I ___ to school every day.',
            correctAnswer: 'go',
            options: ['go', 'goes', 'going', 'went'],
          },
        ],
        timeLimit: 900, // 15 minutes in seconds
        createdById: systemUser.id,
        isPublished: true,
      },
    ]

    // Clear existing activities first (optional)
    await prisma.activity.deleteMany({})

    for (const activity of activities) {
      await prisma.activity.create({
        data: activity,
      })
    }

    console.log('✅ Test activities seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding activities:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedActivities().catch((error) => {
  console.error(error)
  process.exit(1)
})
