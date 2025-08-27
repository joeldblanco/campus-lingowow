// /components/virtual-classroom/class-notes.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

interface ClassNotesProps {
  classId: string
  studentId: string
}

export const ClassNotes: React.FC<ClassNotesProps> = ({ classId, studentId }) => {
  console.log(classId, studentId)
  const [notes, setNotes] = useState('')

  const saveNotes = () => {
    // Aquí se guardarían las notas en la base de datos
    toast('Notas guardadas. Tus notas se han guardado correctamente')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b flex justify-between items-center">
        <h3 className="text-sm font-medium">Mis notas de clase</h3>
        <Button size="sm" onClick={saveNotes}>
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>

      <Textarea
        className="flex-grow resize-none border-0 rounded-none"
        placeholder="Escribe tus notas aquí..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </div>
  )
}
