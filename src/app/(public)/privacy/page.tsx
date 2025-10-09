import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import {
  LegalTextRenderer,
  LegalSection,
  LegalSubsection,
  LegalParagraph,
  LegalList,
  LegalHighlight,
} from '@/components/legal/LegalTextRenderer'

export default function PrivacidadPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <LegalTextRenderer
          title="Política de Privacidad"
          lastUpdated="1 de octubre de 2025"
          showImportantNotice
          importantNoticeText="En Lingowow, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal."
        >
          <LegalSection number="1" title="Información que Recopilamos">
            <LegalSubsection number="1.1" title="Información Personal">
              <LegalParagraph>Recopilamos la siguiente información cuando se registra o usa nuestros servicios:</LegalParagraph>
              <LegalList items={[
                'Nombre completo',
                'Dirección de correo electrónico',
                'Número de teléfono',
                'Información de pago (procesada por terceros seguros)',
                'Idioma nativo y nivel de idioma objetivo',
                'Preferencias de aprendizaje'
              ]} />
            </LegalSubsection>

            <LegalSubsection number="1.2" title="Información de Uso">
              <LegalParagraph>Recopilamos automáticamente información sobre cómo utiliza nuestros servicios:</LegalParagraph>
              <LegalList items={[
                'Registro de clases asistidas',
                'Progreso de aprendizaje y evaluaciones',
                'Interacciones con la plataforma',
                'Dirección IP y tipo de navegador',
                'Datos de cookies y tecnologías similares'
              ]} />
            </LegalSubsection>
          </LegalSection>

          <LegalSection number="2" title="Cómo Utilizamos su Información">
            <LegalParagraph>Utilizamos su información personal para:</LegalParagraph>
            <LegalList items={[
              'Proporcionar y mejorar nuestros servicios educativos',
              'Procesar pagos y gestionar su cuenta',
              'Programar y coordinar clases con profesores',
              'Personalizar su experiencia de aprendizaje',
              'Enviar comunicaciones relacionadas con el servicio',
              'Realizar análisis y mejorar nuestra plataforma',
              'Cumplir con obligaciones legales',
              'Prevenir fraudes y garantizar la seguridad'
            ]} />
          </LegalSection>

          <LegalSection number="3" title="Compartir Información">
            <LegalSubsection number="3.1" title="Con Profesores">
              <LegalParagraph>
                Compartimos información relevante con sus profesores asignados para facilitar 
                la enseñanza personalizada (nombre, nivel, objetivos de aprendizaje).
              </LegalParagraph>
            </LegalSubsection>

            <LegalSubsection number="3.2" title="Con Proveedores de Servicios">
              <LegalParagraph>Compartimos información con terceros que nos ayudan a operar nuestro servicio:</LegalParagraph>
              <LegalList items={[
                'Procesadores de pago (Stripe, PayPal)',
                'Servicios de hosting y almacenamiento en la nube',
                'Herramientas de análisis y marketing',
                'Servicios de videollamada'
              ]} />
            </LegalSubsection>

            <LegalSubsection number="3.3" title="No Vendemos su Información">
              <LegalHighlight variant="success">
                <LegalParagraph>
                  <strong>Compromiso de privacidad:</strong> Nunca vendemos, alquilamos o comercializamos 
                  su información personal a terceros para fines de marketing.
                </LegalParagraph>
              </LegalHighlight>
            </LegalSubsection>
          </LegalSection>

          <LegalSection number="4" title="Seguridad de los Datos">
            <LegalParagraph>Implementamos medidas de seguridad para proteger su información:</LegalParagraph>
            <LegalList items={[
              'Cifrado SSL/TLS para transmisión de datos',
              'Almacenamiento seguro en servidores protegidos',
              'Acceso restringido a información personal',
              'Auditorías de seguridad regulares',
              'Cumplimiento con estándares de la industria'
            ]} />
            <LegalParagraph>
              Sin embargo, ningún método de transmisión por Internet es 100% seguro. 
              Hacemos nuestro mejor esfuerzo, pero no podemos garantizar seguridad absoluta.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="5" title="Retención de Datos">
            <LegalParagraph>
              Conservamos su información personal mientras su cuenta esté activa o según sea 
              necesario para proporcionar servicios. Después de la cancelación de la cuenta:
            </LegalParagraph>
            <LegalList items={[
              'Datos de cuenta: 90 días',
              'Registros de transacciones: 7 años (requisito legal)',
              'Datos de progreso académico: 2 años'
            ]} />
          </LegalSection>

          <LegalSection number="6" title="Sus Derechos">
            <LegalParagraph>Usted tiene derecho a:</LegalParagraph>
            <LegalList items={[
              'Acceso: Solicitar una copia de su información personal',
              'Corrección: Actualizar información inexacta',
              'Eliminación: Solicitar la eliminación de sus datos',
              'Portabilidad: Recibir sus datos en formato estructurado',
              'Oposición: Oponerse a ciertos usos de su información',
              'Restricción: Limitar cómo usamos su información'
            ]} />
            <LegalParagraph>
              Para ejercer estos derechos, contáctenos en <strong>info@lingowow.com</strong>
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="7" title="Contacto">
            <LegalParagraph>
              Para preguntas sobre esta política de privacidad o para ejercer sus derechos, 
              puede contactarnos:
            </LegalParagraph>
            <LegalList items={[
              'Email: info@lingowow.com',
              'Teléfono: +51 902 518 947',
              'Dirección: Callao, Perú'
            ]} />
          </LegalSection>
        </LegalTextRenderer>
      </main>

      <Footer />
    </div>
  )
}
