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

export default function TerminosPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <LegalTextRenderer
          title="Términos de Servicio"
          lastUpdated="1 de octubre de 2025"
          showImportantNotice
          importantNoticeText="LEA DETENIDAMENTE ESTOS TÉRMINOS ANTES DE UTILIZAR EL SERVICIO. AL ACCEDER O UTILIZAR LOS SERVICIOS DE LINGOWOW, USTED ACEPTA QUEDAR VINCULADO POR ESTOS TÉRMINOS. SI NO ESTÁ DE ACUERDO, NO DEBE ACCEDER NI UTILIZAR EL SERVICIO."
        >
          <LegalSection number="1" title="Aceptación de los Términos">
            <LegalParagraph>
              Al acceder y utilizar los servicios de Lingowow, usted acepta estar sujeto a estos 
              Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, 
              no debe utilizar nuestros servicios.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="2" title="Descripción del Servicio">
            <LegalParagraph>
              Lingowow proporciona servicios de enseñanza de idiomas en línea a través de clases 
              en vivo por videollamada con profesores certificados. Nuestros servicios incluyen:
            </LegalParagraph>
            <LegalList items={[
              'Clases individuales y grupales en tiempo real',
              'Materiales didácticos digitales',
              'Acceso a plataforma de aprendizaje',
              'Seguimiento de progreso',
              'Soporte técnico y académico'
            ]} />
          </LegalSection>

          <LegalSection number="3" title="Registro y Cuenta de Usuario">
            <LegalParagraph>
              Para utilizar nuestros servicios, debe crear una cuenta proporcionando información 
              precisa y completa. Usted es responsable de:
            </LegalParagraph>
            <LegalList items={[
              'Mantener la confidencialidad de su contraseña',
              'Todas las actividades que ocurran bajo su cuenta',
              'Notificarnos inmediatamente de cualquier uso no autorizado',
              'Proporcionar información veraz y actualizada'
            ]} />
          </LegalSection>

          <LegalSection number="4" title="Planes y Pagos">
            <LegalSubsection number="4.1" title="Suscripciones">
              <LegalParagraph>
                Ofrecemos diferentes planes de suscripción mensual. Los pagos se procesan 
                automáticamente al inicio de cada período de facturación.
              </LegalParagraph>
            </LegalSubsection>
            
            <LegalSubsection number="4.2" title="Métodos de Pago">
              <LegalParagraph>
                Aceptamos tarjetas de crédito, débito y otros métodos de pago electrónicos. 
                Al proporcionar información de pago, garantiza que está autorizado para usar 
                el método de pago seleccionado.
              </LegalParagraph>
            </LegalSubsection>

            <LegalSubsection number="4.3" title="Reembolsos">
              <LegalHighlight variant="info">
                <LegalParagraph>
                  <strong>Garantía de satisfacción:</strong> Ofrecemos garantía de satisfacción de 30 días. 
                  Si no está satisfecho con nuestro servicio durante el primer mes, puede solicitar un 
                  reembolso completo. Después de este período, no se realizan reembolsos por períodos 
                  de facturación ya iniciados.
                </LegalParagraph>
              </LegalHighlight>
            </LegalSubsection>
          </LegalSection>

          <LegalSection number="5" title="Cancelación y Modificación">
            <LegalSubsection number="5.1" title="Cancelación de Suscripción">
              <LegalParagraph>
                Puede cancelar su suscripción en cualquier momento con 15 días de antelación. 
                La cancelación será efectiva al final del período de facturación actual.
              </LegalParagraph>
            </LegalSubsection>

            <LegalSubsection number="5.2" title="Cancelación de Clases">
              <LegalParagraph>
                Puede cancelar o reprogramar clases con al menos 24 horas de antelación sin cargo. 
                Cancelaciones con menos de 24 horas se considerarán como clases tomadas.
              </LegalParagraph>
            </LegalSubsection>
          </LegalSection>

          <LegalSection number="6" title="Conducta del Usuario">
            <LegalParagraph>Al utilizar nuestros servicios, usted se compromete a:</LegalParagraph>
            <LegalList items={[
              'Tratar a profesores y personal con respeto',
              'Asistir puntualmente a las clases programadas',
              'No compartir materiales didácticos con terceros',
              'No grabar clases sin consentimiento previo',
              'No utilizar el servicio para fines ilegales o no autorizados'
            ]} />
          </LegalSection>

          <LegalSection number="7" title="Propiedad Intelectual">
            <LegalParagraph>
              Todos los materiales, contenidos, marcas y recursos proporcionados por Lingowow 
              son propiedad de la empresa o sus licenciantes. No puede reproducir, distribuir 
              o crear obras derivadas sin autorización expresa.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="8" title="Limitación de Responsabilidad">
            <LegalParagraph>Lingowow no será responsable por:</LegalParagraph>
            <LegalList items={[
              'Interrupciones del servicio por causas técnicas o de fuerza mayor',
              'Pérdida de datos o información',
              'Resultados específicos de aprendizaje (el progreso depende del estudiante)',
              'Problemas técnicos en el equipo o conexión del usuario'
            ]} />
          </LegalSection>

          <LegalSection number="9" title="Modificaciones del Servicio">
            <LegalParagraph>
              Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto 
              del servicio en cualquier momento, con previo aviso cuando sea posible.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="10" title="Modificaciones de los Términos">
            <LegalParagraph>
              Podemos actualizar estos términos periódicamente. Los cambios significativos serán 
              notificados por email. El uso continuado del servicio después de los cambios 
              constituye aceptación de los nuevos términos.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="11" title="Terminación">
            <LegalParagraph>Podemos suspender o terminar su acceso al servicio si:</LegalParagraph>
            <LegalList items={[
              'Viola estos términos de servicio',
              'Proporciona información falsa',
              'Realiza actividades fraudulentas',
              'Presenta conducta inapropiada hacia el personal'
            ]} />
          </LegalSection>

          <LegalSection number="12" title="Ley Aplicable">
            <LegalParagraph>
              Estos términos se rigen por las leyes de Perú. Cualquier disputa será resuelta 
              en los tribunales competentes de Callao, Perú.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="13" title="Contacto">
            <LegalParagraph>Para preguntas sobre estos términos, puede contactarnos en:</LegalParagraph>
            <LegalList items={[
              'Email: info@lingowow.com',
              'Teléfono: +51 902 518 947',
              'Dirección: Callao, Perú'
            ]} />
          </LegalSection>

          <LegalSection number="14" title="Separabilidad">
            <LegalParagraph>
              Si alguna disposición de estos términos se considera inválida o inaplicable, 
              las disposiciones restantes continuarán en pleno vigor y efecto.
            </LegalParagraph>
          </LegalSection>

          <LegalSection number="15" title="Acuerdo Completo">
            <LegalParagraph>
              Estos términos constituyen el acuerdo completo entre usted y Lingowow respecto 
              al uso de nuestros servicios.
            </LegalParagraph>
          </LegalSection>
        </LegalTextRenderer>
      </main>

      <Footer />
    </div>
  )
}
