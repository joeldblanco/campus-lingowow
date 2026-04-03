import { db } from './src/lib/db'
import { assignLanguageCoursesToTeacher } from './src/lib/actions/teacher-courses'

async function runBenchmark() {
  console.log('Starting benchmark...')

  // Create a fake teacher
  const teacher = await db.user.create({
    data: {
      email: 'teacher.bench@example.com',
      name: 'Bench',
      lastName: 'Teacher',
      roles: ['TEACHER'],
    }
  })

  // Create fake courses
  const language = 'BENCH_LANG'
  const courseIds = []
  for (let i = 0; i < 50; i++) {
    const course = await db.course.create({
      data: {
        title: `Bench Course ${i}`,
        description: 'Bench course desc',
        language: language,
        level: 'BEGINNER',
        isPublished: true,
        createdBy: { connect: { id: teacher.id } },
      }
    })
    courseIds.push(course.id)
  }

  console.log('Created test data.')

  // Measure time
  const start = performance.now()
  await assignLanguageCoursesToTeacher(teacher.id, language)
  const end = performance.now()

  console.log(`Execution time: ${(end - start).toFixed(2)} ms`)

  // Cleanup
  await db.teacherCourse.deleteMany({ where: { teacherId: teacher.id } })
  await db.course.deleteMany({ where: { language: language } })
  await db.user.delete({ where: { id: teacher.id } })

  console.log('Cleanup done.')
}

runBenchmark().catch(console.error)
