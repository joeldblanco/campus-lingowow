'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importPaypalInvoice } from '@/lib/actions/commercial'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ImportPaypalDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [orderId, setOrderId] = useState('')

    const handleImport = async () => {
        if (!orderId) {
            toast.error('Por favor ingresa el ID de la orden')
            return
        }

        try {
            setIsLoading(true)
            const result = await importPaypalInvoice(orderId)

            if (result.success) {
                toast.success('Factura importada correctamente')
                setOpen(false)
                setOrderId('')
            } else {
                toast.error(result.error || 'Error al importar la factura')
            }
        } catch (error) {
            console.error(error)
            toast.error('Ocurrió un error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Importar Factura de PayPal</DialogTitle>
                    <DialogDescription>
                        Ingresa el ID de la orden de PayPal para generar la factura automáticamente.
                        El sistema buscará la orden, verificará que esté pagada y creará la factura.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="orderId" className="text-right">
                            Order ID
                        </Label>
                        <Input
                            id="orderId"
                            value={orderId}
                            onChange={(e) => {
                                const val = e.target.value
                                // Extract ID if URL is pasted
                                // Matches patterns like: invoice/p/#ID, invoice/s/ID, checking out with token=ID, etc.
                                // Simple approach: if contains http/https, try to find the last alphanumeric segment or specific patterns
                                if (val.includes('http')) {
                                    const invoiceMatch = val.match(/invoice\/p\/#([A-Za-z0-9]+)|invoice\/s\/([A-Za-z0-9]+)/)
                                    if (invoiceMatch) {
                                        setOrderId(invoiceMatch[1] || invoiceMatch[2])
                                        return
                                    }
                                    const tokenMatch = val.match(/token=([A-Za-z0-9]+)/)
                                    if (tokenMatch) {
                                        setOrderId(tokenMatch[1])
                                        return
                                    }
                                    // Fallback: take last part of path
                                    const parts = val.split('/')
                                    const last = parts[parts.length - 1].replace('#', '')
                                    if (last && last.length > 5) {
                                        setOrderId(last)
                                        return
                                    }
                                }
                                setOrderId(val)
                            }}
                            placeholder="Ej: 5W840924G1436423K o pega el enlace"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleImport} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importar desde PayPal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
