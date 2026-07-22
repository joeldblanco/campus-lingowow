'use client'

import React from 'react'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Button } from '@/components/ui/button'
import { Smartphone, Construction, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DownloadAppPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-nunito">
      <Header />
      <main className="flex-grow flex items-center justify-center py-16 px-4">
        <div className="max-w-xl w-full text-center space-y-8 bg-white dark:bg-card-dark p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 transition-all">
          <div className="relative mx-auto w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Smartphone className="w-12 h-12" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white p-1.5 rounded-lg shadow-md">
              <Construction className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ¡La App de Lingowow está en camino!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
              Actualmente nos encontramos construyendo la mejor experiencia móvil de aprendizaje de idiomas. Muy pronto podrás descargar la aplicación oficial para iOS y Android desde tu App Store.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-2">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">iPhone</span>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">App Store</span>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">Pronto</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Android</span>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Google Play</span>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">Pronto</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/95 text-white font-bold px-8 py-5 rounded-xl shadow-lg transition-transform hover:scale-102">
              <Link href="/dashboard" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al Panel
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
