'use client'

import { GrammarTableBlock, GrammarTableColumn, GrammarTableRow } from '@/lib/types/article-blocks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GrammarTableBlockEditorProps {
  block: GrammarTableBlock
  onUpdate: (updates: Partial<GrammarTableBlock>) => void
  isActive: boolean
}

export function GrammarTableBlockEditor({ block, onUpdate }: GrammarTableBlockEditorProps) {
  const addColumn = () => {
    const newColId = `col-${Date.now()}`
    const newColumn: GrammarTableColumn = { id: newColId, header: 'Nueva Columna' }
    const newRows = block.rows.map(row => ({
      ...row,
      cells: { ...row.cells, [newColId]: '' }
    }))
    onUpdate({ 
      columns: [...block.columns, newColumn],
      rows: newRows
    })
  }

  const removeColumn = (colId: string) => {
    if (block.columns.length <= 1) return
    const newColumns = block.columns.filter(c => c.id !== colId)
    const newRows = block.rows.map(row => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [colId]: _removed, ...restCells } = row.cells
      return { ...row, cells: restCells }
    })
    onUpdate({ columns: newColumns, rows: newRows })
  }

  const updateColumnHeader = (colId: string, header: string) => {
    const newColumns = block.columns.map(c => 
      c.id === colId ? { ...c, header } : c
    )
    onUpdate({ columns: newColumns })
  }

  const addRow = () => {
    const newRowId = `row-${Date.now()}`
    const cells: Record<string, string> = {}
    block.columns.forEach(col => { cells[col.id] = '' })
    const newRow: GrammarTableRow = { id: newRowId, cells }
    onUpdate({ rows: [...block.rows, newRow] })
  }

  const removeRow = (rowId: string) => {
    if (block.rows.length <= 1) return
    onUpdate({ rows: block.rows.filter(r => r.id !== rowId) })
  }

  const updateCell = (rowId: string, colId: string, value: string) => {
    const newRows = block.rows.map(row => 
      row.id === rowId 
        ? { ...row, cells: { ...row.cells, [colId]: value } }
        : row
    )
    onUpdate({ rows: newRows })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título de la Tabla</Label>
          <Input
            value={block.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ej: Conjugación del Subjuntivo"
          />
        </div>
        <div className="space-y-2">
          <Label>Pie de tabla (opcional)</Label>
          <Input
            value={block.caption || ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Descripción o nota..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={block.highlightFirstColumn}
          onCheckedChange={(checked) => onUpdate({ highlightFirstColumn: checked })}
        />
        <Label className="text-sm">Resaltar primera columna</Label>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                {block.columns.map((col) => (
                  <th key={col.id} className="p-2 border-b">
                    <div className="flex items-center gap-1">
                      <Input
                        value={col.header}
                        onChange={(e) => updateColumnHeader(col.id, e.target.value)}
                        className="h-8 text-center font-semibold"
                        placeholder="Encabezado"
                      />
                      {block.columns.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeColumn(col.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2 border-b w-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={addColumn}
                    title="Añadir columna"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  {block.columns.map((col, colIndex) => (
                    <td 
                      key={col.id} 
                      className={cn(
                        "p-2",
                        colIndex === 0 && block.highlightFirstColumn && "bg-muted/30 font-medium"
                      )}
                    >
                      <Input
                        value={row.cells[col.id] || ''}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                        className="h-8"
                        placeholder="..."
                      />
                    </td>
                  ))}
                  <td className="p-2 w-10">
                    {block.rows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t bg-muted/30">
          <Button variant="ghost" size="sm" onClick={addRow} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Fila
          </Button>
        </div>
      </div>
    </div>
  )
}
