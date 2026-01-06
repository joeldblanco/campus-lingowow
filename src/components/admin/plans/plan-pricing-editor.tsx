'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Globe, DollarSign, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { upsertPlanPricing } from '@/lib/actions/commercial'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'

export interface PricingData {
  id?: string
  language: string
  price: number
  comparePrice?: number | null
  currency: string
  isActive: boolean
  paypalSku?: string | null
}

interface PlanPricingEditorProps {
  planId: string
  planName: string
  basePrice: number
  baseComparePrice?: number | null
  existingPricing: PricingData[]
  onPricingChange?: (pricing: PricingData[]) => void
  isInline?: boolean
}

export function PlanPricingEditor({
  planId,
  planName,
  basePrice,
  baseComparePrice,
  existingPricing,
  onPricingChange,
  isInline = false,
}: PlanPricingEditorProps) {
  const [pricing, setPricing] = useState<Record<string, PricingData>>(() => {
    const initial: Record<string, PricingData> = {}
    
    for (const lang of SUPPORTED_LANGUAGES) {
      const existing = existingPricing.find(p => p.language === lang.code)
      initial[lang.code] = existing || {
        language: lang.code,
        price: basePrice,
        comparePrice: baseComparePrice,
        currency: 'USD',
        isActive: false,
        paypalSku: null,
      }
    }
    
    return initial
  })
  
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(SUPPORTED_LANGUAGES[0].code)

  const handlePricingChange = (
    language: string,
    field: keyof PricingData,
    value: string | number | boolean | null
  ) => {
    setPricing(prev => {
      const updated = {
        ...prev,
        [language]: {
          ...prev[language],
          [field]: value,
        },
      }
      
      if (onPricingChange) {
        onPricingChange(Object.values(updated))
      }
      
      return updated
    })
  }

  const handleSavePricing = async (language: string) => {
    setSaving(language)
    try {
      const data = pricing[language]
      const result = await upsertPlanPricing({
        planId,
        language,
        price: data.price,
        comparePrice: data.comparePrice,
        currency: data.currency,
        isActive: data.isActive,
        paypalSku: data.paypalSku,
      })

      if (result.success) {
        toast.success(`Precio para ${SUPPORTED_LANGUAGES.find(l => l.code === language)?.name} guardado`)
        
        setPricing(prev => ({
          ...prev,
          [language]: {
            ...prev[language],
            id: result.data?.id,
          },
        }))
      } else {
        toast.error(result.error || 'Error al guardar el precio')
      }
    } catch {
      toast.error('Error inesperado al guardar')
    } finally {
      setSaving(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const renderPricingForm = (langCode: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode)!
    const data = pricing[langCode]
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{lang.flag}</span>
            <div>
              <h4 className="font-medium">{lang.name}</h4>
              <p className="text-sm text-muted-foreground">
                Configura el precio para clases de {lang.name.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`active-${langCode}`} className="text-sm">
              Activo
            </Label>
            <Switch
              id={`active-${langCode}`}
              checked={data.isActive}
              onCheckedChange={(checked) => handlePricingChange(langCode, 'isActive', checked)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`price-${langCode}`}>Precio</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={`price-${langCode}`}
                type="number"
                step="0.01"
                min="0"
                value={data.price}
                onChange={(e) => handlePricingChange(langCode, 'price', parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`compare-${langCode}`}>Precio de Comparación</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={`compare-${langCode}`}
                type="number"
                step="0.01"
                min="0"
                value={data.comparePrice || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseFloat(e.target.value)
                  handlePricingChange(langCode, 'comparePrice', val)
                }}
                className="pl-9"
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor={`paypal-${langCode}`}>PayPal SKU (opcional)</Label>
          <Input
            id={`paypal-${langCode}`}
            value={data.paypalSku || ''}
            onChange={(e) => handlePricingChange(langCode, 'paypalSku', e.target.value || null)}
            placeholder={`sku-${planName.toLowerCase().replace(/\s+/g, '-')}-${langCode}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            SKU específico para identificar este plan en PayPal para {lang.name.toLowerCase()}
          </p>
        </div>

        {!isInline && (
          <Button
            onClick={() => handleSavePricing(langCode)}
            disabled={saving === langCode}
            className="w-full"
          >
            {saving === langCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>Guardar Precio para {lang.name}</>
            )}
          </Button>
        )}
      </div>
    )
  }

  if (isInline) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4" />
          Precios por Idioma
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${SUPPORTED_LANGUAGES.length}, 1fr)` }}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TabsTrigger key={lang.code} value={lang.code} className="gap-2">
                <span>{lang.flag}</span>
                <span className="hidden sm:inline">{lang.name}</span>
                {pricing[lang.code]?.isActive && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {formatPrice(pricing[lang.code].price)}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TabsContent key={lang.code} value={lang.code} className="mt-4">
              {renderPricingForm(lang.code)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Precios por Idioma - {planName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Precio base:</strong> {formatPrice(basePrice)}
            {baseComparePrice && (
              <span className="ml-2 line-through">{formatPrice(baseComparePrice)}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            El precio base se usa cuando no hay un precio específico configurado para un idioma.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${SUPPORTED_LANGUAGES.length}, 1fr)` }}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TabsTrigger key={lang.code} value={lang.code} className="gap-2">
                <span>{lang.flag}</span>
                {lang.name}
                {pricing[lang.code]?.isActive && (
                  <Badge variant="default" className="ml-1 text-xs">
                    Activo
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TabsContent key={lang.code} value={lang.code} className="mt-4">
              {renderPricingForm(lang.code)}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
