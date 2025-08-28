'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { ExamWithDetails, updateExam, ExamSection, ExamQuestion } from '@/lib/actions/exams'
import { toast } from 'sonner'

interface EditExamDialogProps {
  exam: ExamWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditExamDialog({ exam, open, onOpenChange }: EditExamDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: exam.title,
    description: exam.description,
    timeLimit: exam.examData?.timeLimit || 60,
    passingScore: exam.examData?.passingScore || 70,
    attempts: exam.examData?.attempts || 3,
    isBlocking: exam.examData?.isBlocking || false,
    isOptional: exam.examData?.isOptional || false,
    isPublished: exam.isPublished,
  })
  const [sections, setSections] = useState<ExamSection[]>(exam.examData?.sections || [])

  useEffect(() => {
    if (open) {
      setFormData({
        title: exam.title,
        description: exam.description,
        timeLimit: exam.examData?.timeLimit || 60,
        passingScore: exam.examData?.passingScore || 70,
        attempts: exam.examData?.attempts || 3,
        isBlocking: exam.examData?.isBlocking || false,
        isOptional: exam.examData?.isOptional || false,
        isPublished: exam.isPublished,
      })
      setSections(exam.examData?.sections || [])
    }
  }, [exam, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sections.length === 0) {
      toast.error('Por favor, agregue al menos una sección')
      return
    }

    setLoading(true)
    try {
      const examData = {
        title: formData.title,
        description: formData.description,
        sections,
        totalPoints: sections.reduce(
          (sum, section) => sum + section.questions.reduce((qSum, q) => qSum + q.points, 0),
          0
        ),
        timeLimit: formData.timeLimit,
        passingScore: formData.passingScore,
        attempts: formData.attempts,
        isBlocking: formData.isBlocking,
        isOptional: formData.isOptional,
      }

      const result = await updateExam(exam.id, {
        title: formData.title,
        description: formData.description,
        examData,
        isPublished: formData.isPublished,
      })

      if (result.success) {
        toast.success('Examen actualizado exitosamente')
        onOpenChange(false)
        window.location.reload()
      } else {
        toast.error(result.error || 'Error al actualizar examen')
      }
    } catch (error) {
      console.error('Error updating exam:', error)
      toast.error('Error al actualizar examen')
    } finally {
      setLoading(false)
    }
  }

  const addSection = () => {
    const newSection: ExamSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      description: '',
      timeLimit: 30,
      questions: [],
      order: sections.length + 1,
    }
    setSections([...sections, newSection])
  }

  const updateSection = (sectionId: string, updates: Partial<ExamSection>) => {
    setSections(
      sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section))
    )
  }

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((section) => section.id !== sectionId))
  }

  const addQuestion = (sectionId: string) => {
    const newQuestion: ExamQuestion = {
      id: `question-${Date.now()}`,
      type: 'multiple_choice',
      question: 'New Question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      points: 1,
      explanation: '',
    }

    updateSection(sectionId, {
      questions: [...(sections.find((s) => s.id === sectionId)?.questions || []), newQuestion],
    })
  }

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    updates: Partial<ExamQuestion>
  ) => {
    const section = sections.find((s) => s.id === sectionId)
    if (section) {
      const updatedQuestions = section.questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      )
      updateSection(sectionId, { questions: updatedQuestions })
    }
  }

  const deleteQuestion = (sectionId: string, questionId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (section) {
      const updatedQuestions = section.questions.filter((q) => q.id !== questionId)
      updateSection(sectionId, { questions: updatedQuestions })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exam: {exam.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Exam Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                value={formData.passingScore}
                onChange={(e) =>
                  setFormData({ ...formData, passingScore: parseInt(e.target.value) })
                }
                min="0"
                max="100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attempts">Max Attempts</Label>
              <Input
                id="attempts"
                type="number"
                value={formData.attempts}
                onChange={(e) => setFormData({ ...formData, attempts: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
          </div>

          {/* Publishing Settings */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
            />
            <Label htmlFor="isPublished">Published (visible to students)</Label>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Exam Sections</h3>
              <Button type="button" onClick={addSection} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>

            {sections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1 mr-4">
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Section title"
                      />
                      <Input
                        value={section.description || ''}
                        onChange={(e) => updateSection(section.id, { description: e.target.value })}
                        placeholder="Section description (optional)"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestion(section.id)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSection(section.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.questions.map((question) => (
                      <div key={question.id} className="space-y-2 p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={question.question}
                              onChange={(e) =>
                                updateQuestion(section.id, question.id, {
                                  question: e.target.value,
                                })
                              }
                              placeholder="Question text"
                            />
                            <div className="flex space-x-2">
                              <Input
                                type="number"
                                value={question.points}
                                onChange={(e) =>
                                  updateQuestion(section.id, question.id, {
                                    points: parseInt(e.target.value),
                                  })
                                }
                                placeholder="Points"
                                className="w-20"
                                min="1"
                              />
                              <Badge variant="secondary">{question.type}</Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(section.id, question.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {question.type === 'multiple_choice' && (
                          <div className="space-y-1">
                            {question.options?.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(question.options || [])]
                                    newOptions[index] = e.target.value
                                    updateQuestion(section.id, question.id, { options: newOptions })
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                />
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === option}
                                  onChange={() =>
                                    updateQuestion(section.id, question.id, {
                                      correctAnswer: option,
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {section.questions.length === 0 && (
                      <p className="text-muted-foreground text-sm">No questions added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Exam'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
