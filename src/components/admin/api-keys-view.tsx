'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Copy, KeyRound, Loader2, ShieldAlert, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MCP_SCOPE_PRESETS, MCP_SCOPES, hasAnyMcpWriteScope } from '@/lib/mcp/scopes'

interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

const LEGACY_SCOPES = [
  { scope: 'lessons:read', description: 'Acceso de lectura a lecciones' },
  { scope: 'lessons:write', description: 'Edición de lecciones' },
  { scope: 'exams:read', description: 'Acceso de lectura a exámenes' },
  { scope: 'exams:write', description: 'Edición de exámenes' },
]

const MCP_WRITE_MAX_DAYS = 90
const DEFAULT_EXPIRES_DAYS = 30

export function ApiKeysAdminView() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number | ''>(DEFAULT_EXPIRES_DAYS)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['lessons:read'])
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const requiresWriteRules = useMemo(() => hasAnyMcpWriteScope(selectedScopes), [selectedScopes])

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/api-keys', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al listar API keys')
      setKeys(json.data ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al listar API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]
    )
  }

  function applyPreset(presetId: string) {
    const preset = MCP_SCOPE_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setSelectedScopes(preset.scopes)
    if (preset.destructive && (typeof expiresInDays !== 'number' || expiresInDays > MCP_WRITE_MAX_DAYS)) {
      setExpiresInDays(MCP_WRITE_MAX_DAYS)
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Indica un nombre para la API key')
      return
    }
    if (selectedScopes.length === 0) {
      toast.error('Selecciona al menos un scope')
      return
    }
    if (requiresWriteRules) {
      if (typeof expiresInDays !== 'number' || expiresInDays < 1 || expiresInDays > MCP_WRITE_MAX_DAYS) {
        toast.error(`Las keys con scopes MCP de escritura requieren expiración 1-${MCP_WRITE_MAX_DAYS} días`)
        return
      }
    }

    setCreating(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scopes: selectedScopes,
          expiresInDays: typeof expiresInDays === 'number' ? expiresInDays : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo crear la API key')

      setCreatedKey(json.data.key)
      setName('')
      setSelectedScopes(['lessons:read'])
      setExpiresInDays(DEFAULT_EXPIRES_DAYS)
      await fetchKeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear API key')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(keyId: string, keyName: string) {
    if (!confirm(`¿Revocar la API key "${keyName}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al revocar')
      toast.success('API key revocada')
      await fetchKeys()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al revocar')
    }
  }

  function handleCopyKey() {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey).then(() => toast.success('Copiada al portapapeles'))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <KeyRound className="h-6 w-6" /> API Keys
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tokens de acceso para integraciones, incluido el servidor MCP. Las claves nuevas
          solo se muestran una vez.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear nueva API key</CardTitle>
          <CardDescription>
            Asigna scopes granulares. Los scopes MCP de escritura requieren rol ADMIN y expiración
            obligatoria (máx {MCP_WRITE_MAX_DAYS} días).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="api-key-name">Nombre</Label>
              <Input
                id="api-key-name"
                placeholder="ej. Agente MCP de soporte"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="api-key-expires">Expira en (días)</Label>
              <Input
                id="api-key-expires"
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) =>
                  setExpiresInDays(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Sin expiración"
              />
              {requiresWriteRules && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Requerida (1-{MCP_WRITE_MAX_DAYS}) para scopes MCP de escritura.
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label>Presets MCP:</Label>
              {MCP_SCOPE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={preset.destructive ? 'destructive' : 'outline'}
                  size="sm"
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedScopes([])}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ScopeGroup
              title="Scopes MCP"
              scopes={MCP_SCOPES.map((s) => ({
                scope: s.scope,
                description: s.description,
                badge: s.action === 'write' ? 'write' : 'read',
              }))}
              selected={selectedScopes}
              onToggle={toggleScope}
            />
            <ScopeGroup
              title="Otros scopes"
              scopes={LEGACY_SCOPES.map((s) => ({ scope: s.scope, description: s.description }))}
              selected={selectedScopes}
              onToggle={toggleScope}
            />
          </div>

          {requiresWriteRules && (
            <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Esta key tendrá permisos de escritura sobre datos administrativos. Solo se asignará
                si tu usuario tiene rol ADMIN. La expiración es obligatoria.
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear API key
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus API keys</CardTitle>
          <CardDescription>
            Solo se muestran las keys del usuario actualmente autenticado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : keys.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no tienes API keys.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.prefix}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge
                            key={s}
                            variant={s.startsWith('mcp:') ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.isActive ? 'default' : 'outline'}>
                        {k.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Sin expiración'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(k.id, k.name)}
                        aria-label={`Revocar ${k.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu API key</DialogTitle>
            <DialogDescription>
              Cópiala ahora — esta clave solo se muestra una vez. Después solo verás el prefijo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded bg-muted p-3 font-mono text-sm break-all">
            {createdKey}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyKey}>
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => setCreatedKey(null)}>He guardado la key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ScopeGroupProps {
  title: string
  scopes: { scope: string; description: string; badge?: string }[]
  selected: string[]
  onToggle: (scope: string) => void
}

function ScopeGroup({ title, scopes, selected, onToggle }: ScopeGroupProps) {
  return (
    <div className="rounded border p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {scopes.map((s) => (
          <label key={s.scope} className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={selected.includes(s.scope)}
              onCheckedChange={() => onToggle(s.scope)}
              id={`scope-${s.scope}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{s.scope}</span>
                {s.badge && (
                  <Badge variant={s.badge === 'write' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {s.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
