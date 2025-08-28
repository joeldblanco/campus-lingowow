'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Users } from 'lucide-react'
import { ExamWithDetails, assignExamToStudents } from '@/lib/actions/exams'
import { toast } from 'sonner'

interface AssignExamDialogProps {
  exam: ExamWithDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Student {
  id: string
  name: string
  lastName: string
  email: string
  enrollments: {
    course: {
      title: string
      language: string
    }
  }[]
}

export function AssignExamDialog({ exam, open, onOpenChange }: AssignExamDialogProps) {
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open])

  const loadStudents = async () => {
    try {
      // Mock data - in real implementation, this would fetch from the database
      const mockStudents: Student[] = [
        {
          id: '1',
          name: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          enrollments: [
            {
              course: {
                title: 'English Beginner',
                language: 'English',
              },
            },
          ],
        },
        {
          id: '2',
          name: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          enrollments: [
            {
              course: {
                title: 'Spanish Intermediate',
                language: 'Spanish',
              },
            },
          ],
        },
        {
          id: '3',
          name: 'Carlos',
          lastName: 'Rodriguez',
          email: 'carlos.rodriguez@example.com',
          enrollments: [
            {
              course: {
                title: 'English Advanced',
                language: 'English',
              },
            },
          ],
        },
      ]
      setStudents(mockStudents)
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    }
  }

  const filterStudents = useCallback(() => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by course if exam is assigned to a specific course
    if (exam.courseId) {
      filtered = filtered.filter((student) =>
        student.enrollments.some((enrollment) =>
          enrollment.course.title.includes(exam.course?.title || '')
        )
      )
    }

    setFilteredStudents(filtered)
  }, [students, searchTerm, exam.courseId, exam.course?.title])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, filterStudents])

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student')
      return
    }

    setLoading(true)
    try {
      const result = await assignExamToStudents(exam.id, selectedStudents)

      if (result.success) {
        toast.success(`Exam assigned to ${selectedStudents.length} students`)
        onOpenChange(false)
        setSelectedStudents([])
        setSearchTerm('')
      } else {
        toast.error(result.error || 'Failed to assign exam')
      }
    } catch (error) {
      console.error('Error assigning exam:', error)
      toast.error('Failed to assign exam')
    } finally {
      setLoading(false)
    }
  }

  const alreadyAssignedStudents = exam.userAttempts.map((attempt) => attempt.userId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Assign Exam: {exam.title}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exam Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exam Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{exam.description}</p>
                <div className="flex space-x-2">
                  {exam.course && (
                    <>
                      <Badge variant="outline">{exam.course.title}</Badge>
                      <Badge variant="secondary">{exam.course.language}</Badge>
                    </>
                  )}
                  <Badge variant="outline">{exam.points} points</Badge>
                  <Badge variant="outline">{exam.examData?.passingScore || 70}% to pass</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Students</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Select All */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="selectAll"
              checked={
                selectedStudents.length === filteredStudents.length && filteredStudents.length > 0
              }
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="selectAll">Select All ({filteredStudents.length} students)</Label>
          </div>

          {/* Students List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Available Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No students found</p>
                ) : (
                  filteredStudents.map((student) => {
                    const isAlreadyAssigned = alreadyAssignedStudents.includes(student.id)
                    const isSelected = selectedStudents.includes(student.id)

                    return (
                      <div
                        key={student.id}
                        className={`flex items-center space-x-3 p-3 border rounded ${
                          isAlreadyAssigned ? 'bg-muted opacity-50' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                          disabled={isAlreadyAssigned}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {student.name} {student.lastName}
                            </span>
                            {isAlreadyAssigned && (
                              <Badge variant="secondary" className="text-xs">
                                Already Assigned
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                          <div className="flex space-x-1 mt-1">
                            {student.enrollments.map((enrollment, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {enrollment.course.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Count */}
          {selectedStudents.length > 0 && (
            <div className="bg-muted p-3 rounded">
              <p className="text-sm">
                <strong>{selectedStudents.length}</strong> students selected for assignment
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedStudents.length === 0}>
              {loading ? 'Assigning...' : `Assign to ${selectedStudents.length} Students`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
