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
        scale: 2,
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

      {/* Hidden printable area — uses only inline styles so html2canvas never encounters oklch() from Tailwind v4 stylesheets */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, width: '794px' }}>
        <div
          ref={invoiceRef}
          style={{
            padding: '40px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            minHeight: '1123px',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '40px',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#1e40af',
                  marginBottom: '8px',
                  margin: '0 0 8px 0',
                }}
              >
                FACTURA
              </h1>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                #{invoice.invoiceNumber}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#2563eb',
                  marginBottom: '8px',
                }}
              >
                Lingowow
              </div>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 2px 0' }}>
                Callao, Callao, Perú
              </p>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: 0 }}>payments@lingowow.com</p>
            </div>
          </div>

          <div style={{ borderTop: '2px solid #f3f4f6', margin: '24px 0' }}></div>

          {/* Customer Info */}
          <div style={{ marginBottom: '40px' }}>
            <h3
              style={{
                color: '#6b7280',
                textTransform: 'uppercase',
                fontSize: '11px',
                fontWeight: '600',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Facturar a:
            </h3>
            <p style={{ fontWeight: '700', margin: '0 0 4px 0' }}>
              {invoice.user.name} {invoice.user.lastName}
            </p>
            <p style={{ color: '#4b5563', margin: 0 }}>{invoice.user.email}</p>
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
            <div>
              <h3
                style={{
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  fontWeight: '600',
                  margin: '0 0 4px 0',
                }}
              >
                Fecha de pago:
              </h3>
              <p style={{ fontWeight: '500', margin: 0 }}>
                {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Pendiente'}
              </p>
            </div>
            <div>
              <h3
                style={{
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  fontWeight: '600',
                  margin: '0 0 4px 0',
                }}
              >
                Método de pago:
              </h3>
              <p style={{ fontWeight: '500', margin: 0, textTransform: 'capitalize' }}>
                {invoice.paymentMethod || 'N/A'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', marginBottom: '40px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    fontWeight: '600',
                    color: '#4b5563',
                    fontSize: '13px',
                    width: '50%',
                  }}
                >
                  Descripción
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontWeight: '600',
                    color: '#4b5563',
                    fontSize: '13px',
                  }}
                >
                  Cantidad
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontWeight: '600',
                    color: '#4b5563',
                    fontSize: '13px',
                    textAlign: 'right',
                  }}
                >
                  Precio
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    fontWeight: '600',
                    color: '#4b5563',
                    fontSize: '13px',
                    textAlign: 'right',
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px', fontSize: '13px' }}>
                    <p style={{ fontWeight: '500', color: '#1f2937', margin: '0 0 2px 0' }}>
                      {item.name}
                    </p>
                    {(item.productId || item.planId) && (
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        SKU: {item.product?.sku || item.plan?.slug || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#4b5563' }}>
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '13px',
                      color: '#4b5563',
                      textAlign: 'right',
                    }}
                  >
                    {invoice.currency} {item.price.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1f2937',
                      textAlign: 'right',
                    }}
                  >
                    {invoice.currency} {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '33%' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '13px',
                  color: '#4b5563',
                }}
              >
                <span>Subtotal:</span>
                <span>
                  {invoice.currency} {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '13px',
                  color: '#4b5563',
                }}
              >
                <span>Descuento:</span>
                <span>
                  - {invoice.currency} {invoice.discount.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '13px',
                  color: '#4b5563',
                }}
              >
                <span>Impuesto:</span>
                <span>
                  {invoice.currency} {invoice.tax.toFixed(2)}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }}></div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1e3a8a',
                }}
              >
                <span>Total:</span>
                <span>
                  {invoice.currency} {invoice.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{ marginTop: '80px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}
          >
            <p style={{ margin: '0 0 4px 0' }}>Gracias por tu compra.</p>
            <p style={{ margin: 0 }}>
              Si tienes alguna pregunta sobre esta factura, contáctanos a payments@lingowow.com
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
