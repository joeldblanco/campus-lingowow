import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
import {
  LegalTextRenderer,
  LegalSection,
  LegalSubsection,
  LegalParagraph,
  LegalList,
  LegalTable,
} from '@/components/legal/LegalTextRenderer'

export default function CookiesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <LegalTextRenderer
          title="Política de Cookies"
          lastUpdated="1 de octubre de 2025"
          showImportantNotice
          importantNoticeText="En Lingowow utilizamos cookies para mejorar su experiencia en nuestra plataforma, personalizar contenido, analizar el tráfico y proporcionar funcionalidades esenciales del servicio."
        >
          <LegalSection number="1" title="¿Qué son las Cookies?">
            <LegalParagraph>
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo 
              (computadora, tablet o móvil) cuando visita un sitio web. Las cookies permiten 
              que el sitio web reconozca su dispositivo y recuerde información sobre su visita.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="2" title="Tipos de Cookies que Utilizamos">
            <LegalSubsection number="2.1" title="Cookies Estrictamente Necesarias">
              <LegalParagraph>
                Estas cookies son esenciales para que la plataforma funcione correctamente. 
                Sin ellas, no podríamos proporcionar nuestros servicios.
              </LegalParagraph>
              <LegalList items={[
                'Cookies de sesión: Mantienen su sesión activa mientras navega',
                'Cookies de autenticación: Verifican su identidad y mantienen su login',
                'Cookies de seguridad: Protegen contra actividades fraudulentas'
              ]} />
              <LegalParagraph><em>Estas cookies no pueden ser desactivadas.</em></LegalParagraph>
            </LegalSubsection>

            <LegalSubsection number="2.2" title="Cookies de Funcionalidad">
              <LegalParagraph>
                Permiten que el sitio web recuerde sus preferencias y proporcione funciones mejoradas.
              </LegalParagraph>
              <LegalList items={[
                'Preferencias de idioma: Recuerdan su idioma preferido',
                'Configuración de usuario: Guardan sus preferencias de interfaz',
                'Recordar información: Mantienen datos de formularios'
              ]} />
            </LegalSubsection>

            <LegalSubsection number="2.3" title="Cookies de Rendimiento y Análisis">
              <LegalParagraph>
                Nos ayudan a entender cómo los usuarios interactúan con nuestra plataforma para 
                mejorar el servicio.
              </LegalParagraph>
              <LegalList items={[
                'Google Analytics: Analiza el tráfico y comportamiento de usuarios',
                'Métricas de rendimiento: Miden la velocidad y rendimiento del sitio',
                'Análisis de uso: Identifican páginas más visitadas y patrones de navegación'
              ]} />
            </LegalSubsection>
          </LegalSection>

          <LegalSection number="3" title="Cookies de Terceros">
            <LegalParagraph>
              Algunos servicios de terceros que utilizamos también pueden establecer cookies en su dispositivo:
            </LegalParagraph>
            <LegalList items={[
              'Google Analytics: Para análisis de tráfico web',
              'Stripe/PayPal: Para procesamiento de pagos',
              'Jitsi: Para videollamadas',
              'Facebook Pixel: Para publicidad en redes sociales'
            ]} />
            <LegalParagraph>
              Estas cookies están sujetas a las políticas de privacidad de los respectivos terceros.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="4" title="Cookies Específicas que Utilizamos">
            <LegalTable
              headers={['Nombre', 'Tipo', 'Duración', 'Propósito']}
              rows={[
                ['session_id', 'Necesaria', 'Sesión', 'Mantiene sesión activa'],
                ['auth_token', 'Necesaria', '30 días', 'Autenticación de usuario'],
                ['user_prefs', 'Funcionalidad', '1 año', 'Preferencias de usuario'],
                ['_ga', 'Análisis', '2 años', 'Google Analytics'],
                ['_fbp', 'Marketing', '90 días', 'Facebook Pixel']
              ]}
            />
          </LegalSection>

          <LegalSection number="5" title="Cómo Gestionar las Cookies">
            <LegalParagraph>
              Puede controlar y/o eliminar cookies según desee. Puede eliminar todas las cookies 
              que ya están en su dispositivo y configurar la mayoría de los navegadores para 
              evitar que se coloquen.
            </LegalParagraph>
            <LegalParagraph><strong>Instrucciones por navegador:</strong></LegalParagraph>
            <LegalList items={[
              'Chrome: Configuración → Privacidad y seguridad → Cookies',
              'Firefox: Opciones → Privacidad y seguridad → Cookies',
              'Safari: Preferencias → Privacidad → Cookies',
              'Edge: Configuración → Cookies y permisos del sitio'
            ]} />
            
            <LegalSubsection number="5.1" title="Consecuencias de Desactivar Cookies">
              <LegalParagraph>
                Si desactiva las cookies, algunas funciones de la plataforma pueden no funcionar correctamente:
              </LegalParagraph>
              <LegalList items={[
                'No podrá mantener su sesión iniciada',
                'Sus preferencias no se guardarán',
                'Algunas funciones interactivas pueden no estar disponibles',
                'La experiencia de usuario puede verse afectada'
              ]} />
            </LegalSubsection>
          </LegalSection>

          <LegalSection number="6" title="Contacto">
            <LegalParagraph>
              Si tiene preguntas sobre nuestra Política de Cookies, puede contactarnos:
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
