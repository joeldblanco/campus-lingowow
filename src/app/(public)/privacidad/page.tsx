import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import { Badge } from '@/components/ui/badge'

export default function PrivacidadPage() {
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
                Política de Privacidad
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
              <h2>1. Introducción</h2>
              <p>
                En Lingowow, nos tomamos muy en serio la privacidad de nuestros usuarios. 
                Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos 
                y protegemos su información personal.
              </p>

              <h2>2. Información que Recopilamos</h2>
              <h3>2.1 Información Personal</h3>
              <p>Recopilamos la siguiente información cuando se registra o usa nuestros servicios:</p>
              <ul>
                <li>Nombre completo</li>
                <li>Dirección de correo electrónico</li>
                <li>Número de teléfono</li>
                <li>Información de pago (procesada por terceros seguros)</li>
                <li>Idioma nativo y nivel de idioma objetivo</li>
                <li>Preferencias de aprendizaje</li>
              </ul>

              <h3>2.2 Información de Uso</h3>
              <p>Recopilamos automáticamente información sobre cómo utiliza nuestros servicios:</p>
              <ul>
                <li>Registro de clases asistidas</li>
                <li>Progreso de aprendizaje y evaluaciones</li>
                <li>Interacciones con la plataforma</li>
                <li>Dirección IP y tipo de navegador</li>
                <li>Datos de cookies y tecnologías similares</li>
              </ul>

              <h3>2.3 Información de Comunicaciones</h3>
              <ul>
                <li>Mensajes enviados a través de nuestra plataforma</li>
                <li>Correos electrónicos intercambiados con soporte</li>
                <li>Feedback y evaluaciones de clases</li>
              </ul>

              <h2>3. Cómo Utilizamos su Información</h2>
              <p>Utilizamos su información personal para:</p>
              <ul>
                <li>Proporcionar y mejorar nuestros servicios educativos</li>
                <li>Procesar pagos y gestionar su cuenta</li>
                <li>Programar y coordinar clases con profesores</li>
                <li>Personalizar su experiencia de aprendizaje</li>
                <li>Enviar comunicaciones relacionadas con el servicio</li>
                <li>Realizar análisis y mejorar nuestra plataforma</li>
                <li>Cumplir con obligaciones legales</li>
                <li>Prevenir fraudes y garantizar la seguridad</li>
              </ul>

              <h2>4. Compartir Información</h2>
              <h3>4.1 Con Profesores</h3>
              <p>
                Compartimos información relevante con sus profesores asignados para facilitar 
                la enseñanza personalizada (nombre, nivel, objetivos de aprendizaje).
              </p>

              <h3>4.2 Con Proveedores de Servicios</h3>
              <p>Compartimos información con terceros que nos ayudan a operar nuestro servicio:</p>
              <ul>
                <li>Procesadores de pago (Stripe, PayPal)</li>
                <li>Servicios de hosting y almacenamiento en la nube</li>
                <li>Herramientas de análisis y marketing</li>
                <li>Servicios de videollamada</li>
              </ul>

              <h3>4.3 Requisitos Legales</h3>
              <p>
                Podemos divulgar su información si es requerido por ley o para proteger nuestros 
                derechos legales.
              </p>

              <h3>4.4 No Vendemos su Información</h3>
              <p>
                Nunca vendemos, alquilamos o comercializamos su información personal a terceros 
                para fines de marketing.
              </p>

              <h2>5. Seguridad de los Datos</h2>
              <p>Implementamos medidas de seguridad para proteger su información:</p>
              <ul>
                <li>Cifrado SSL/TLS para transmisión de datos</li>
                <li>Almacenamiento seguro en servidores protegidos</li>
                <li>Acceso restringido a información personal</li>
                <li>Auditorías de seguridad regulares</li>
                <li>Cumplimiento con estándares de la industria</li>
              </ul>
              <p>
                Sin embargo, ningún método de transmisión por Internet es 100% seguro. 
                Hacemos nuestro mejor esfuerzo, pero no podemos garantizar seguridad absoluta.
              </p>

              <h2>6. Retención de Datos</h2>
              <p>
                Conservamos su información personal mientras su cuenta esté activa o según sea 
                necesario para proporcionar servicios. Después de la cancelación de la cuenta:
              </p>
              <ul>
                <li>Datos de cuenta: 90 días</li>
                <li>Registros de transacciones: 7 años (requisito legal)</li>
                <li>Datos de progreso académico: 2 años</li>
              </ul>

              <h2>7. Sus Derechos</h2>
              <p>Usted tiene derecho a:</p>
              <ul>
                <li><strong>Acceso:</strong> Solicitar una copia de su información personal</li>
                <li><strong>Corrección:</strong> Actualizar información inexacta</li>
                <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos</li>
                <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
                <li><strong>Oposición:</strong> Oponerse a ciertos usos de su información</li>
                <li><strong>Restricción:</strong> Limitar cómo usamos su información</li>
              </ul>
              <p>
                Para ejercer estos derechos, contáctenos en info@lingowow.com
              </p>

              <h2>8. Cookies y Tecnologías Similares</h2>
              <p>Utilizamos cookies para:</p>
              <ul>
                <li>Mantener su sesión activa</li>
                <li>Recordar sus preferencias</li>
                <li>Analizar el uso de la plataforma</li>
                <li>Personalizar contenido y anuncios</li>
              </ul>
              <p>
                Puede configurar su navegador para rechazar cookies, pero esto puede afectar 
                la funcionalidad del servicio.
              </p>

              <h2>9. Privacidad de Menores</h2>
              <p>
                Nuestros servicios están dirigidos a personas mayores de 13 años. Si un menor 
                de 13 años desea usar nuestros servicios, debe hacerlo bajo supervisión parental. 
                Los padres/tutores son responsables de la información proporcionada por menores.
              </p>

              <h2>10. Transferencias Internacionales</h2>
              <p>
                Su información puede ser transferida y procesada en países fuera de su país de 
                residencia. Tomamos medidas para garantizar que sus datos reciban protección 
                adecuada según esta política.
              </p>

              <h2>11. Enlaces a Terceros</h2>
              <p>
                Nuestra plataforma puede contener enlaces a sitios web de terceros. No somos 
                responsables de las prácticas de privacidad de estos sitios. Le recomendamos 
                leer sus políticas de privacidad.
              </p>

              <h2>12. Cambios a esta Política</h2>
              <p>
                Podemos actualizar esta política periódicamente. Los cambios significativos serán 
                notificados por email o mediante aviso en la plataforma. La fecha de &quot;Última 
                actualización&quot; al inicio indica cuándo se realizó la última modificación.
              </p>

              <h2>13. Contacto</h2>
              <p>
                Para preguntas sobre esta política de privacidad o para ejercer sus derechos, 
                puede contactarnos:
              </p>
              <ul>
                <li><strong>Email:</strong> info@lingowow.com</li>
                <li><strong>Teléfono:</strong> +51 902 518 947</li>
                <li><strong>Dirección:</strong> Callao, Perú</li>
              </ul>

              <h2>14. Consentimiento</h2>
              <p>
                Al utilizar nuestros servicios, usted consiente la recopilación y uso de su 
                información según se describe en esta Política de Privacidad.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
