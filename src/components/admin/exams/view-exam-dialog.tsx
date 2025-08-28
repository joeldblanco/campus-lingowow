'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Target, BookOpen, CheckCircle, XCircle } from 'lucide-react'
import { ExamWithDetails } from '@/lib/actions/exams'

interface ViewExamDialogProps {
  exam: ExamWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ViewExamDialog({ exam, open, onOpenChange }: ViewExamDialogProps) {
  const totalQuestions = exam.examData?.sections?.reduce((sum, section) => sum + section.questions.length, 0) || 0
  const totalAttempts = exam.userAttempts.length
  const passedAttempts = exam.userAttempts.filter(
    attempt => attempt.status === 'COMPLETED' && 
    (attempt.score || 0) >= (exam.examData?.passingScore || 70)
  ).length
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{exam.title}</span>
            <Badge variant={exam.isPublished ? "default" : "secondary"}>
              {exam.isPublished ? "Published" : "Draft"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">{exam.description}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(exam.examData?.timeLimit || exam.duration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Passing Score</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.examData?.passingScore || 70}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Questions</p>
                    <p className="text-sm text-muted-foreground">{totalQuestions}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Max Attempts</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.examData?.attempts || 3}
                    </p>
                  </div>
                </div>
              </div>

              {exam.course && (
                <div>
                  <h4 className="font-medium mb-2">Course Assignment</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{exam.course.title}</Badge>
                    <Badge variant="secondary">{exam.course.language}</Badge>
                    <Badge variant="secondary">{exam.course.level}</Badge>
                  </div>
                  {exam.module && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        Module: {exam.module.title} (Level {exam.module.level})
                      </span>
                    </div>
                  )}
                  {exam.lesson && (
                    <div className="mt-1">
                      <span className="text-sm text-muted-foreground">
                        Lesson: {exam.lesson.title}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalAttempts}</div>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{passedAttempts}</div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{totalAttempts - passedAttempts}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{passRate}%</div>
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {exam.examData?.sections && exam.examData.sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Exam Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {exam.examData.sections.map((section, index) => (
                  <div key={section.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">
                        Section {index + 1}: {section.title}
                      </h4>
                      <div className="flex space-x-2">
                        <Badge variant="outline">
                          {section.questions.length} questions
                        </Badge>
                        <Badge variant="outline">
                          {section.questions.reduce((sum, q) => sum + q.points, 0)} points
                        </Badge>
                        {section.timeLimit && (
                          <Badge variant="outline">
                            {formatDuration(section.timeLimit)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {section.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {section.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {section.questions.map((question, qIndex) => (
                        <div key={question.id} className="flex items-start space-x-3 p-2 bg-muted/50 rounded">
                          <span className="text-sm font-medium min-w-[2rem]">
                            {qIndex + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="text-sm">{question.question}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {question.type.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {question.points} pts
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Attempts */}
          {exam.userAttempts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exam.userAttempts.slice(0, 5).map((attempt, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">
                            {attempt.user.name} {attempt.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {attempt.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium">
                            {attempt.score !== null ? `${attempt.score}%` : 'In Progress'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Attempt {attempt.attempts}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {attempt.status === 'COMPLETED' ? (
                            (attempt.score || 0) >= (exam.examData?.passingScore || 70) ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {exam.userAttempts.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      And {exam.userAttempts.length - 5} more attempts...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
