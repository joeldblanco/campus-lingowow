import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer-3'
import { Badge } from '@/components/ui/badge'

export default function TerminosPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Badge variant="outline" className="w-fit">
                Legal
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Términos de Servicio
              </h1>
              <p className="text-muted-foreground max-w-[700px]">
                Última actualización: 1 de octubre de 2025
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="w-full py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto prose prose-slate">
              <h2>1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar los servicios de Lingowow, usted acepta estar sujeto a estos 
                Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, 
                no debe utilizar nuestros servicios.
              </p>

              <h2>2. Descripción del Servicio</h2>
              <p>
                Lingowow proporciona servicios de enseñanza de idiomas en línea a través de clases 
                en vivo por videollamada con profesores certificados. Nuestros servicios incluyen:
              </p>
              <ul>
                <li>Clases individuales y grupales en tiempo real</li>
                <li>Materiales didácticos digitales</li>
                <li>Acceso a plataforma de aprendizaje</li>
                <li>Seguimiento de progreso</li>
                <li>Soporte técnico y académico</li>
              </ul>

              <h2>3. Registro y Cuenta de Usuario</h2>
              <p>
                Para utilizar nuestros servicios, debe crear una cuenta proporcionando información 
                precisa y completa. Usted es responsable de:
              </p>
              <ul>
                <li>Mantener la confidencialidad de su contraseña</li>
                <li>Todas las actividades que ocurran bajo su cuenta</li>
                <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
                <li>Proporcionar información veraz y actualizada</li>
              </ul>

              <h2>4. Planes y Pagos</h2>
              <h3>4.1 Suscripciones</h3>
              <p>
                Ofrecemos diferentes planes de suscripción mensual. Los pagos se procesan 
                automáticamente al inicio de cada período de facturación.
              </p>
              
              <h3>4.2 Métodos de Pago</h3>
              <p>
                Aceptamos tarjetas de crédito, débito y otros métodos de pago electrónicos. 
                Al proporcionar información de pago, garantiza que está autorizado para usar 
                el método de pago seleccionado.
              </p>

              <h3>4.3 Reembolsos</h3>
              <p>
                Ofrecemos garantía de satisfacción de 30 días. Si no está satisfecho con nuestro 
                servicio durante el primer mes, puede solicitar un reembolso completo. Después 
                de este período, no se realizan reembolsos por períodos de facturación ya iniciados.
              </p>

              <h2>5. Cancelación y Modificación</h2>
              <h3>5.1 Cancelación de Suscripción</h3>
              <p>
                Puede cancelar su suscripción en cualquier momento con 15 días de antelación. 
                La cancelación será efectiva al final del período de facturación actual.
              </p>

              <h3>5.2 Cancelación de Clases</h3>
              <p>
                Puede cancelar o reprogramar clases con al menos 24 horas de antelación sin cargo. 
                Cancelaciones con menos de 24 horas se considerarán como clases tomadas.
              </p>

              <h2>6. Conducta del Usuario</h2>
              <p>Al utilizar nuestros servicios, usted se compromete a:</p>
              <ul>
                <li>Tratar a profesores y personal con respeto</li>
                <li>Asistir puntualmente a las clases programadas</li>
                <li>No compartir materiales didácticos con terceros</li>
                <li>No grabar clases sin consentimiento previo</li>
                <li>No utilizar el servicio para fines ilegales o no autorizados</li>
              </ul>

              <h2>7. Propiedad Intelectual</h2>
              <p>
                Todos los materiales, contenidos, marcas y recursos proporcionados por Lingowow 
                son propiedad de la empresa o sus licenciantes. No puede reproducir, distribuir 
                o crear obras derivadas sin autorización expresa.
              </p>

              <h2>8. Limitación de Responsabilidad</h2>
              <p>
                Lingowow no será responsable por:
              </p>
              <ul>
                <li>Interrupciones del servicio por causas técnicas o de fuerza mayor</li>
                <li>Pérdida de datos o información</li>
                <li>Resultados específicos de aprendizaje (el progreso depende del estudiante)</li>
                <li>Problemas técnicos en el equipo o conexión del usuario</li>
              </ul>

              <h2>9. Modificaciones del Servicio</h2>
              <p>
                Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto 
                del servicio en cualquier momento, con previo aviso cuando sea posible.
              </p>

              <h2>10. Modificaciones de los Términos</h2>
              <p>
                Podemos actualizar estos términos periódicamente. Los cambios significativos serán 
                notificados por email. El uso continuado del servicio después de los cambios 
                constituye aceptación de los nuevos términos.
              </p>

              <h2>11. Terminación</h2>
              <p>
                Podemos suspender o terminar su acceso al servicio si:
              </p>
              <ul>
                <li>Viola estos términos de servicio</li>
                <li>Proporciona información falsa</li>
                <li>Realiza actividades fraudulentas</li>
                <li>Presenta conducta inapropiada hacia el personal</li>
              </ul>

              <h2>12. Ley Aplicable</h2>
              <p>
                Estos términos se rigen por las leyes de Perú. Cualquier disputa será resuelta 
                en los tribunales competentes de Callao, Perú.
              </p>

              <h2>13. Contacto</h2>
              <p>
                Para preguntas sobre estos términos, puede contactarnos en:
              </p>
              <ul>
                <li>Email: info@lingowow.com</li>
                <li>Teléfono: +51 902 518 947</li>
                <li>Dirección: Callao, Perú</li>
              </ul>

              <h2>14. Separabilidad</h2>
              <p>
                Si alguna disposición de estos términos se considera inválida o inaplicable, 
                las disposiciones restantes continuarán en pleno vigor y efecto.
              </p>

              <h2>15. Acuerdo Completo</h2>
              <p>
                Estos términos constituyen el acuerdo completo entre usted y Lingowow respecto 
                al uso de nuestros servicios.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
