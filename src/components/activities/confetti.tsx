// /components/activities/Confetti.tsx
'use client'

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  rotation: number
  velocity: {
    x: number
    y: number
    rotation: number
  }
}

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    // Colores del confeti
    const colors = [
      '#FCD34D', // amarillo
      '#60A5FA', // azul
      '#F87171', // rojo
      '#34D399', // verde
      '#A78BFA', // morado
    ]

    // Crear partículas iniciales
    const initialParticles: Particle[] = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      velocity: {
        x: (Math.random() - 0.5) * 8,
        y: Math.random() * 15 + 5,
        rotation: (Math.random() - 0.5) * 10,
      },
    }))

    setParticles(initialParticles)

    // Animación del confeti
    let animationId: number
    let lastTime = 0

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const deltaTime = timestamp - lastTime
      lastTime = timestamp

      setParticles((prevParticles) =>
        prevParticles
          .map((particle) => {
            // Aplicar gravedad
            const gravity = 0.25

            return {
              ...particle,
              x: particle.x + particle.velocity.x * (deltaTime / 16),
              y: particle.y + particle.velocity.y * (deltaTime / 16),
              rotation: (particle.rotation + particle.velocity.rotation) % 360,
              velocity: {
                ...particle.velocity,
                y: particle.velocity.y + gravity * (deltaTime / 16),
              },
            }
          })
          .filter((particle) => particle.y < window.innerHeight + 100)
      )

      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size * 0.5}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            opacity: 0.8,
            zIndex: 9999,
          }}
        />
      ))}
    </div>
  )
}
