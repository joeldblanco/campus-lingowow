'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FinancialReportRow } from '@/lib/actions/finance'

interface FinancialMovementsTableProps {
  rows: FinancialReportRow[]
  basis: 'cash' | 'accrual'
}

const sourceLabels: Record<string, string> = {
  MANUAL: 'Manual',
  INVOICE: 'Factura',
  TEACHER_PAYABLE: 'Pago devengado',
  TEACHER_PAYMENT_CONFIRMATION: 'Pago confirmado',
  TEACHER_INCENTIVE: 'Incentivo',
  REFUND: 'Reembolso',
  ADJUSTMENT: 'Ajuste',
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function FinancialMovementsTable({ rows, basis }: FinancialMovementsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle de Caja</CardTitle>
        <CardDescription>
          {basis === 'cash'
            ? 'Facturas y costo docente atribuidos al período o rango seleccionado, más otras salidas manuales por fecha.'
            : 'Devengado: obligaciones e ingresos reconocidos dentro del rango seleccionado.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Entró / Salió</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Relacionado</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay movimientos para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{formatDate(row.effectiveDate)}</div>
                    <div className="text-xs text-muted-foreground">
                      Devengado: {formatDate(row.accrualDate)}
                      {row.cashDate ? ` • Caja: ${formatDate(row.cashDate)}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.direction === 'INCOME' ? 'default' : 'secondary'}>
                      {row.direction === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {sourceLabels[row.sourceType] || row.sourceType}
                      </Badge>
                      {row.isManual && <Badge variant="secondary">Manual</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.category}</div>
                    {row.subcategory && (
                      <div className="text-xs text-muted-foreground">{row.subcategory}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[320px] whitespace-normal font-medium">
                      {row.description}
                    </div>
                    {row.notes && (
                      <div className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                        {row.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{row.counterparty || '-'}</TableCell>
                  <TableCell>{row.academicPeriodName || '-'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(row.netAmount, row.currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
