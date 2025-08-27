import React from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClassPackageType, PackageNames, PackageClassCount } from '@/types/academic-period'
import { calculatePackagePrice } from '@/lib/utils/academic-period'

interface PackageSelectorProps {
  onSelect: (packageType: ClassPackageType, isProrated: boolean, proratedClasses?: number) => void
  selectedPackage?: ClassPackageType
  isPeriodStarted?: boolean
  basePrice: number
  remainingWeeks?: number
  isLoading?: boolean
}

const PackageSelector: React.FC<PackageSelectorProps> = ({
  onSelect,
  selectedPackage,
  isPeriodStarted = false,
  basePrice,
  remainingWeeks = 4,
  isLoading = false,
}) => {
  const handleSelect = (packageType: ClassPackageType) => {
    if (isLoading) return

    let isProrated = false
    let proratedClasses = 0

    // Si el período ya comenzó, calculamos el prorrateo
    if (isPeriodStarted && remainingWeeks < 4) {
      isProrated = true
      // Calculamos las clases prorrateadas según la proporción de semanas restantes
      const ratio = remainingWeeks / 4
      proratedClasses = Math.round(PackageClassCount[packageType] * ratio)

      toast.info(
        `Inscripción prorrateada: ${proratedClasses} clases por ${remainingWeeks} semanas restantes.`
      )
    }

    onSelect(packageType, isProrated, proratedClasses)
  }

  // Paquetes disponibles (excluyendo CUSTOM que se calcula automáticamente)
  const packages = [ClassPackageType.BASIC, ClassPackageType.STANDARD, ClassPackageType.INTENSIVE]

  // Añadimos el paquete personalizado si el período ya comenzó
  if (isPeriodStarted && remainingWeeks < 4) {
    packages.push(ClassPackageType.CUSTOM)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {packages.map((packageType) => {
        const isProrated = isPeriodStarted && remainingWeeks < 4
        let classCount = PackageClassCount[packageType]
        let price = basePrice

        // Si es prorrateado y no es CUSTOM, calculamos las clases
        if (isProrated && packageType !== ClassPackageType.CUSTOM) {
          const ratio = remainingWeeks / 4
          classCount = Math.round(classCount * ratio)
        }

        // Para CUSTOM, usamos directamente las clases calculadas por semana
        if (packageType === ClassPackageType.CUSTOM) {
          classCount = Math.round((remainingWeeks * 4) / 4) // 4 clases por semana
        }

        // Calculamos el precio
        price = calculatePackagePrice(packageType, isProrated, classCount, basePrice)

        const isSelected = selectedPackage === packageType

        return (
          <Card
            key={packageType}
            className={`relative overflow-hidden ${isSelected ? 'border-primary border-2' : ''}`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check size={16} />
              </div>
            )}

            <CardHeader>
              <CardTitle>{PackageNames[packageType]}</CardTitle>
              <CardDescription>
                {packageType === ClassPackageType.CUSTOM
                  ? `Personalizado para ${remainingWeeks} semanas`
                  : isProrated
                    ? `Prorrateado: ${classCount} clases`
                    : `${classCount} clases en 4 semanas`}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold">${price.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                ${(price / classCount).toFixed(2)} por clase
              </div>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center">
                  <Check size={16} className="mr-2 text-green-500" />
                  <span>
                    {packageType === ClassPackageType.BASIC
                      ? '2 clases por semana'
                      : packageType === ClassPackageType.STANDARD
                        ? '3 clases por semana'
                        : '4 clases por semana'}
                  </span>
                </li>
                <li className="flex items-center">
                  <Check size={16} className="mr-2 text-green-500" />
                  <span>Acceso completo a materiales</span>
                </li>
                {packageType !== ClassPackageType.BASIC && (
                  <li className="flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span>Reportes de progreso detallados</span>
                  </li>
                )}
                {packageType === ClassPackageType.INTENSIVE && (
                  <li className="flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span>Sesiones grupales temáticas</span>
                  </li>
                )}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={isSelected ? 'outline' : 'default'}
                onClick={() => handleSelect(packageType)}
                disabled={isLoading}
              >
                {isSelected ? 'Seleccionado' : 'Seleccionar'}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

export default PackageSelector
