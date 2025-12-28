'use client'

import React, { useState } from 'react'
import {
    GrammarVisualizerBlock,
    SentenceSet,
    SentenceVariant,
    TokenBlock,
    GrammarType,
} from '@/types/course-builder'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Plus,
    Trash2,
    RefreshCcw,
    Split,
    Merge,
    ChevronDown,
    Info,
    Check,
    ChevronUp,
    GripVertical,
    RotateCcw,
    X,
    Blocks,
} from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { HelpCircle } from 'lucide-react'

// --- Grammar Types Configuration ---
const GRAMMAR_TYPES: { type: GrammarType; label: string; color: string; bg: string; border: string; strip: string; explanation: string }[] = [
    // Sujeto
    { 
        type: 'subject', 
        label: 'Sujeto', 
        color: 'text-yellow-700', 
        bg: 'bg-yellow-50', 
        border: 'border-yellow-300', 
        strip: 'bg-yellow-400',
        explanation: 'Quien realiza la acción o de quien se habla en la oración.'
    },
    // Verbos
    { 
        type: 'action-verb', 
        label: 'Verbo de acción', 
        color: 'text-green-700', 
        bg: 'bg-green-50', 
        border: 'border-green-300', 
        strip: 'bg-green-500',
        explanation: 'Palabra que expresa una acción física o mental.'
    },
    { 
        type: 'auxiliary-verb', 
        label: 'Verbo auxiliar', 
        color: 'text-green-800', 
        bg: 'bg-green-100', 
        border: 'border-green-400', 
        strip: 'bg-green-700',
        explanation: 'Ayuda al verbo principal a formar tiempos verbales, preguntas o negaciones.'
    },
    { 
        type: 'linking-verb', 
        label: 'Verbo copulativo', 
        color: 'text-green-600', 
        bg: 'bg-green-50', 
        border: 'border-green-200', 
        strip: 'bg-green-400',
        explanation: 'Une al sujeto con una descripción o estado (ej: be, seem, become).'
    },
    // Objetos
    { 
        type: 'direct-object', 
        label: 'Objeto directo', 
        color: 'text-blue-700', 
        bg: 'bg-blue-50', 
        border: 'border-blue-300', 
        strip: 'bg-blue-500',
        explanation: 'Persona o cosa que recibe directamente la acción del verbo.'
    },
    { 
        type: 'indirect-object', 
        label: 'Objeto indirecto', 
        color: 'text-blue-800', 
        bg: 'bg-blue-100', 
        border: 'border-blue-400', 
        strip: 'bg-blue-700',
        explanation: 'Indica a quién o para quién se realiza la acción del verbo.'
    },
    // Complementos
    { 
        type: 'subject-complement', 
        label: 'Complemento del sujeto', 
        color: 'text-purple-700', 
        bg: 'bg-purple-50', 
        border: 'border-purple-300', 
        strip: 'bg-purple-500',
        explanation: 'Palabra o frase que sigue a un verbo copulativo y describe al sujeto.'
    },
    { 
        type: 'object-complement', 
        label: 'Complemento del objeto', 
        color: 'text-fuchsia-700', 
        bg: 'bg-fuchsia-50', 
        border: 'border-fuchsia-300', 
        strip: 'bg-fuchsia-500',
        explanation: 'Describe o renombra al objeto directo.'
    },
    // Modificadores
    { 
        type: 'adjective', 
        label: 'Adjetivo', 
        color: 'text-pink-700', 
        bg: 'bg-pink-50', 
        border: 'border-pink-300', 
        strip: 'bg-pink-500',
        explanation: 'Palabra que describe o modifica a un sustantivo o pronombre.'
    },
    { 
        type: 'adverb', 
        label: 'Adverbio', 
        color: 'text-teal-700', 
        bg: 'bg-teal-50', 
        border: 'border-teal-300', 
        strip: 'bg-teal-500',
        explanation: 'Modifica a un verbo, adjetivo u otro adverbio, indicando cómo, cuándo o dónde.'
    },
    { 
        type: 'adverbial-complement', 
        label: 'Complemento adverbial', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        strip: 'bg-emerald-400',
        explanation: 'Información obligatoria o adicional sobre el lugar, tiempo o modo.'
    },
    // Determinantes y artículos
    { 
        type: 'determiner', 
        label: 'Determinante', 
        color: 'text-orange-700', 
        bg: 'bg-orange-50', 
        border: 'border-orange-300', 
        strip: 'bg-orange-500',
        explanation: 'Palabra que introduce un sustantivo y especifica su referencia.'
    },
    { 
        type: 'article', 
        label: 'Artículo', 
        color: 'text-orange-500', 
        bg: 'bg-orange-50', 
        border: 'border-orange-200', 
        strip: 'bg-orange-300',
        explanation: 'Indica si el sustantivo es específico (el, la) o general (un, una).'
    },
    // Pronombres
    { 
        type: 'pronoun', 
        label: 'Pronombre', 
        color: 'text-violet-700', 
        bg: 'bg-violet-50', 
        border: 'border-violet-300', 
        strip: 'bg-violet-500',
        explanation: 'Palabra que se usa en lugar de un sustantivo.'
    },
    { 
        type: 'possessive-pronoun', 
        label: 'Pronombre posesivo', 
        color: 'text-violet-500', 
        bg: 'bg-violet-50', 
        border: 'border-violet-200', 
        strip: 'bg-violet-300',
        explanation: 'Indica posesión o pertenencia (ej: mine, yours, theirs).'
    },
    // Preposiciones
    { 
        type: 'preposition', 
        label: 'Preposición', 
        color: 'text-orange-800', 
        bg: 'bg-orange-100', 
        border: 'border-orange-400', 
        strip: 'bg-orange-700',
        explanation: 'Muestra la relación (espacial, temporal o lógica) entre palabras.'
    },
    { 
        type: 'prepositional-object', 
        label: 'Objeto de la preposición', 
        color: 'text-amber-800', 
        bg: 'bg-amber-100', 
        border: 'border-amber-400', 
        strip: 'bg-amber-700',
        explanation: 'Sustantivo o pronombre que sigue a una preposición.'
    },
    // Conectores
    { 
        type: 'conjunction', 
        label: 'Conjunción', 
        color: 'text-gray-700', 
        bg: 'bg-gray-50', 
        border: 'border-gray-300', 
        strip: 'bg-gray-500',
        explanation: 'Une palabras, frases u oraciones (ej: and, but, or).'
    },
    { 
        type: 'interjection', 
        label: 'Interjección', 
        color: 'text-red-700', 
        bg: 'bg-red-50', 
        border: 'border-red-300', 
        strip: 'bg-red-500',
        explanation: 'Palabra que expresa una emoción fuerte o exclamación.'
    },
    // Otros elementos
    { 
        type: 'negation', 
        label: 'Negación', 
        color: 'text-red-800', 
        bg: 'bg-red-100', 
        border: 'border-red-400', 
        strip: 'bg-red-700',
        explanation: 'Palabra usada para negar o expresar lo opuesto.'
    },
    { 
        type: 'modal-verb', 
        label: 'Modal verb', 
        color: 'text-lime-700', 
        bg: 'bg-lime-50', 
        border: 'border-lime-300', 
        strip: 'bg-lime-600',
        explanation: 'Tipo de auxiliar que indica posibilidad, habilidad, permiso u obligación.'
    },
    { 
        type: 'infinitive', 
        label: 'Infinitivo', 
        color: 'text-sky-600', 
        bg: 'bg-sky-50', 
        border: 'border-sky-200', 
        strip: 'bg-sky-400',
        explanation: 'La forma básica del verbo, generalmente precedida por "to".'
    },
    { 
        type: 'gerund', 
        label: 'Gerundio', 
        color: 'text-cyan-600', 
        bg: 'bg-cyan-50', 
        border: 'border-cyan-200', 
        strip: 'bg-cyan-400',
        explanation: 'Forma verbal terminada en -ing que funciona como sustantivo.'
    },
    { 
        type: 'relative-pronoun', 
        label: 'Pronombre relativo', 
        color: 'text-indigo-700', 
        bg: 'bg-indigo-50', 
        border: 'border-indigo-300', 
        strip: 'bg-indigo-500',
        explanation: 'Introduce una oración que describe a un sustantivo previo (ej: who, which).'
    },
    // Puntuación
    { 
        type: 'punctuation', 
        label: 'Puntuación', 
        color: 'text-slate-500', 
        bg: 'bg-slate-50', 
        border: 'border-slate-200', 
        strip: 'bg-slate-300',
        explanation: 'Signos que ayudan a estructurar y dar sentido al texto.'
    },
    { 
        type: 'other', 
        label: 'Otro', 
        color: 'text-gray-600', 
        bg: 'bg-gray-50', 
        border: 'border-gray-300', 
        strip: 'bg-gray-400',
        explanation: 'Otros elementos gramaticales.'
    },
]

const getGrammarStyle = (type?: GrammarType) => {
    const match = GRAMMAR_TYPES.find((t) => t.type === type)
    return match || GRAMMAR_TYPES.find((t) => t.type === 'other')!
}

// --- Draggable Token Component ---
interface SortableTokenProps {
    token: TokenBlock
    isSelected: boolean
    onToggleSelect: (e: React.MouseEvent) => void
    onAssignType: (type: GrammarType) => void
    onSplit?: () => void
}

function SortableToken({
    token,
    isSelected,
    onToggleSelect,
    onAssignType,
    onSplit,
}: SortableTokenProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: token.id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const gStyle = getGrammarStyle(token.grammarType)
    const isMultiWord = token.content.includes(' ')

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative group',
                isDragging && 'z-50 opacity-50'
            )}
        >
            <div
                className={cn(
                    'flex flex-col min-w-[80px] rounded-lg border-2 transition-all bg-white shadow-sm overflow-hidden',
                    isSelected ? 'ring-2 ring-primary border-primary' : gStyle.border
                )}
            >
                {/* Header Color Strip with Role Selector */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                "h-6 w-full flex items-center justify-center gap-1 transition-colors relative z-10",
                                gStyle.strip,
                                "hover:opacity-80"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-[9px] uppercase font-bold tracking-wider text-white drop-shadow-sm">
                                {gStyle.label}
                            </span>
                            <ChevronDown className="w-3 h-3 text-white drop-shadow-sm" />
                        </button>
                    </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="center" sideOffset={5}>
                            <div className="flex items-center justify-between mb-2 px-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Asignar Rol</p>
                                {isMultiWord && onSplit && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onSplit()
                                        }}
                                    >
                                        <Split className="w-3 h-3" />
                                        Separar
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {GRAMMAR_TYPES.map((t) => (
                                    <div key={t.type} className="flex items-center gap-1">
                                        <button
                                            onClick={() => onAssignType(t.type)}
                                            className={cn(
                                                "flex items-center gap-3 px-2 py-1.5 rounded-md text-sm hover:bg-slate-100 transition-colors text-left flex-1",
                                                token.grammarType === t.type && "bg-slate-100"
                                            )}
                                        >
                                            <div className={cn("w-3 h-3 rounded-full", t.strip)} />
                                            <span className="flex-1">{t.label}</span>
                                            {token.grammarType === t.type && <Check className="w-3 h-3 text-primary" />}
                                        </button>
                                        
                                        <HoverCard openDelay={1000}>
                                            <HoverCardTrigger asChild>
                                                <div className="p-1 cursor-help text-slate-400 hover:text-primary transition-colors">
                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                </div>
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-64 p-3" side="right" align="start">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                                        {t.label}
                                                    </p>
                                                    <p className="text-sm text-slate-600">
                                                        {t.explanation}
                                                    </p>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
                                    </div>
                                ))}
                            </div>
                        </PopoverContent>
                </Popover>

                <div className="p-2 flex flex-col items-center gap-1">
                    <span className="text-base font-medium text-slate-900 text-center">
                        {token.content}
                    </span>
                </div>

                {/* Drag handle indicator */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
                    <GripVertical className="w-3 h-3 text-slate-400" />
                </div>
            </div>

            {/* Drag Handle Overlay */}
            <div
                {...attributes}
                {...listeners}
                className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
                onClick={(e) => onToggleSelect(e)}
            />
        </div>
    )
}


// --- Main Editor Component ---
interface GrammarVisualizerEditorProps {
    block: GrammarVisualizerBlock
    onUpdate: (updates: Partial<GrammarVisualizerBlock>) => void
    onRemove?: () => void
}

export function GrammarVisualizerEditor({ block, onUpdate, onRemove }: GrammarVisualizerEditorProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())
    const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set())

    // Ensure sets array exists
    const sets = block.sets || []

    // --- Helpers ---
    const updateSet = (setId: string, updates: Partial<SentenceSet>) => {
        onUpdate({
            sets: sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
        })
    }

    const updateVariant = (setId: string, variantId: string, updates: Partial<SentenceVariant>) => {
        const set = sets.find((s) => s.id === setId)
        if (!set) return
        updateSet(setId, {
            variants: set.variants.map((v) => (v.id === variantId ? { ...v, ...updates } : v)),
        })
    }

    const toggleSetCollapse = (setId: string) => {
        setCollapsedSets(prev => {
            const newSet = new Set(prev)
            if (newSet.has(setId)) {
                newSet.delete(setId)
            } else {
                newSet.add(setId)
            }
            return newSet
        })
    }

    // --- Business Logic ---
    const handleAddNewSet = () => {
        const newSet: SentenceSet = {
            id: uuidv4(),
            title: 'New Pattern',
            variants: [
                { id: uuidv4(), label: 'Affirmative', rawSentence: '', tokens: [] }
            ]
        }
        onUpdate({ sets: [...sets, newSet] })
    }

    const handleDeleteSet = (id: string) => {
        onUpdate({ sets: sets.filter(s => s.id !== id) })
    }

    const handleTokenize = (setId: string, variantId: string, sentence: string) => {
        const tokens: TokenBlock[] = sentence
            .match(/[\w']+|[.,!?;]/g)
            ?.map((text) => ({
                id: uuidv4(),
                content: text,
                grammarType: 'other',
            })) || []
        updateVariant(setId, variantId, { tokens })
    }

    const handleResetVariant = (setId: string, variantId: string) => {
        updateVariant(setId, variantId, { tokens: [], rawSentence: '' })
        setSelectedTokens(new Set())
    }

    const handleRemoveVariant = (setId: string, variantId: string) => {
        const set = sets.find((s) => s.id === setId)
        if (!set || set.variants.length <= 1) return
        updateSet(setId, {
            variants: set.variants.filter((v) => v.id !== variantId),
        })
    }

    // DND Logic
    const handleDragEnd = (event: DragEndEvent, setId: string, variantId: string) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const set = sets.find((s) => s.id === setId)
        const variant = set?.variants.find((v) => v.id === variantId)
        if (!variant) return

        const oldIndex = variant.tokens.findIndex((t) => t.id === active.id)
        const newIndex = variant.tokens.findIndex((t) => t.id === over.id)

        const newTokens = arrayMove(variant.tokens, oldIndex, newIndex)
        updateVariant(setId, variantId, { tokens: newTokens })
    }

    // Merging Logic
    const mergeSelectedTokens = (setId: string, variantId: string) => {
        const set = sets.find((s) => s.id === setId)
        const variant = set?.variants.find((v) => v.id === variantId)
        if (!variant) return

        const tokensToMerge = variant.tokens.filter((t) => selectedTokens.has(t.id))
        if (tokensToMerge.length < 2) return

        const indices = tokensToMerge.map((t) => variant.tokens.indexOf(t)).sort((a, b) => a - b)
        const isAdjacent = indices.every((val, i, arr) => i === 0 || val === arr[i - 1] + 1)

        if (!isAdjacent) {
            alert('Blocks must be adjacent to merge.')
            return
        }

        const firstIndex = indices[0]
        const mergedContent = tokensToMerge.map((t) => t.content).join(' ')
        const mergedToken: TokenBlock = {
            id: uuidv4(),
            content: mergedContent,
            grammarType: tokensToMerge[0].grammarType || 'other',
        }

        const newTokens = [...variant.tokens]
        newTokens.splice(firstIndex, tokensToMerge.length, mergedToken)

        updateVariant(setId, variantId, { tokens: newTokens })
        setSelectedTokens(new Set())
    }

    // Split Logic
    const handleSplitToken = (setId: string, variantId: string, tokenId: string) => {
        const set = sets.find((s) => s.id === setId)
        const variant = set?.variants.find((v) => v.id === variantId)
        if (!variant) return

        const tokenIndex = variant.tokens.findIndex((t) => t.id === tokenId)
        const token = variant.tokens[tokenIndex]
        if (!token || !token.content.includes(' ')) return

        const words = token.content.split(' ')
        const newTokens: TokenBlock[] = words.map((word) => ({
            id: uuidv4(),
            content: word,
            grammarType: 'other',
        }))

        const updatedTokens = [...variant.tokens]
        updatedTokens.splice(tokenIndex, 1, ...newTokens)

        updateVariant(setId, variantId, { tokens: updatedTokens })
        setSelectedTokens(new Set())
    }

    const handleAssignType = (setId: string, variantId: string, tokenId: string, type: GrammarType) => {
        const set = sets.find((s) => s.id === setId)
        const variant = set?.variants.find((v) => v.id === variantId)
        if (!variant) return
        const newTokens = variant.tokens.map(t => t.id === tokenId ? { ...t, grammarType: type } : t)
        updateVariant(setId, variantId, { tokens: newTokens })
    }


    return (
        <div className="w-full bg-slate-50/50 p-6 rounded-xl border border-slate-200">

            {/* Block Header - Icon + Fixed Title + Delete Button */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Blocks className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg font-semibold text-primary">
                        Visualizador Gramatical
                    </span>
                </div>
                {onRemove && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={onRemove}
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar Bloque
                    </Button>
                )}
            </div>

            {/* Title and Description */}
            <div className="mb-6 space-y-3 bg-white p-4 rounded-lg border border-slate-200">
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Título del bloque</Label>
                    <Input
                        value={block.title || ''}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        className="font-semibold"
                        placeholder="Ej: Estructura del Presente Simple"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Descripción (opcional)</Label>
                    <Textarea
                        value={block.description || ''}
                        onChange={(e) => onUpdate({ description: e.target.value })}
                        className="text-sm min-h-[60px] resize-none"
                        placeholder="Describe brevemente qué aprenderán los estudiantes..."
                    />
                </div>
            </div>

            <div className="space-y-6">
                {sets.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                        <div className="text-slate-400 mb-4">
                            <Plus className="w-12 h-12 mx-auto opacity-50" />
                        </div>
                        <p className="text-slate-500 mb-2">No hay conjuntos de oraciones</p>
                        <p className="text-sm text-slate-400 mb-4">Crea tu primer conjunto para comenzar a construir visualizaciones gramaticales</p>
                        <Button onClick={handleAddNewSet} variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Primer Conjunto
                        </Button>
                    </div>
                )}
                {sets.map((set) => (
                    <Collapsible
                        key={set.id}
                        open={!collapsedSets.has(set.id)}
                        onOpenChange={() => toggleSetCollapse(set.id)}
                    >
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Set Header - Always visible */}
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                            {collapsedSets.has(set.id) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronUp className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <div className="flex-1">
                                        <Input
                                            value={set.title}
                                            onChange={(e) => updateSet(set.id, { title: e.target.value })}
                                            className="font-semibold text-lg border-transparent hover:border-slate-200 transition-colors bg-transparent h-8 p-0 focus-visible:ring-0"
                                            placeholder="Nombre del conjunto..."
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => handleDeleteSet(set.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <CollapsibleContent>
                                <div className="p-6">
                                    {/* MAIN CONTENT */}
                                    <div className="space-y-6">
                                        {/* Variants */}
                                        {set.variants.map((variant, variantIndex) => (
                                            <div key={variant.id} className="space-y-4 p-4 border-l-4 border-blue-200 bg-blue-50/30 rounded-r-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500">Variante {variantIndex + 1}:</span>
                                                        <Input
                                                            value={variant.label}
                                                            onChange={(e) => updateVariant(set.id, variant.id, { label: e.target.value })}
                                                            className="font-semibold text-sm border-transparent hover:border-slate-200 bg-transparent h-7 w-32 p-1 focus-visible:ring-1"
                                                            placeholder="Etiqueta..."
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs text-slate-500 hover:text-blue-600 gap-1"
                                                            onClick={() => handleResetVariant(set.id, variant.id)}
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            Reiniciar
                                                        </Button>
                                                        {set.variants.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs text-slate-500 hover:text-red-500 gap-1"
                                                                onClick={() => handleRemoveVariant(set.id, variant.id)}
                                                            >
                                                                <X className="w-3 h-3" />
                                                                Eliminar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Sentence Input */}
                                                <div className="space-y-2">
                                                    <Input
                                                        value={variant.rawSentence}
                                                        onChange={(e) => updateVariant(set.id, variant.id, { rawSentence: e.target.value })}
                                                        className="bg-white"
                                                        placeholder="Escribe una oración..."
                                                    />
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleTokenize(set.id, variant.id, variant.rawSentence)}
                                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium"
                                                        disabled={!variant.rawSentence.trim()}
                                                    >
                                                        <RefreshCcw className="w-3 h-3 mr-2" />
                                                        {variant.tokens.length > 0 ? 'Re-tokenizar' : 'Tokenizar Oración'}
                                                    </Button>
                                                </div>

                                                {/* Token Editor Canvas */}
                                                {variant.tokens.length > 0 && (
                                                    <div className="bg-slate-100/80 rounded-xl border border-slate-200 p-4 relative">
                                                        <DndContext
                                                            sensors={sensors}
                                                            collisionDetection={closestCenter}
                                                            onDragEnd={(e) => handleDragEnd(e, set.id, variant.id)}
                                                        >
                                                            <SortableContext items={variant.tokens.map(t => t.id)} strategy={horizontalListSortingStrategy}>
                                                                <div className="flex flex-wrap gap-3 min-h-[80px] p-2 relative">
                                                                    {/* Merge Button - positioned above selected tokens */}
                                                                    {selectedTokens.size > 1 && (
                                                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 text-xs bg-slate-800 text-white hover:bg-slate-700 shadow-lg animate-in fade-in zoom-in"
                                                                                onClick={() => mergeSelectedTokens(set.id, variant.id)}
                                                                            >
                                                                                <Merge className="w-3 h-3 mr-1" />
                                                                                Unir Bloques
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                    {variant.tokens.map(token => (
                                                                        <SortableToken
                                                                            key={token.id}
                                                                            token={token}
                                                                            isSelected={selectedTokens.has(token.id)}
                                                                            onToggleSelect={(e) => {
                                                                                if (e.ctrlKey || e.metaKey) {
                                                                                    const newSet = new Set(selectedTokens);
                                                                                    if (newSet.has(token.id)) {
                                                                                        newSet.delete(token.id);
                                                                                    } else {
                                                                                        newSet.add(token.id);
                                                                                    }
                                                                                    setSelectedTokens(newSet);
                                                                                } else {
                                                                                    setSelectedTokens(new Set(selectedTokens.has(token.id) && selectedTokens.size === 1 ? [] : [token.id]))
                                                                                }
                                                                            }}
                                                                            onAssignType={(t) => handleAssignType(set.id, variant.id, token.id, t)}
                                                                            onSplit={() => handleSplitToken(set.id, variant.id, token.id)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </SortableContext>
                                                        </DndContext>
                                                    </div>
                                                )}

                                                {/* Hint field for variant */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500">Pista / Explicación (opcional)</Label>
                                                    <Textarea
                                                        value={variant.hint || ''}
                                                        onChange={(e) => updateVariant(set.id, variant.id, { hint: e.target.value })}
                                                        className="bg-white text-sm min-h-[60px] resize-none"
                                                        placeholder="Agrega una pista o explicación para los estudiantes..."
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            variant="outline"
                                            className="w-full border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
                                            onClick={() => {
                                                updateSet(set.id, {
                                                    variants: [...set.variants, { id: uuidv4(), label: 'Nueva Variante', rawSentence: '', tokens: [] }]
                                                })
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Agregar Variante
                                        </Button>

                                        {/* Pro Tip */}
                                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-amber-800">Consejo</p>
                                                    <p className="text-xs text-amber-700 mt-1">
                                                        Haz clic en los bloques para asignar roles gramaticales. Usa <strong>Ctrl+Clic</strong> para seleccionar múltiples bloques y unirlos. Haz clic en bloques con varias palabras para separarlos.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                ))}
            </div>

            <div className="flex justify-center mt-8 pt-8 border-t border-slate-200">
                <Button onClick={handleAddNewSet} size="lg" className="shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Crear Nuevo Conjunto
                </Button>
            </div>

        </div>
    )
}
