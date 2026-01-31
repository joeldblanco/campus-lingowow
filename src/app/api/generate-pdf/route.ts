import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  let browser = null

  try {
    const { html, reportId, generatedDate } = await req.json()

    if (!html) {
      return NextResponse.json({ error: 'HTML content required' }, { status: 400 })
    }

    const reportIdText = reportId || 'LW-EXAM'
    const dateText = generatedDate || new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })

    // --- CONFIGURACIÓN DINÁMICA DEL NAVEGADOR ---
    if (process.env.NODE_ENV === 'production') {
      // ESTO SE EJECUTA EN VERCEL / PRODUCCIÓN
      const chromiumModule = await import('@sparticuz/chromium')
      const chromium = chromiumModule.default
      const puppeteer = (await import('puppeteer-core')).default

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    } else {
      // ESTO SE EJECUTA EN TU COMPUTADORA (LOCAL)
      const puppeteer = (await import('puppeteer')).default

      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      })
    }
    // -------------------------------------------

    const page = await browser.newPage()

    // Establecer viewport más ancho para mejor renderizado
    await page.setViewport({ width: 1200, height: 800 })

    await page.setContent(html, {
      // networkidle0 espera a que no haya conexiones de red (ej. carga de Tailwind CDN, fuentes, imágenes)
      waitUntil: 'networkidle0',
      timeout: 60000
    })

    // Inyectar estilos CSS para controlar los saltos de página
    await page.addStyleTag({
      content: `
        @media print {
          /* Ocultar el footer del HTML completamente */
          footer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          /* Evitar cortes dentro de elementos importantes - pero NO en contenedores de preguntas */
          header,
          .rounded-xl {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Las opciones de respuesta individuales NO deben cortarse */
          .flex.items-center.justify-between.p-3.rounded {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Evitar elementos huérfanos */
          h1, h2, h3, h4 {
            break-after: avoid;
            page-break-after: avoid;
          }
          
          /* El contenedor principal ocupa todo el ancho */
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .max-w-\\[850px\\] {
            max-width: 100% !important;
            width: 100% !important;
          }
          
          /* Forzar grid de 3 columnas en las cards de resumen */
          .grid.grid-cols-1.md\\:grid-cols-3 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem !important;
          }
          
          /* Forzar grid de 2 columnas en info */
          .grid.grid-cols-1.md\\:grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
          }
        }
      `
    })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '30mm',
        left: '10mm',
      },
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 8px; padding: 5mm 10mm; border-top: 1px solid #e2e8f0; color: #64748b; font-family: system-ui, sans-serif;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Generado el ${dateText}</span>
            <span>ID del Reporte: ${reportIdText}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>© ${new Date().getFullYear()} Plataforma Lingowow. Todos los derechos reservados.</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>
        </div>
      `,
    })

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=reporte-academico.pdf',
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  } finally {
    // Siempre cerrar el navegador para no dejar procesos "zombies" en el servidor
    if (browser) {
      await browser.close()
    }
  }
}
