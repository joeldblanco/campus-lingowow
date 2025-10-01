'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type CurrentClassContextType = {
  currentClassId: string | null
  setCurrentClass: (classId: string) => void
  clearCurrentClass: () => void
}

const CurrentClassContext = createContext<CurrentClassContextType | null>(null)

export function CurrentClassProvider({ children }: { children: React.ReactNode }) {
  const [currentClassId, setCurrentClassId] = useState<string | null>(null)

  // Cargar desde localStorage al inicializar
  useEffect(() => {
    const savedClassId = localStorage.getItem('currentClassId')
    if (savedClassId) {
      setCurrentClassId(savedClassId)
    }
  }, [])

  const setCurrentClass = (classId: string) => {
    setCurrentClassId(classId)
    localStorage.setItem('currentClassId', classId)
  }

  const clearCurrentClass = () => {
    setCurrentClassId(null)
    localStorage.removeItem('currentClassId')
  }

  return (
    <CurrentClassContext.Provider value={{ currentClassId, setCurrentClass, clearCurrentClass }}>
      {children}
    </CurrentClassContext.Provider>
  )
}

export function useCurrentClass() {
  const context = useContext(CurrentClassContext)
  if (!context) {
    throw new Error('useCurrentClass debe usarse dentro de un CurrentClassProvider')
  }
  return context
}
