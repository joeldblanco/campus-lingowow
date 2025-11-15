'use client'

import { CourseBuilderData } from '@/types/course-builder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'
import Image from 'next/image'
import { CreateCourseSchema } from '@/schemas/courses'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Badge } from '@/components/ui/badge'
import { Globe, Target, Clock, Users } from 'lucide-react'

interface CourseInfoTabProps {
  course: CourseBuilderData
  onUpdateCourse: (updates: Partial<CourseBuilderData>) => void
}

export function CourseInfoTab({ course, onUpdateCourse }: CourseInfoTabProps) {
  const form = useForm<z.infer<typeof CreateCourseSchema>>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: {
      title: course.title,
      description: course.description,
      language: course.language,
      level: course.level,
      classDuration: course.classDuration,
      image: course.image,
      createdById: course.createdById,
    },
  })

  const onSubmit = (values: z.infer<typeof CreateCourseSchema>) => {
    onUpdateCourse(values)
  }

  const handleFieldChange = (field: keyof CourseBuilderData, value: string | number | boolean) => {
    onUpdateCourse({ [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Course Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Información General del Curso</CardTitle>
          <CardDescription>
            Configura la información básica y metadatos del curso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título del Curso</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Programa Regular de Inglés"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            handleFieldChange('title', e.target.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el contenido y objetivos del curso..."
                          rows={4}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            handleFieldChange('description', e.target.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Language and Level */}
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idioma</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleFieldChange('language', value)
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un idioma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Inglés">Inglés</SelectItem>
                            <SelectItem value="Español">Español</SelectItem>
                            <SelectItem value="Francés" disabled>Francés (Próximamente)</SelectItem>
                            <SelectItem value="Alemán" disabled>Alemán (Próximamente)</SelectItem>
                            <SelectItem value="Italiano" disabled>Italiano (Próximamente)</SelectItem>
                            <SelectItem value="Portugués" disabled>Portugués (Próximamente)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleFieldChange('level', value)
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un nivel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Principiante">Principiante</SelectItem>
                            <SelectItem value="Básico">Básico</SelectItem>
                            <SelectItem value="Intermedio">Intermedio</SelectItem>
                            <SelectItem value="Avanzado">Avanzado</SelectItem>
                            <SelectItem value="Conversacional">Conversacional</SelectItem>
                            <SelectItem value="Especializado">Especializado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Class Duration */}
                <FormField
                  control={form.control}
                  name="classDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración de Clase</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(parseInt(value))
                          handleFieldChange('classDuration', parseInt(value))
                        }} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la duración" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="40">40 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                          <SelectItem value="90">90 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Course Image */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen del Curso</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <FileUpload
                            fileType="image"
                            folder="courses"
                            onUploadComplete={(result) => {
                              field.onChange(result.secure_url)
                              handleFieldChange('image', result.secure_url)
                            }}
                            onUploadError={(error) => {
                              console.error('Upload error:', error)
                            }}
                          />
                          {field.value && (
                            <div className="flex items-center gap-4">
                              <Image 
                                src={field.value} 
                                alt="Vista previa del curso" 
                                width={120}
                                height={120}
                                className="object-cover rounded-lg border"
                              />
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Vista previa</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    field.onChange('')
                                    handleFieldChange('image', '')
                                  }}
                                >
                                  Eliminar imagen
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Publishing Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-base">Estado de Publicación</FormLabel>
                      <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                        {course.isPublished ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {course.isPublished 
                        ? 'El curso está visible para todos los estudiantes'
                        : 'El curso no es visible para los estudiantes'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={course.isPublished}
                    onCheckedChange={(checked) => handleFieldChange('isPublished', checked)}
                  />
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Course Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas del Curso</CardTitle>
          <CardDescription>
            Resumen de la estructura y contenido actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Idioma</p>
                <p className="text-lg font-bold">{course.language}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Nivel</p>
                <p className="text-lg font-bold">{course.level}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Duración</p>
                <p className="text-lg font-bold">{course.classDuration}min</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Módulos</p>
                <p className="text-lg font-bold">{course.modules.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
