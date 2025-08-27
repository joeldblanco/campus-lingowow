import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'

const Demo = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navegación */}
      <Header />
      <main className="flex-1">
        <h1 className="text-3xl font-bold mb-6">Demo</h1>
        <p>Aquí se encuentra toda la información sobre la demo disponible en Lingowow.</p>
      </main>
      <Footer />
    </div>
  )
}

export default Demo
