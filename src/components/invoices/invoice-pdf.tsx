'use client'

import { Button } from '@/components/ui/button'

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Download, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { InvoiceWithDetails } from '@/types/invoice'

interface InvoicePDFProps {
  invoice: InvoiceWithDetails
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const generatePDF = async () => {
    if (!invoiceRef.current) return

    try {
      setIsGenerating(true)

      const element = invoiceRef.current
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95) // JPEG is faster and smaller than PNG
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`)
    } catch (error) {
      console.error('Error formats PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={generatePDF} disabled={isGenerating}>
        {isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Descargar PDF
      </Button>

      {/* Hidden printable area */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, width: '210mm' }}>
        <div ref={invoiceRef} className="p-10 bg-white text-black font-sans min-h-[297mm]">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-bold text-blue-800 mb-2">FACTURA</h1>
              <p className="text-gray-500 text-sm">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              {/* Logo placeholder - replace with actual logo */}
              <div className="text-2xl font-bold text-blue-600 mb-2">Lingowow</div>
              <p className="text-sm text-gray-600">Callao, Callao, Perú</p>
              <p className="text-sm text-gray-600">payments@lingowow.com</p>
            </div>
          </div>

          <div className="border-t-2 border-gray-100 my-6"></div>

          {/* Customer Info */}
          <div className="mb-10">
            <h3 className="text-gray-500 uppercase text-xs font-semibold mb-2">Facturar a:</h3>
            <p className="font-bold">
              {invoice.user.name} {invoice.user.lastName}
            </p>
            <p className="text-gray-600">{invoice.user.email}</p>
          </div>

          {/* Dates */}
          <div className="flex gap-10 mb-10">
            <div>
              <h3 className="text-gray-500 uppercase text-xs font-semibold mb-1">Fecha de pago:</h3>
              <p className="font-medium">
                {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Pendiente'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-500 uppercase text-xs font-semibold mb-1">
                Método de pago:
              </h3>
              <p className="font-medium capitalize">{invoice.paymentMethod || 'N/A'}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-10 border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="py-3 px-4 font-semibold text-gray-600 text-sm w-1/2">Descripción</th>
                <th className="py-3 px-4 font-semibold text-gray-600 text-sm">Cantidad</th>
                <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-right">Precio</th>
                <th className="py-3 px-4 font-semibold text-gray-600 text-sm text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-4 px-4 text-sm">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    {(item.productId || item.planId) && (
                      <span className="text-xs text-gray-400">
                        SKU: {item.product?.sku || item.plan?.slug || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{item.quantity}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 text-right">
                    {invoice.currency} {item.price.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-800 text-right">
                    {invoice.currency} {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-1/3">
              <div className="flex justify-between py-2 text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>
                  {invoice.currency} {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm text-gray-600">
                <span>Descuento:</span>
                <span>
                  - {invoice.currency} {invoice.discount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 text-sm text-gray-600">
                <span>Impuesto:</span>
                <span>
                  {invoice.currency} {invoice.tax.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-200 my-2"></div>
              <div className="flex justify-between py-2 text-lg font-bold text-blue-900">
                <span>Total:</span>
                <span>
                  {invoice.currency} {invoice.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 text-center text-xs text-gray-400">
            <p>Gracias por tu compra.</p>
            <p>Si tienes alguna pregunta sobre esta factura, contáctanos a payments@lingowow.com</p>
          </div>
        </div>
      </div>
    </>
  )
}
