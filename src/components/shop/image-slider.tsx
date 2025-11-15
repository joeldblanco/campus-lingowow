'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface Slide {
  id: string
  image: string
  title: string
  subtitle?: string
  cta?: {
    text: string
    url: string
  }
}

interface ImageSliderProps {
  slides: Slide[]
  autoPlay?: boolean
  interval?: number
}

export function ImageSlider({ slides, autoPlay = true, interval = 5000 }: ImageSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (!autoPlay) return

    const timer = setInterval(nextSlide, interval)
    return () => clearInterval(timer)
  }, [autoPlay, interval, nextSlide])

  if (slides.length === 0) return null

  return (
    <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-lg">
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="relative w-full h-full">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority
                quality={95}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent flex items-center justify-start">
                <div className="text-left text-white px-8 md:px-12">
                  <h2 className="text-3xl md:text-5xl font-black mb-3 tracking-tight leading-tight">
                    {slide.title}
                  </h2>
                  {slide.subtitle && (
                    <p className="text-xl md:text-2xl font-light mb-4 tracking-wide opacity-90">
                      {slide.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
