'use client'

import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import type { StudentTutor } from '@/lib/actions/student-schedule'

interface TutorsListProps {
  tutors: StudentTutor[]
  onContactTutor?: (email: string) => void
}

export function TutorsList({ tutors, onContactTutor }: TutorsListProps) {
  if (tutors.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Mis Profesores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no tienes profesores asignados
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold">Mis Profesores</CardTitle>
        <Button variant="link" size="sm" className="text-primary p-0 h-auto">
          Ver Todos
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {tutors.slice(0, 3).map((tutor) => (
          <div
            key={tutor.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                userId={tutor.id}
                userName={tutor.name}
                userLastName={tutor.lastName}
                userImage={tutor.image}
                className="h-10 w-10"
                fallbackClassName="bg-primary/10 text-primary text-xs font-bold"
              />
              <div>
                <p className="text-sm font-medium">
                  {tutor.name} {tutor.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tutor.language} {tutor.specialty && `• ${tutor.specialty}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onContactTutor?.(`tutor-${tutor.id}@lingowow.com`)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
