'use client'

import { useState } from 'react'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { getUserAvatarUrl } from '@/lib/utils'
import type { TeacherPaymentDetail } from '@/lib/actions/teacher-payments'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TeacherPaymentsTableProps {
  data: TeacherPaymentDetail[]
  title?: string
  description?: string
}

export function TeacherPaymentsTable({
  data,
  title = 'Pagos por Profesor',
  description = 'Desglose detallado de pagos del período seleccionado',
}: TeacherPaymentsTableProps) {
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPaymentDetail | null>(null)

  const toggleExpand = (teacherId: string) => {
    setExpandedTeacher(expandedTeacher === teacherId ? null : teacherId)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead className="text-right">Clases</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Pago Total</TableHead>
                <TableHead className="text-right">Promedio/Clase</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((teacher) => (
                <React.Fragment key={teacher.teacherId}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      {expandedTeacher === teacher.teacherId ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getUserAvatarUrl(teacher.teacherId, teacher.teacherImage)}
                            alt={teacher.teacherName}
                          />
                          <AvatarFallback>
                            {teacher.teacherName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{teacher.teacherName}</p>
                          <p className="text-xs text-muted-foreground">{teacher.teacherEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      {teacher.rankName ? (
                        <Badge variant="outline">{teacher.rankName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => toggleExpand(teacher.teacherId)}>
                      {teacher.totalClasses}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => toggleExpand(teacher.teacherId)}>
                      {teacher.totalHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right font-medium" onClick={() => toggleExpand(teacher.teacherId)}>
                      ${teacher.totalPayment.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground" onClick={() => toggleExpand(teacher.teacherId)}>
                      ${teacher.averagePerClass.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTeacher(teacher)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedTeacher === teacher.teacherId && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <h4 className="font-semibold mb-3 text-sm">Clases del período</h4>
                          <div className="space-y-2">
                            {teacher.classes.map((classItem) => (
                              <div
                                key={classItem.id}
                                className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{classItem.courseName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Estudiante: {classItem.studentName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {format(new Date(classItem.day), 'dd MMM yyyy', { locale: es })}
                                    </p>
                                    <p className="text-muted-foreground">{classItem.timeSlot}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-muted-foreground">{classItem.duration} min</p>
                                  </div>
                                  <div className="text-right min-w-[80px]">
                                    <p className="font-bold">${classItem.payment.toFixed(2)}</p>
                                  </div>
                                  {classItem.isPayable && (
                                    <Badge variant="default" className="text-xs">
                                      Pagable
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No hay datos de pagos para este período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Pagos - {selectedTeacher?.teacherName}</DialogTitle>
            <DialogDescription>
              Resumen completo de clases y pagos del período
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Clases</p>
                  <p className="text-2xl font-bold">{selectedTeacher.totalClasses}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Horas</p>
                  <p className="text-2xl font-bold">{selectedTeacher.totalHours.toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Pago Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedTeacher.totalPayment.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Promedio/Clase</p>
                  <p className="text-2xl font-bold">${selectedTeacher.averagePerClass.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Clases Impartidas</h4>
                <div className="space-y-2">
                  {selectedTeacher.classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{classItem.courseName}</p>
                        <p className="text-sm text-muted-foreground">
                          Estudiante: {classItem.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(classItem.day), "dd 'de' MMMM yyyy", { locale: es })} •{' '}
                          {classItem.timeSlot}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${classItem.payment.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{classItem.duration} minutos</p>
                        {classItem.isPayable && (
                          <Badge variant="default" className="text-xs mt-1">
                            Pagable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
