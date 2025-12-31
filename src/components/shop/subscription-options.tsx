'use client'

import { Button } from '@/components/ui/button'
import { GraduationCap, Users, Library, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

export function SubscriptionOptions() {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-baseline justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-lexend">Selecciona un Tipo de Suscripción</h2>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">3 tipos disponibles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Card 1: One-on-One */}
                <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-blue-400 to-primary"></div>
                    <div className="p-8 flex flex-col h-full">
                        <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <GraduationCap className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-lexend">Planes de Clases 1 a 1</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Tutoría privada dedicada con hablantes nativos expertos. Perfecto para acelerar la fluidez a través de práctica de conversación personalizada y feedback específico.
                        </p>
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-primary h-5 w-5 shrink-0" />
                                <span>Currículo personalizado</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-primary h-5 w-5 shrink-0" />
                                <span>Horarios flexibles 24/7</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-primary h-5 w-5 shrink-0" />
                                <span>Elige tu tutor preferido</span>
                            </div>
                        </div>
                        <Link href="/pricing?productId=cmhw4wn69000yw16wlzgvbj0k" className="w-full">
                            <Button className="w-full py-6 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm hover:bg-primary hover:text-white dark:hover:bg-primary transition-all duration-200 flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white border-none shadow-none">
                                Ver Planes
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Card 2: Group Tutoring */}
                <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-indigo-400 to-indigo-600"></div>
                    <div className="p-8 flex flex-col h-full">
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Users className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-lexend">Paquetes de Tutoría Grupal</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Aprendan juntos en grupos pequeños e interactivos. Genial para practicar escenarios sociales, aprendizaje entre pares y mantenerse motivado con otros estudiantes.
                        </p>
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-indigo-500 h-5 w-5 shrink-0" />
                                <span>Grupos pequeños (Máx 6)</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-indigo-500 h-5 w-5 shrink-0" />
                                <span>Talleres temáticos</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-indigo-500 h-5 w-5 shrink-0" />
                                <span>Menor costo por sesión</span>
                            </div>
                        </div>
                        <Link href="/pricing?productId=cmhw15zgv000kw16w04th75mb" className="w-full">
                            <Button className="w-full py-6 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all duration-200 flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white border-none shadow-none">
                                Ver Planes
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Card 3: Premium Resources */}
                <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                    <div className="p-8 flex flex-col h-full">
                        <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Library className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-lexend">Acceso a Recursos Premium</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Acceso ilimitado a nuestra extensa biblioteca de cursos a tu propio ritmo, e-books, guías de audio y cuestionarios interactivos. Aprende a tu propio ritmo.
                        </p>
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-emerald-500 h-5 w-5 shrink-0" />
                                <span>Cursos ilimitados</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-emerald-500 h-5 w-5 shrink-0" />
                                <span>Materiales descargables</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check className="text-emerald-500 h-5 w-5 shrink-0" />
                                <span>Seguimiento de progreso</span>
                            </div>
                        </div>
                        <Link href="/pricing" className="w-full">
                            <Button className="w-full py-6 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-sm hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all duration-200 flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white border-none shadow-none">
                                Ver Planes
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
