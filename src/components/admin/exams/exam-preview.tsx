'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreateExamSectionData } from '@/types/exam'
import { Clock, FileText, Award } from 'lucide-react'

interface ExamPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  sections: CreateExamSectionData[]
  timeLimit: number
  totalPoints: number
}

export function ExamPreview({
  open,
  onOpenChange,
  title,
  description,
  sections,
  timeLimit,
  totalPoints,
}: ExamPreviewProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Vista previa del examen</SheetTitle>
          <SheetDescription>
            Así verán los estudiantes este examen
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Exam Header */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{title || 'Sin título'}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{timeLimit} minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{sections.reduce((sum, s) => sum + s.questions.length, 0)} preguntas</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span>{totalPoints} puntos</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sections Preview */}
          {sections.map((section, sIndex) => (
            <Card key={sIndex}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {section.questions.map((question, qIndex) => (
                  <div key={qIndex} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-1">
                        {qIndex + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{question.question}</p>
                          <Badge variant="secondary">{question.points} pts</Badge>
                        </div>

                        {/* Question Type Specific Preview */}
                        <div className="mt-3">
                          {question.type === 'MULTIPLE_CHOICE' && question.options && (
                            <div className="space-y-2">
                              {question.options.map((option, oIndex) => (
                                <div
                                  key={oIndex}
                                  className="flex items-center gap-3 p-3 border rounded-lg"
                                >
                                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                                  <span>{option}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === 'TRUE_FALSE' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                                <span>Verdadero</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                                <span>Falso</span>
                              </div>
                            </div>
                          )}

                          {question.type === 'SHORT_ANSWER' && (
                            <div className="p-3 border rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">
                                Respuesta corta (texto)
                              </p>
                            </div>
                          )}

                          {question.type === 'ESSAY' && (
                            <div className="p-3 border rounded-lg bg-muted/50 min-h-[100px]">
                              <p className="text-sm text-muted-foreground">
                                Área de texto para ensayo
                              </p>
                            </div>
                          )}

                          {question.type === 'FILL_BLANK' && (
                            <div className="p-3 border rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">
                                Llenar espacio en blanco
                              </p>
                            </div>
                          )}
                        </div>

                        {question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                              <strong>Explicación:</strong> {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {qIndex < section.questions.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay preguntas para mostrar</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
