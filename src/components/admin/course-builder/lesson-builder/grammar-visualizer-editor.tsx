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
} from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { Badge } from '@/components/ui/badge'

// --- Grammar Types Configuration ---
// Matching the colors from the mockup roughly:
// Subject: Yellowish
// Verb: Greenish
// Object: Blueish
// Other: Gray/White
const GRAMMAR_TYPES: { type: GrammarType; label: string; color: string; bg: string; border: string }[] = [
    { type: 'subject', label: 'Subject', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { type: 'verb', label: 'Verb', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { type: 'object', label: 'Object', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    { type: 'adverb', label: 'Adverb', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    { type: 'negation', label: 'Negation', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    { type: 'preposition', label: 'Preposition', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    { type: 'article', label: 'Article', color: 'text-stone-600', bg: 'bg-stone-50', border: 'border-stone-200' },
    { type: 'pronoun', label: 'Pronoun', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { type: 'punctuation', label: 'Punct', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
    { type: 'other', label: 'Other', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
]

const getGrammarStyle = (type?: GrammarType) => {
    const match = GRAMMAR_TYPES.find((t) => t.type === type)
    return match || GRAMMAR_TYPES.find((t) => t.type === 'other')!
}

// --- Preview Component (Internal) ---
function StudentPreviewCard({ set }: { set: SentenceSet }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Live</Badge>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Student Preview</h3>
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center py-8">
                <p className="text-sm text-slate-400 mb-2">Drag blocks here</p>
                <div className="h-12 border-2 border-slate-200 border-dashed rounded bg-slate-100/50 w-full max-w-md mx-auto" />
            </div>

            <div className="space-y-4">
                {set.variants.map((v) => (
                    <div key={v.id} className="flex flex-wrap gap-2 justify-center">
                        {v.tokens.map(t => (
                            <div key={t.id} className="bg-white border rounded shadow-sm px-3 py-2 text-sm font-medium">
                                {t.content}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                <div className="bg-blue-100 p-2 rounded-full h-fit text-blue-600">
                    <Info className='w-4 h-4' />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1">Pro Tip</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        Use the color-coded tokens to help students visualize grammar patterns. Consistent colors (e.g., all verbs are green) improve retention.
                    </p>
                </div>
            </div>
        </div>
    )
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
                    'flex flex-col min-w-[100px] rounded-md border-2 transition-all cursor-grab active:cursor-grabbing bg-white shadow-sm overflow-hidden',
                    isSelected ? 'ring-2 ring-primary border-primary' : gStyle.border
                )}
                onClick={onToggleSelect}
            >
                {/* Header Color Strip */}
                <div className={cn("h-1.5 w-full", gStyle.bg.replace('bg-', 'bg-').replace('50', '500'))} />

                <div className="p-3 flex flex-col items-center gap-1">
                    {/* Role Selector Trigger */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors",
                                    gStyle.color
                                )}
                                onClick={(e) => e.stopPropagation()} // Prevent selection when clicking dropdown
                            >
                                {gStyle.label}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="center">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase">Assign Role</p>
                            <div className="grid grid-cols-1 gap-1">
                                {GRAMMAR_TYPES.map((t) => (
                                    <button
                                        key={t.type}
                                        onClick={() => {
                                            onAssignType(t.type)
                                            // Close popover logic handled by radix usually, but we might need controlled if strict
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 px-2 py-1.5 rounded-md text-sm hover:bg-slate-100 transition-colors text-left",
                                            token.grammarType === t.type && "bg-slate-50"
                                        )}
                                    >
                                        <div className={cn("w-3 h-3 rounded-full", t.bg.replace('bg-', 'bg-').replace('50', '500'))} />
                                        <span className="flex-1">{t.label}</span>
                                        {token.grammarType === t.type && <Check className="w-3 h-3 text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <span className="text-base font-medium text-slate-900">
                        {token.content}
                    </span>
                </div>
            </div>

            {/* Drag Handle Overlay - using the whole card as handle via listeners, but keeping explicit Grip for affordance if needed. 
          Actually listeners are on the div, so the whole card is draggable. 
          We need to stop propagation on the Popover trigger above.
      */}
            <div
                {...attributes}
                {...listeners}
                className="absolute inset-0 z-0"
                onClick={(e) => {
                    // Forward click to selection
                    onToggleSelect(e)
                }}
            />
        </div>
    )
}


// --- Main Editor Component ---
interface GrammarVisualizerEditorProps {
    block: GrammarVisualizerBlock
    onUpdate: (updates: Partial<GrammarVisualizerBlock>) => void
}

export function GrammarVisualizerEditor({ block, onUpdate }: GrammarVisualizerEditorProps) {
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

    // --- Helpers ---
    const updateSet = (setId: string, updates: Partial<SentenceSet>) => {
        onUpdate({
            sets: block.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
        })
    }

    const updateVariant = (setId: string, variantId: string, updates: Partial<SentenceVariant>) => {
        const set = block.sets.find((s) => s.id === setId)
        if (!set) return
        updateSet(setId, {
            variants: set.variants.map((v) => (v.id === variantId ? { ...v, ...updates } : v)),
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
        onUpdate({ sets: [...block.sets, newSet] })
    }

    const handleDeleteSet = (id: string) => {
        onUpdate({ sets: block.sets.filter(s => s.id !== id) })
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

    // DND Logic
    const handleDragEnd = (event: DragEndEvent, setId: string, variantId: string) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const set = block.sets.find((s) => s.id === setId)
        const variant = set?.variants.find((v) => v.id === variantId)
        if (!variant) return

        const oldIndex = variant.tokens.findIndex((t) => t.id === active.id)
        const newIndex = variant.tokens.findIndex((t) => t.id === over.id)

        const newTokens = arrayMove(variant.tokens, oldIndex, newIndex)
        updateVariant(setId, variantId, { tokens: newTokens })
    }

    // Merging Logic
    const mergeSelectedTokens = (setId: string, variantId: string) => {
        // (Simplified reuse of previous logic)
        const set = block.sets.find((s) => s.id === setId)
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

    const handleAssignType = (setId: string, variantId: string, tokenId: string, type: GrammarType) => {
        const set = block.sets.find((s) => s.id === setId)
        const variant = set?.variants.find((v) => v.id === variantId)
        if (!variant) return
        const newTokens = variant.tokens.map(t => t.id === tokenId ? { ...t, grammarType: type } : t)
        updateVariant(setId, variantId, { tokens: newTokens })
    }


    return (
        <div className="w-full bg-slate-50/50 p-6 rounded-xl border border-slate-200">

            {/* Main Header inside the block editor area to mimic the 'Page' feel from mockup, 
            although typically this is part of the modal. We'll add a block-level header 
        */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Label className="text-xs font-bold uppercase text-slate-400 mb-1">Block Title</Label>
                    <Input
                        value={block.title || ''}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        className="text-2xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-slate-300"
                        placeholder="Sentence Structure Builder"
                    />
                </div>
                {/* Mockup buttons "Cancel" "Save Template" would go here conceptually, 
                but we are inside a larger form. We can add "Block Actions" if needed. 
            */}
            </div>

            {block.sets.map((set, index) => (
                <div key={set.id} className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 pb-12 border-b last:border-0 last:pb-0 last:mb-0">

                    {/* LEFT COLUMN: EDITOR */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Set Header */}
                        <div className="flex items-start justify-between group">
                            <div className="flex-1 mr-4">
                                <Label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Set Name</Label>
                                <Input
                                    value={set.title}
                                    onChange={(e) => updateSet(set.id, { title: e.target.value })}
                                    className="font-bold text-lg border-transparent hover:border-slate-200 transition-colors bg-white shadow-sm"
                                />
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => handleDeleteSet(set.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Variants */}
                        <div className="space-y-8">
                            {set.variants.map((variant) => (
                                <div key={variant.id} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-700">
                                            Variant {index + 1}: {variant.label}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-red-500">Reset</Button>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400 hover:text-red-500">Remove</Button>
                                        </div>
                                    </div>

                                    {/* Sentence Input */}
                                    <div className="flex gap-2">
                                        <Input
                                            value={variant.rawSentence}
                                            onChange={(e) => updateVariant(set.id, variant.id, { rawSentence: e.target.value })}
                                            className="bg-white"
                                            placeholder="Type a sentence..."
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleTokenize(set.id, variant.id, variant.rawSentence)}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                                        >
                                            <RefreshCcw className="w-3 h-3 mr-2" />
                                            {variant.tokens.length > 0 ? 'Re-Tokenize' : 'Tokenize'}
                                        </Button>
                                    </div>

                                    {/* Token Editor Canvas */}
                                    <div className="bg-slate-100/50 rounded-xl border border-slate-200 p-6 relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Info className="w-3 h-3" />
                                                <span>Select multiple to <strong>Merge</strong>. Assign roles via dropdown.</span>
                                            </div>

                                            {selectedTokens.size > 1 && (
                                                <Button size="sm" className="h-7 text-xs bg-slate-800 text-white hover:bg-slate-700 shadow-md animate-in fade-in zoom-in" onClick={() => mergeSelectedTokens(set.id, variant.id)}>
                                                    <Merge className="w-3 h-3 mr-1" />
                                                    Merge Blocks
                                                </Button>
                                            )}
                                        </div>

                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(e, set.id, variant.id)}
                                        >
                                            <SortableContext items={variant.tokens.map(t => t.id)} strategy={horizontalListSortingStrategy}>
                                                <div className="flex flex-wrap gap-3 min-h-[80px] p-2">
                                                    {variant.tokens.map(token => (
                                                        <SortableToken
                                                            key={token.id}
                                                            token={token}
                                                            isSelected={selectedTokens.has(token.id)}
                                                            onToggleSelect={(e) => {
                                                                if (e.ctrlKey || e.metaKey) {
                                                                    const newSet = new Set(selectedTokens);
                                                                    newSet.has(token.id) ? newSet.delete(token.id) : newSet.add(token.id);
                                                                    setSelectedTokens(newSet);
                                                                } else {
                                                                    // Exclusive select
                                                                    setSelectedTokens(new Set(selectedTokens.has(token.id) && selectedTokens.size === 1 ? [] : [token.id]))
                                                                }
                                                            }}
                                                            onAssignType={(t) => handleAssignType(set.id, variant.id, token.id, t)}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" className="w-full border-dashed border-slate-300 text-slate-500 hover:bg-slate-50" onClick={() => {
                                updateSet(set.id, {
                                    variants: [...set.variants, { id: uuidv4(), label: 'New Variant', rawSentence: '', tokens: [] }]
                                })
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Sentence Variant
                            </Button>
                        </div>
                    </div>


                    {/* RIGHT COLUMN: PREVIEW */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <StudentPreviewCard set={set} />
                        </div>
                    </div>

                </div>
            ))}

            <div className="flex justify-center mt-8 pt-8 border-t border-slate-200">
                <Button onClick={handleAddNewSet} size="lg" className="shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Sentence Set
                </Button>
            </div>

        </div>
    )
}
