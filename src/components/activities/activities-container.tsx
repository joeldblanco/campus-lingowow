'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import LearningPathMap from '@/components/activities/learning-path-map'
import UserProgress from '@/components/activities/user-progress'
import ActivityCard from '@/components/activities/activity-card'
import ActivityPlayer from '@/components/activities/activity-player'
import RewardModal from '@/components/activities/reward-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getActivitiesByLevel, getUserProgress, updateActivityProgress, getActivityForPlayer, getUserWeeklyActivity, getActivitiesSummaryByLevels } from '@/lib/actions/activity'

interface ActivityStep {
  type: 'instruction' | 'question' | 'audio' | 'recording' | 'completion'
  content: string
  options?: string[]
  correctAnswer?: number
  hint?: string
  audioUrl?: string
  transcript?: string
  expectedTranscript?: string
}

type Activity = {
  id: string
  title: string
  type: 'reading' | 'listening' | 'speaking' | 'writing' | 'vocabulary'
  points: number
  duration: number // en minutos
  level: number
  completed: boolean
  locked: boolean
}

interface WeeklyActivity {
  date: Date
  hasActivity: boolean
  isToday: boolean
}

export default function ActivitiesContainer() {
  const { data: session } = useSession()
  const [userProgress, setUserProgress] = useState({
    currentLevel: 1,
    streak: 0,
    experience: 0,
    currentLevelXP: 0,
    nextLevelXP: 100,
    xpToNextLevel: 100,
  })
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
  const [levelsSummary, setLevelsSummary] = useState<Array<{
    level: number
    totalActivities: number
    completedActivities: number
    levelName: string
    hasActivities: boolean
    isComplete: boolean
    progress: number
  }>>([])
  const [showReward, setShowReward] = useState(false)
  const [lastReward, setLastReward] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentActivity, setCurrentActivity] = useState<{
    id: string
    title: string
    description: string
    steps: { steps: ActivityStep[] }
    points: number
    isReview?: boolean
  } | null>(null)
  const [showActivityPlayer, setShowActivityPlayer] = useState(false)

  // Cargar datos del usuario y actividades
  useEffect(() => {
    async function loadData() {
      if (!session?.user?.id) return

      try {
        setLoading(true)
        
        // Cargar progreso del usuario
        const progress = await getUserProgress(session.user.id)
        setUserProgress(progress)

        // Cargar actividad semanal
        const weeklyData = await getUserWeeklyActivity(session.user.id)
        setWeeklyActivity(weeklyData)

        // Cargar resumen de niveles para el mapa de aprendizaje
        const levelsData = await getActivitiesSummaryByLevels(session.user.id, 10)
        setLevelsSummary(levelsData)

        // Cargar actividades para el nivel actual
        const levelActivities = await getActivitiesByLevel(progress.currentLevel, session.user.id)
        setActivities(levelActivities)
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.id])

  // Cargar actividades cuando cambia el nivel
  useEffect(() => {
    async function loadActivitiesForLevel() {
      if (!session?.user?.id) return

      try {
        const levelActivities = await getActivitiesByLevel(userProgress.currentLevel, session.user.id)
        setActivities(levelActivities)
      } catch (error) {
        console.error('Error cargando actividades:', error)
      }
    }

    if (userProgress.currentLevel > 0) {
      loadActivitiesForLevel()
    }
  }, [userProgress.currentLevel, session?.user?.id])

  const handleStartActivity = async (id: string, isReview = false) => {
    if (!session?.user?.id) return

    try {
      // Cargar datos completos de la actividad
      const activityData = await getActivityForPlayer(id)
      
      // Si es una revisión, modificar los puntos
      if (isReview) {
        activityData.points = 5
      }
      
      setCurrentActivity({ ...activityData, isReview })
      setShowActivityPlayer(true)
      
      // Solo marcar como iniciada si no es una revisión
      if (!isReview) {
        await updateActivityProgress(session.user.id, id, 'IN_PROGRESS')
      }
    } catch (error) {
      console.error('Error iniciando actividad:', error)
    }
  }

  const handleReviewActivity = async (id: string) => {
    await handleStartActivity(id, true)
  }

  const handleActivityComplete = async (score: number) => {
    if (!session?.user?.id || !currentActivity) return

    const passed = score >= 60
    const isReview = currentActivity.isReview

    try {
      if (passed) {
        // Solo actualizar progreso en DB si no es una revisión
        if (!isReview) {
          await updateActivityProgress(session.user.id, currentActivity.id, 'COMPLETED', score)

          // Actualizar estado local
          setActivities((prev) =>
            prev.map((activity) => 
              activity.id === currentActivity.id ? { ...activity, completed: true } : activity
            )
          )
        }

        // Actualizar experiencia local solo si pasó
        const newExperience = userProgress.experience + currentActivity.points
        const newLevel = Math.floor(newExperience / 100) + 1
        
        setUserProgress(prev => ({
          ...prev,
          experience: newExperience,
          currentLevel: newLevel,
        }))

        // Verificar si todas las actividades están completadas para desbloquear siguiente nivel (solo para actividades nuevas)
        if (!isReview) {
          const allCompleted = activities.every((activity) =>
            activity.id === currentActivity.id ? true : activity.completed
          )

          if (allCompleted && newLevel > userProgress.currentLevel) {
            setTimeout(() => {
              setLastReward('¡Nuevo nivel desbloqueado!')
              setShowReward(true)
            }, 1000)
          } else {
            setLastReward(`¡Excelente! Ganaste ${currentActivity.points} puntos de experiencia (${score}%)`)
            setShowReward(true)
          }
        } else {
          // Mensaje especial para revisiones
          setLastReward(`¡Bien hecho! Revisión completada. Ganaste ${currentActivity.points} XP (${score}%)`)
          setShowReward(true)
        }
      } else {
        // Si no pasó, no mostrar modal de recompensa
        // El mensaje ya se muestra en la pantalla de completion del ActivityPlayer
      }

      // Cerrar el player
      setShowActivityPlayer(false)
      setCurrentActivity(null)
    } catch (error) {
      console.error('Error completando actividad:', error)
    }
  }

  const handleCloseActivityPlayer = () => {
    setShowActivityPlayer(false)
    setCurrentActivity(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando actividades...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="text-center py-8">
        <p>Debes iniciar sesión para ver las actividades.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UserProgress
        level={userProgress.currentLevel}
        streak={userProgress.streak}
        experience={userProgress.experience}
        currentLevelXP={userProgress.currentLevelXP}
        xpToNextLevel={userProgress.xpToNextLevel}
        weeklyActivity={weeklyActivity}
      />

      <LearningPathMap 
        currentLevel={userProgress.currentLevel} 
        maxLevel={10} 
        levelsSummary={levelsSummary}
      />

      <Tabs defaultValue="todos">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="reading">Lectura</TabsTrigger>
          <TabsTrigger value="listening">Escucha</TabsTrigger>
          <TabsTrigger value="speaking">Habla</TabsTrigger>
          <TabsTrigger value="writing">Escritura</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onComplete={() => handleStartActivity(activity.id)}
                onReview={() => handleReviewActivity(activity.id)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p>No hay actividades disponibles para este nivel.</p>
            </div>
          )}
        </TabsContent>

        {['reading', 'listening', 'speaking', 'writing'].map((tab) => {
          const filteredActivities = activities.filter((activity) => activity.type === tab)
          
          return (
            <TabsContent
              key={tab}
              value={tab}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onComplete={() => handleStartActivity(activity.id)}
                    onReview={() => handleReviewActivity(activity.id)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p>No hay actividades de {tab === 'reading' ? 'lectura' : tab === 'listening' ? 'escucha' : tab === 'speaking' ? 'habla' : 'escritura'} disponibles para este nivel.</p>
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {showReward && (
        <RewardModal reward={lastReward} onClose={() => setShowReward(false)} open={showReward} />
      )}

      {showActivityPlayer && currentActivity && (
        <ActivityPlayer
          activity={currentActivity}
          onComplete={handleActivityComplete}
          onClose={handleCloseActivityPlayer}
        />
      )}
    </div>
  )
}
