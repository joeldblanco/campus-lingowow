'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  Check, 
  Zap, 
  Star, 
  Heart, 
  Users, 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  Globe, 
  MessageSquare, 
  Video, 
  Headphones, 
  FileText, 
  Download, 
  Upload, 
  Settings, 
  Shield, 
  Lock, 
  Unlock, 
  Mail, 
  Phone, 
  MapPin, 
  Home, 
  Briefcase, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  BarChart, 
  PieChart, 
  Target, 
  Flag, 
  Gift, 
  Tag, 
  Bookmark, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  HelpCircle,
  Sparkles,
  Rocket,
  Trophy,
  Crown,
  Gem,
  Lightbulb,
  Palette,
  Music,
  Camera,
  Image,
  Film,
  Mic,
  Speaker,
  Volume2,
  Bell,
  Sun,
  Moon,
  Cloud,
  Wifi,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Code,
  Terminal,
  Database,
  Package,
  LucideIcon
} from 'lucide-react'

const ICON_OPTIONS: Array<{ name: string; icon: LucideIcon; emoji: string }> = [
  { name: 'Zap', icon: Zap, emoji: '⚡' },
  { name: 'Star', icon: Star, emoji: '⭐' },
  { name: 'Heart', icon: Heart, emoji: '❤️' },
  { name: 'Users', icon: Users, emoji: '👥' },
  { name: 'BookOpen', icon: BookOpen, emoji: '📖' },
  { name: 'Award', icon: Award, emoji: '🏆' },
  { name: 'Calendar', icon: Calendar, emoji: '📅' },
  { name: 'Clock', icon: Clock, emoji: '⏰' },
  { name: 'Globe', icon: Globe, emoji: '🌍' },
  { name: 'MessageSquare', icon: MessageSquare, emoji: '💬' },
  { name: 'Video', icon: Video, emoji: '🎥' },
  { name: 'Headphones', icon: Headphones, emoji: '🎧' },
  { name: 'FileText', icon: FileText, emoji: '📄' },
  { name: 'Download', icon: Download, emoji: '⬇️' },
  { name: 'Upload', icon: Upload, emoji: '⬆️' },
  { name: 'Settings', icon: Settings, emoji: '⚙️' },
  { name: 'Shield', icon: Shield, emoji: '🛡️' },
  { name: 'Lock', icon: Lock, emoji: '🔒' },
  { name: 'Unlock', icon: Unlock, emoji: '🔓' },
  { name: 'Mail', icon: Mail, emoji: '📧' },
  { name: 'Phone', icon: Phone, emoji: '📞' },
  { name: 'MapPin', icon: MapPin, emoji: '📍' },
  { name: 'Home', icon: Home, emoji: '🏠' },
  { name: 'Briefcase', icon: Briefcase, emoji: '💼' },
  { name: 'ShoppingCart', icon: ShoppingCart, emoji: '🛒' },
  { name: 'CreditCard', icon: CreditCard, emoji: '💳' },
  { name: 'DollarSign', icon: DollarSign, emoji: '💵' },
  { name: 'TrendingUp', icon: TrendingUp, emoji: '📈' },
  { name: 'BarChart', icon: BarChart, emoji: '📊' },
  { name: 'PieChart', icon: PieChart, emoji: '🥧' },
  { name: 'Target', icon: Target, emoji: '🎯' },
  { name: 'Flag', icon: Flag, emoji: '🚩' },
  { name: 'Gift', icon: Gift, emoji: '🎁' },
  { name: 'Tag', icon: Tag, emoji: '🏷️' },
  { name: 'Bookmark', icon: Bookmark, emoji: '🔖' },
  { name: 'Search', icon: Search, emoji: '🔍' },
  { name: 'CheckCircle', icon: CheckCircle, emoji: '✅' },
  { name: 'XCircle', icon: XCircle, emoji: '❌' },
  { name: 'AlertCircle', icon: AlertCircle, emoji: '⚠️' },
  { name: 'Info', icon: Info, emoji: 'ℹ️' },
  { name: 'HelpCircle', icon: HelpCircle, emoji: '❓' },
  { name: 'Sparkles', icon: Sparkles, emoji: '✨' },
  { name: 'Rocket', icon: Rocket, emoji: '🚀' },
  { name: 'Trophy', icon: Trophy, emoji: '🏆' },
  { name: 'Crown', icon: Crown, emoji: '👑' },
  { name: 'Gem', icon: Gem, emoji: '💎' },
  { name: 'Lightbulb', icon: Lightbulb, emoji: '💡' },
  { name: 'Palette', icon: Palette, emoji: '🎨' },
  { name: 'Music', icon: Music, emoji: '🎵' },
  { name: 'Camera', icon: Camera, emoji: '📷' },
  { name: 'Image', icon: Image, emoji: '🖼️' },
  { name: 'Film', icon: Film, emoji: '🎬' },
  { name: 'Mic', icon: Mic, emoji: '🎤' },
  { name: 'Speaker', icon: Speaker, emoji: '🔊' },
  { name: 'Volume2', icon: Volume2, emoji: '🔊' },
  { name: 'Bell', icon: Bell, emoji: '🔔' },
  { name: 'Sun', icon: Sun, emoji: '☀️' },
  { name: 'Moon', icon: Moon, emoji: '🌙' },
  { name: 'Cloud', icon: Cloud, emoji: '☁️' },
  { name: 'Wifi', icon: Wifi, emoji: '📶' },
  { name: 'Monitor', icon: Monitor, emoji: '🖥️' },
  { name: 'Smartphone', icon: Smartphone, emoji: '📱' },
  { name: 'Tablet', icon: Tablet, emoji: '📱' },
  { name: 'Laptop', icon: Laptop, emoji: '💻' },
  { name: 'Code', icon: Code, emoji: '💻' },
  { name: 'Terminal', icon: Terminal, emoji: '⌨️' },
  { name: 'Database', icon: Database, emoji: '🗄️' },
  { name: 'Package', icon: Package, emoji: '📦' },
]

interface IconPickerProps {
  value?: string | null
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('')

  const filteredIcons = ICON_OPTIONS.filter(
    (icon) =>
      icon.name.toLowerCase().includes(search.toLowerCase()) ||
      icon.emoji.includes(search)
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar icono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        {value && (
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
            <span className="text-lg">{value}</span>
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[300px] border rounded-md p-2">
        <div className="grid grid-cols-6 gap-2">
          {filteredIcons.map((iconOption) => {
            const isSelected = value === iconOption.emoji
            
            return (
              <Button
                key={iconOption.name}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="h-12 w-full relative"
                onClick={() => onChange(iconOption.emoji)}
                title={iconOption.name}
              >
                <span className="text-xl">{iconOption.emoji}</span>
                {isSelected && (
                  <Check className="h-3 w-3 absolute top-1 right-1" />
                )}
              </Button>
            )
          })}
        </div>
      </ScrollArea>
      
      <p className="text-xs text-muted-foreground">
        Selecciona un icono de la lista o escribe un emoji personalizado
      </p>
    </div>
  )
}
