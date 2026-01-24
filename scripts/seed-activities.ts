import { PrismaClient, ActivityType, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface ActivitySeedData {
  id: string
  title: string
  description: string
  activityType: string
  level: number
  points: number
  duration: number
  timeLimit: number
  isPublished: boolean
  createdById: string
  steps: Prisma.InputJsonValue
  activityData: Prisma.InputJsonValue
}

async function seedActivities() {
  console.log('🌱 Seeding activities from JSON file...')

  try {
    // Read the JSON file
    const jsonPath = path.join(__dirname, 'activities-seed.json')
    const jsonData = fs.readFileSync(jsonPath, 'utf-8')
    const activities: ActivitySeedData[] = JSON.parse(jsonData)

    console.log(`📄 Found ${activities.length} activities to seed`)

    // Verify the creator user exists
    const creatorId = activities[0]?.createdById
    if (creatorId) {
      const user = await prisma.user.findUnique({
        where: { id: creatorId },
      })
      if (!user) {
        console.error(`❌ Creator user with ID ${creatorId} not found!`)
        console.log('Please ensure the user exists before running this seed.')
        process.exit(1)
      }
      console.log(`✅ Creator user found: ${user.name} ${user.lastName || ''}`)
    }

    // Delete existing activities (optional - comment out if you want to keep existing)
    const existingCount = await prisma.activity.count()
    if (existingCount > 0) {
      console.log(`🗑️  Deleting ${existingCount} existing activities...`)
      await prisma.activity.deleteMany({})
    }

    // Insert activities
    let successCount = 0
    let errorCount = 0

    for (const activity of activities) {
      try {
        await prisma.activity.create({
          data: {
            id: activity.id,
            title: activity.title,
            description: activity.description,
            activityType: activity.activityType as ActivityType,
            level: activity.level,
            points: activity.points,
            duration: activity.duration,
            timeLimit: activity.timeLimit,
            isPublished: activity.isPublished,
            createdById: activity.createdById,
            steps: activity.steps,
            activityData: activity.activityData,
          },
        })
        successCount++
        console.log(`  ✅ Created: ${activity.title}`)
      } catch (error) {
        errorCount++
        console.error(`  ❌ Failed: ${activity.title}`, error)
      }
    }

    console.log('\n📊 Seed Summary:')
    console.log(`  ✅ Successfully created: ${successCount}`)
    console.log(`  ❌ Failed: ${errorCount}`)
    console.log(`  📝 Total: ${activities.length}`)

  } catch (error) {
    console.error('❌ Error seeding activities:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedActivities().catch((error) => {
  console.error(error)
  process.exit(1)
})
