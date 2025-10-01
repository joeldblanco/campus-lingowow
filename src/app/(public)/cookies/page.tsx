import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer-3'
import { Badge } from '@/components/ui/badge'

export default function CookiesPage() {
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
                Política de Cookies
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
              <h2>1. ¿Qué son las Cookies?</h2>
              <p>
                Las cookies son pequeños archivos de texto que se almacenan en su dispositivo 
                (computadora, tablet o móvil) cuando visita un sitio web. Las cookies permiten 
                que el sitio web reconozca su dispositivo y recuerde información sobre su visita.
              </p>

              <h2>2. ¿Cómo Utilizamos las Cookies?</h2>
              <p>
                En Lingowow utilizamos cookies para mejorar su experiencia en nuestra plataforma, 
                personalizar contenido, analizar el tráfico y proporcionar funcionalidades esenciales 
                del servicio.
              </p>

              <h2>3. Tipos de Cookies que Utilizamos</h2>
              
              <h3>3.1 Cookies Estrictamente Necesarias</h3>
              <p>
                Estas cookies son esenciales para que la plataforma funcione correctamente. 
                Sin ellas, no podríamos proporcionar nuestros servicios.
              </p>
              <ul>
                <li><strong>Cookies de sesión:</strong> Mantienen su sesión activa mientras navega</li>
                <li><strong>Cookies de autenticación:</strong> Verifican su identidad y mantienen su login</li>
                <li><strong>Cookies de seguridad:</strong> Protegen contra actividades fraudulentas</li>
              </ul>
              <p><em>Estas cookies no pueden ser desactivadas.</em></p>

              <h3>3.2 Cookies de Funcionalidad</h3>
              <p>
                Permiten que el sitio web recuerde sus preferencias y proporcione funciones mejoradas.
              </p>
              <ul>
                <li><strong>Preferencias de idioma:</strong> Recuerdan su idioma preferido</li>
                <li><strong>Configuración de usuario:</strong> Guardan sus preferencias de interfaz</li>
                <li><strong>Recordar información:</strong> Mantienen datos de formularios</li>
              </ul>

              <h3>3.3 Cookies de Rendimiento y Análisis</h3>
              <p>
                Nos ayudan a entender cómo los usuarios interactúan con nuestra plataforma para 
                mejorar el servicio.
              </p>
              <ul>
                <li><strong>Google Analytics:</strong> Analiza el tráfico y comportamiento de usuarios</li>
                <li><strong>Métricas de rendimiento:</strong> Miden la velocidad y rendimiento del sitio</li>
                <li><strong>Análisis de uso:</strong> Identifican páginas más visitadas y patrones de navegación</li>
              </ul>

              <h3>3.4 Cookies de Marketing y Publicidad</h3>
              <p>
                Utilizadas para mostrar anuncios relevantes y medir la efectividad de campañas publicitarias.
              </p>
              <ul>
                <li><strong>Cookies de redes sociales:</strong> Permiten compartir contenido en redes sociales</li>
                <li><strong>Cookies de remarketing:</strong> Muestran anuncios personalizados</li>
                <li><strong>Seguimiento de conversiones:</strong> Miden la efectividad de anuncios</li>
              </ul>

              <h2>4. Cookies de Terceros</h2>
              <p>
                Algunos servicios de terceros que utilizamos también pueden establecer cookies en 
                su dispositivo:
              </p>
              <ul>
                <li><strong>Google Analytics:</strong> Para análisis de tráfico web</li>
                <li><strong>Stripe/PayPal:</strong> Para procesamiento de pagos</li>
                <li><strong>Jitsi/Zoom:</strong> Para videollamadas</li>
                <li><strong>Facebook Pixel:</strong> Para publicidad en redes sociales</li>
              </ul>
              <p>
                Estas cookies están sujetas a las políticas de privacidad de los respectivos terceros.
              </p>

              <h2>5. Duración de las Cookies</h2>
              
              <h3>5.1 Cookies de Sesión</h3>
              <p>
                Se eliminan automáticamente cuando cierra su navegador. Se utilizan principalmente 
                para mantener su sesión activa.
              </p>

              <h3>5.2 Cookies Persistentes</h3>
              <p>
                Permanecen en su dispositivo durante un período específico o hasta que las elimine 
                manualmente. Duración típica:
              </p>
              <ul>
                <li>Cookies de preferencias: 1 año</li>
                <li>Cookies de análisis: 2 años</li>
                <li>Cookies de marketing: 90 días</li>
              </ul>

              <h2>6. Cómo Gestionar las Cookies</h2>
              
              <h3>6.1 Configuración del Navegador</h3>
              <p>
                Puede controlar y/o eliminar cookies según desee. Puede eliminar todas las cookies 
                que ya están en su dispositivo y configurar la mayoría de los navegadores para 
                evitar que se coloquen.
              </p>
              <p><strong>Instrucciones por navegador:</strong></p>
              <ul>
                <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
                <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
                <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
                <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio</li>
              </ul>

              <h3>6.2 Panel de Preferencias de Cookies</h3>
              <p>
                Al visitar nuestra plataforma por primera vez, se le presentará un banner de cookies 
                donde puede aceptar o rechazar cookies no esenciales. Puede cambiar sus preferencias 
                en cualquier momento desde la configuración de su cuenta.
              </p>

              <h3>6.3 Consecuencias de Desactivar Cookies</h3>
              <p>
                Si desactiva las cookies, algunas funciones de la plataforma pueden no funcionar 
                correctamente:
              </p>
              <ul>
                <li>No podrá mantener su sesión iniciada</li>
                <li>Sus preferencias no se guardarán</li>
                <li>Algunas funciones interactivas pueden no estar disponibles</li>
                <li>La experiencia de usuario puede verse afectada</li>
              </ul>

              <h2>7. Cookies Específicas que Utilizamos</h2>
              <table className="min-w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-2 text-left">Nombre</th>
                    <th className="border border-slate-300 px-4 py-2 text-left">Tipo</th>
                    <th className="border border-slate-300 px-4 py-2 text-left">Duración</th>
                    <th className="border border-slate-300 px-4 py-2 text-left">Propósito</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-4 py-2">session_id</td>
                    <td className="border border-slate-300 px-4 py-2">Necesaria</td>
                    <td className="border border-slate-300 px-4 py-2">Sesión</td>
                    <td className="border border-slate-300 px-4 py-2">Mantiene sesión activa</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-4 py-2">auth_token</td>
                    <td className="border border-slate-300 px-4 py-2">Necesaria</td>
                    <td className="border border-slate-300 px-4 py-2">30 días</td>
                    <td className="border border-slate-300 px-4 py-2">Autenticación de usuario</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-4 py-2">user_prefs</td>
                    <td className="border border-slate-300 px-4 py-2">Funcionalidad</td>
                    <td className="border border-slate-300 px-4 py-2">1 año</td>
                    <td className="border border-slate-300 px-4 py-2">Preferencias de usuario</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-4 py-2">_ga</td>
                    <td className="border border-slate-300 px-4 py-2">Análisis</td>
                    <td className="border border-slate-300 px-4 py-2">2 años</td>
                    <td className="border border-slate-300 px-4 py-2">Google Analytics</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-4 py-2">_fbp</td>
                    <td className="border border-slate-300 px-4 py-2">Marketing</td>
                    <td className="border border-slate-300 px-4 py-2">90 días</td>
                    <td className="border border-slate-300 px-4 py-2">Facebook Pixel</td>
                  </tr>
                </tbody>
              </table>

              <h2>8. Tecnologías Similares</h2>
              <p>
                Además de cookies, utilizamos otras tecnologías similares:
              </p>
              <ul>
                <li><strong>Local Storage:</strong> Almacena datos localmente en su navegador</li>
                <li><strong>Session Storage:</strong> Almacena datos temporalmente durante la sesión</li>
                <li><strong>Web Beacons:</strong> Pequeñas imágenes para rastrear interacciones</li>
                <li><strong>Pixels de seguimiento:</strong> Para medir conversiones y eventos</li>
              </ul>

              <h2>9. Actualizaciones de esta Política</h2>
              <p>
                Podemos actualizar esta Política de Cookies periódicamente para reflejar cambios 
                en nuestras prácticas o por razones legales. La fecha de &quot;Última actualización&quot; 
                al inicio indica cuándo se realizó la última modificación.
              </p>

              <h2>10. Más Información</h2>
              <p>
                Para obtener más información sobre cómo protegemos su privacidad, consulte nuestra 
                <a href="/privacidad" className="text-primary hover:underline"> Política de Privacidad</a>.
              </p>

              <h2>11. Contacto</h2>
              <p>
                Si tiene preguntas sobre nuestra Política de Cookies, puede contactarnos:
              </p>
              <ul>
                <li><strong>Email:</strong> info@lingowow.com</li>
                <li><strong>Teléfono:</strong> +51 902 518 947</li>
                <li><strong>Dirección:</strong> Callao, Perú</li>
              </ul>

              <h2>12. Consentimiento</h2>
              <p>
                Al continuar utilizando nuestra plataforma después de que se le haya informado 
                sobre el uso de cookies, usted consiente el uso de cookies según se describe 
                en esta política.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
