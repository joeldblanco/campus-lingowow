'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form'
import { Control, FieldValues, Path } from 'react-hook-form'

interface CountryCode {
  code: string
  name: string
  abbreviation: string
}

const countryCodes: CountryCode[] = [
  { code: '+599', name: 'República Dominicana', abbreviation: 'DO' },
  { code: '+27', name: 'Sudáfrica', abbreviation: 'ZA' },
  { code: '+971', name: 'Emiratos Árabes', abbreviation: 'AE' },
  { code: '+54', name: 'Argentina', abbreviation: 'AR' },
  { code: '+61', name: 'Australia', abbreviation: 'AU' },
  { code: '+32', name: 'Bélgica', abbreviation: 'BE' },
  { code: '+591', name: 'Bolivia', abbreviation: 'BO' },
  { code: '+55', name: 'Brasil', abbreviation: 'BR' },
  { code: '+1', name: 'Canadá', abbreviation: 'CA' },
  { code: '+56', name: 'Chile', abbreviation: 'CL' },
  { code: '+86', name: 'China', abbreviation: 'CN' },
  { code: '+57', name: 'Colombia', abbreviation: 'CO' },
  { code: '+506', name: 'Costa Rica', abbreviation: 'CR' },
  { code: '+53', name: 'Cuba', abbreviation: 'CU' },
  { code: '+45', name: 'Dinamarca', abbreviation: 'DK' },
  { code: '+593', name: 'Ecuador', abbreviation: 'EC' },
  { code: '+20', name: 'Egipto', abbreviation: 'EG' },
  { code: '+34', name: 'España', abbreviation: 'ES' },
  { code: '+1', name: 'Estados Unidos', abbreviation: 'US' },
  { code: '+358', name: 'Finlandia', abbreviation: 'FI' },
  { code: '+33', name: 'Francia', abbreviation: 'FR' },
  { code: '+49', name: 'Alemania', abbreviation: 'DE' },
  { code: '+30', name: 'Grecia', abbreviation: 'GR' },
  { code: '+502', name: 'Guatemala', abbreviation: 'GT' },
  { code: '+504', name: 'Honduras', abbreviation: 'HN' },
  { code: '+91', name: 'India', abbreviation: 'IN' },
  { code: '+39', name: 'Italia', abbreviation: 'IT' },
  { code: '+81', name: 'Japón', abbreviation: 'JP' },
  { code: '+82', name: 'Corea del Sur', abbreviation: 'KR' },
  { code: '+52', name: 'México', abbreviation: 'MX' },
  { code: '+505', name: 'Nicaragua', abbreviation: 'NI' },
  { code: '+47', name: 'Noruega', abbreviation: 'NO' },
  { code: '+31', name: 'Países Bajos', abbreviation: 'NL' },
  { code: '+507', name: 'Panamá', abbreviation: 'PA' },
  { code: '+51', name: 'Perú', abbreviation: 'PE' },
  { code: '+595', name: 'Paraguay', abbreviation: 'PY' },
  { code: '+7', name: 'Rusia', abbreviation: 'RU' },
  { code: '+966', name: 'Arabia Saudita', abbreviation: 'SA' },
  { code: '+46', name: 'Suecia', abbreviation: 'SE' },
  { code: '+41', name: 'Suiza', abbreviation: 'CH' },
  { code: '+90', name: 'Turquía', abbreviation: 'TR' },
  { code: '+44', name: 'Reino Unido', abbreviation: 'UK' },
  { code: '+598', name: 'Uruguay', abbreviation: 'UY' },
  { code: '+58', name: 'Venezuela', abbreviation: 'VE' },
].sort((a, b) => a.name.localeCompare(b.name, 'es'))

interface CountryCodeSelectProps {
  value: string
  onChange: (value: string) => void
  phoneValue: string
  onPhoneChange: (value: string) => void
}

export function CountryCodeSelect({ value, onChange, phoneValue, onPhoneChange }: CountryCodeSelectProps) {
  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Código">
            {value ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  {countryCodes.find(c => c.code === value)?.abbreviation}
                </span>
                <span>{value}</span>
              </div>
            ) : (
              <span>Código</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {countryCodes.map((country) => (
            <SelectItem key={`${country.code}-${country.name}`} value={country.code}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">
                  {country.abbreviation}
                </span>
                <span>{country.code}</span>
                <span className="text-muted-foreground text-xs">{country.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        placeholder="Número de teléfono"
        value={phoneValue}
        onChange={(e) => onPhoneChange(e.target.value)}
        className="flex-1"
      />
    </div>
  )
}

interface CountryCodeFieldProps<T extends FieldValues = FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
}

export function CountryCodeField<T extends FieldValues = FieldValues>({ control, name, label }: CountryCodeFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="flex gap-2">
              <Select
                value={field.value?.countryCode || ''}
                onValueChange={(countryCode) => {
                  field.onChange({
                    ...field.value,
                    countryCode
                  })
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Código">
                    {field.value?.countryCode ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          {countryCodes.find(c => c.code === field.value.countryCode)?.abbreviation}
                        </span>
                        <span>{field.value.countryCode}</span>
                      </div>
                    ) : (
                      <span>Código</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map((country) => (
                    <SelectItem key={`${country.code}-${country.name}`} value={country.code}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">
                          {country.abbreviation}
                        </span>
                        <span>{country.code}</span>
                        <span className="text-muted-foreground text-xs">{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Número de teléfono"
                value={field.value?.phoneNumber || ''}
                onChange={(e) => {
                  field.onChange({
                    ...field.value,
                    phoneNumber: e.target.value
                  })
                }}
                className="flex-1"
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
