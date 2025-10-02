import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge variant="outline" className="w-fit">
                Centro de Ayuda
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Preguntas Frecuentes
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Encuentra respuestas a las preguntas más comunes sobre nuestros cursos, 
                metodología, precios y más.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto space-y-8">
              {/* General */}
              <div>
                <h2 className="text-2xl font-bold mb-4">General</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>¿Qué es Lingowow?</AccordionTrigger>
                    <AccordionContent>
                      Lingowow es una academia de idiomas online que ofrece clases personalizadas 
                      con profesores profesionales y certificados. Nos especializamos en inglés y español, 
                      con un método comunicativo e inmersivo que garantiza resultados reales.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>¿Las clases son en vivo o grabadas?</AccordionTrigger>
                    <AccordionContent>
                      Todas nuestras clases son en vivo por videollamada con profesores reales. 
                      No utilizamos clases grabadas. Esto permite una interacción directa, 
                      práctica conversacional y feedback inmediato.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>¿Necesito experiencia previa?</AccordionTrigger>
                    <AccordionContent>
                      No, ofrecemos cursos para todos los niveles, desde principiantes absolutos (A1) 
                      hasta avanzados (C2). Realizamos una evaluación inicial para determinar tu nivel 
                      y diseñar un plan de estudios personalizado.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Metodología */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Metodología</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-4">
                    <AccordionTrigger>¿Cuál es el método de enseñanza?</AccordionTrigger>
                    <AccordionContent>
                      Utilizamos un método comunicativo con inmersión total. Desde el primer día, 
                      las clases se imparten en el idioma objetivo, con énfasis en situaciones reales, 
                      práctica constante y conversación. Adaptamos el contenido a tus necesidades 
                      y objetivos específicos.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>¿Cuánto tiempo se necesita para aprender un idioma?</AccordionTrigger>
                    <AccordionContent>
                      El tiempo varía según el idioma, tu dedicación y conocimientos previos. 
                      En general, para alcanzar un nivel intermedio (B1) se necesitan entre 6-8 meses 
                      con práctica regular (2-4 clases por semana). Para nivel avanzado (C1), 
                      aproximadamente 12-18 meses.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger>¿Qué materiales se utilizan?</AccordionTrigger>
                    <AccordionContent>
                      Proporcionamos todos los materiales necesarios: libros digitales, guías de estudio, 
                      ejercicios interactivos, audios, videos y recursos multimedia. Todo está incluido 
                      en el precio del curso, no necesitas comprar nada adicional.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Profesores */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Profesores</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-7">
                    <AccordionTrigger>¿Qué certificaciones tienen los profesores?</AccordionTrigger>
                    <AccordionContent>
                      Todos nuestros profesores son profesionales con nivel C2 certificado. 
                      Cuentan con certificaciones internacionales para la enseñanza de idiomas 
                      (TEFL, TESOL, CELTA para inglés; DELE, ELE para español) y amplia experiencia 
                      docente. Cada profesor pasa por un riguroso proceso de selección.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-8">
                    <AccordionTrigger>¿Puedo elegir a mi profesor?</AccordionTrigger>
                    <AccordionContent>
                      Sí, puedes ver los perfiles de nuestros profesores y elegir el que mejor 
                      se adapte a tus necesidades. También puedes cambiar de profesor si lo deseas. 
                      Nuestro objetivo es que te sientas cómodo y motivado en cada clase.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Precios y Planes */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Precios y Planes</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-9">
                    <AccordionTrigger>¿Cuánto cuestan los cursos?</AccordionTrigger>
                    <AccordionContent>
                      Ofrecemos diferentes planes según la intensidad de estudio:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Plan Básico: $89/mes (2 clases/semana)</li>
                        <li>Plan Intensivo: $149/mes (4 clases/semana)</li>
                        <li>Plan Premium: $199/mes (5 clases/semana)</li>
                      </ul>
                      Todos los materiales están incluidos.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-10">
                    <AccordionTrigger>¿Puedo cancelar mi suscripción en cualquier momento?</AccordionTrigger>
                    <AccordionContent>
                      Sí, todos nuestros planes son flexibles y puedes cancelar en cualquier momento. 
                      Solo necesitas avisar con 15 días de antelación antes del siguiente ciclo de 
                      facturación. No hay penalizaciones ni cargos adicionales.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-11">
                    <AccordionTrigger>¿Ofrecen descuentos o promociones?</AccordionTrigger>
                    <AccordionContent>
                      Sí, ofrecemos descuentos por pago anticipado (10% por 3 meses, 15% por 6 meses), 
                      descuentos para grupos familiares y promociones especiales durante el año. 
                      Contáctanos para conocer las ofertas vigentes.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-12">
                    <AccordionTrigger>¿Hay garantía de devolución?</AccordionTrigger>
                    <AccordionContent>
                      Sí, ofrecemos garantía de satisfacción de 30 días. Si no estás satisfecho 
                      con nuestro servicio en el primer mes, te devolvemos tu dinero sin preguntas.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Clases y Horarios */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Clases y Horarios</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-13">
                    <AccordionTrigger>¿Cuánto dura cada clase?</AccordionTrigger>
                    <AccordionContent>
                      Cada clase tiene una duración de 60 minutos. Este tiempo es ideal para 
                      mantener la concentración y aprovechar al máximo la sesión sin que resulte 
                      agotador.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-14">
                    <AccordionTrigger>¿Puedo elegir mis horarios?</AccordionTrigger>
                    <AccordionContent>
                      Sí, ofrecemos total flexibilidad de horarios. Puedes programar tus clases 
                      según tu disponibilidad, incluyendo fines de semana. Trabajamos con profesores 
                      en diferentes zonas horarias para adaptarnos a tu agenda.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-15">
                    <AccordionTrigger>¿Qué pasa si no puedo asistir a una clase?</AccordionTrigger>
                    <AccordionContent>
                      Puedes cancelar o reprogramar una clase con al menos 24 horas de antelación 
                      sin ningún cargo. Si cancelas con menos tiempo, la clase se considerará tomada. 
                      Entendemos que surgen imprevistos y tratamos de ser flexibles.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-16">
                    <AccordionTrigger>¿Las clases son individuales o grupales?</AccordionTrigger>
                    <AccordionContent>
                      Por defecto, todas las clases son individuales (one-to-one) para maximizar 
                      tu aprendizaje. Sin embargo, también ofrecemos clases grupales (máximo 4 personas) 
                      con descuento si prefieres aprender con amigos o familiares.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Certificaciones */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Certificaciones</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-17">
                    <AccordionTrigger>¿Ofrecen certificaciones oficiales?</AccordionTrigger>
                    <AccordionContent>
                      Preparamos a los estudiantes para certificaciones oficiales como TOEFL, IELTS, 
                      TOEIC (inglés), DELE (español), DELF/DALF (francés), TestDaF (alemán), entre otros. 
                      Los exámenes se realizan en centros autorizados externos. También emitimos 
                      certificados propios de finalización de curso.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-18">
                    <AccordionTrigger>¿Cuánto tiempo se necesita para preparar una certificación?</AccordionTrigger>
                    <AccordionContent>
                      Depende de tu nivel actual y la certificación objetivo. Para TOEFL o IELTS, 
                      si ya tienes nivel B2, necesitas aproximadamente 2-3 meses de preparación intensiva. 
                      Realizamos una evaluación inicial para determinar el tiempo estimado en tu caso.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Técnico */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Aspectos Técnicos</h2>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-19">
                    <AccordionTrigger>¿Qué necesito para tomar las clases?</AccordionTrigger>
                    <AccordionContent>
                      Solo necesitas:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Computadora, tablet o smartphone</li>
                        <li>Conexión a internet estable</li>
                        <li>Cámara y micrófono (pueden ser integrados)</li>
                        <li>Navegador web actualizado</li>
                      </ul>
                      No necesitas instalar ningún software especial.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-20">
                    <AccordionTrigger>¿Qué plataforma utilizan para las clases?</AccordionTrigger>
                    <AccordionContent>
                      Utilizamos nuestra propia plataforma integrada con videollamadas de alta calidad. 
                      Es muy fácil de usar, solo necesitas hacer clic en el enlace de tu clase. 
                      También ofrecemos soporte técnico si tienes algún problema.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-16 bg-slate-50">
          <div className="container px-4 md:px-6">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold">¿No encontraste tu respuesta?</h2>
                  <p className="text-muted-foreground">
                    Nuestro equipo está listo para ayudarte. Contáctanos y te responderemos 
                    en menos de 24 horas.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/contacto">
                      <Button size="lg">Contactar</Button>
                    </Link>
                    <Link href="/demo">
                      <Button size="lg" variant="outline">Clase de Prueba Gratuita</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
