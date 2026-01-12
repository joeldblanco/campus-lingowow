'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { Block } from '@/types/course-builder'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface AIBlockGeneratorRequest {
  prompt: string
  context?: string
  lessonTitle?: string
  lessonDescription?: string
}

export interface AIBlockGeneratorResponse {
  success: boolean
  blocks?: Block[]
  error?: string
  message?: string
}

const BLOCK_SCHEMA = `
Available block types and their structure:

1. text - Rich text content
{
  "type": "text",
  "content": "<p>HTML content here</p>"
}

2. title - Section heading
{
  "type": "title",
  "title": "Section Title"
}

3. vocabulary - Vocabulary list
{
  "type": "vocabulary",
  "title": "Vocabulary Title",
  "items": [
    {
      "id": "unique_id",
      "term": "Word",
      "definition": "Definition",
      "pronunciation": "pronunciation",
      "example": "Example sentence with <b>word</b> highlighted"
    }
  ]
}

4. grammar - Grammar explanation
{
  "type": "grammar",
  "title": "Grammar Rule Title",
  "description": "<p>HTML explanation of the grammar rule</p>",
  "examples": [
    { "id": "unique_id", "sentence": "Example sentence", "translation": "Translation" }
  ]
}

5. fill_blanks - Fill in the blanks exercise
{
  "type": "fill_blanks",
  "title": "Exercise Title",
  "items": [
    { "id": "unique_id", "content": "The sky is [blue] and the grass is [green]." }
  ]
}

6. match - Matching exercise
{
  "type": "match",
  "title": "Match Title",
  "pairs": [
    { "id": "unique_id", "left": "Word", "right": "Translation" }
  ]
}

7. true_false - True/False questions
{
  "type": "true_false",
  "title": "True or False",
  "items": [
    { "id": "unique_id", "statement": "Statement to evaluate", "correctAnswer": true }
  ]
}

8. multiple_choice - Multiple choice question
{
  "type": "multiple_choice",
  "question": "Question text",
  "options": [
    { "id": "opt1", "text": "Option A" },
    { "id": "opt2", "text": "Option B" },
    { "id": "opt3", "text": "Option C" },
    { "id": "opt4", "text": "Option D" }
  ],
  "correctOptionId": "opt1",
  "explanation": "Why this is correct"
}

9. short_answer - Short answer questions
{
  "type": "short_answer",
  "items": [
    { "id": "unique_id", "question": "Question", "correctAnswer": "answer" }
  ],
  "context": "Optional reading passage or context",
  "caseSensitive": false
}

10. multi_select - Multiple selection (select all correct)
{
  "type": "multi_select",
  "title": "Select all correct options",
  "instruction": "Select all that apply",
  "correctOptions": [
    { "id": "correct1", "text": "Correct option 1" },
    { "id": "correct2", "text": "Correct option 2" }
  ],
  "incorrectOptions": [
    { "id": "incorrect1", "text": "Incorrect option 1" },
    { "id": "incorrect2", "text": "Incorrect option 2" }
  ],
  "explanation": "Explanation of why these are correct"
}

11. essay - Essay/writing prompt
{
  "type": "essay",
  "prompt": "Writing prompt",
  "minWords": 50,
  "aiGrading": true,
  "aiGradingConfig": {
    "language": "english",
    "targetLevel": "B1"
  }
}
`

export async function generateBlocksWithAI(
  request: AIBlockGeneratorRequest
): Promise<AIBlockGeneratorResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const systemPrompt = `You are an expert educational content creator for a language learning platform.
Your task is to generate lesson content blocks based on the user's request.

${BLOCK_SCHEMA}

**Important Rules:**
1. Generate ONLY valid JSON array of blocks
2. Each block must have a unique "id" field (use format "block_" + timestamp-like number)
3. Each block must have an "order" field (starting from 0)
4. Use HTML formatting in text content (bold with <b>, italic with <i>, paragraphs with <p>)
5. For fill_blanks, wrap answers in square brackets: [answer]
6. Create engaging, educational content appropriate for language learners
7. Include variety of block types when appropriate
8. Generate content in the language requested by the user

${request.lessonTitle ? `**Lesson Title:** ${request.lessonTitle}` : ''}
${request.lessonDescription ? `**Lesson Description:** ${request.lessonDescription}` : ''}
${request.context ? `**Additional Context:** ${request.context}` : ''}

**User Request:**
${request.prompt}

**Response Format:**
Return ONLY a valid JSON array of blocks, no markdown, no explanation, just the JSON array.
Example: [{"id": "block_1", "type": "title", "order": 0, "title": "..."}]`

  try {
    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const text = response.text()

    // Clean and parse JSON
    let cleanedText = text.trim()
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\n?|\n?```/g, '').trim()
    // Remove any leading/trailing text before/after the array
    const arrayMatch = cleanedText.match(/\[[\s\S]*\]/)
    if (!arrayMatch) {
      throw new Error('No valid JSON array found in response')
    }
    cleanedText = arrayMatch[0]

    const blocks: Block[] = JSON.parse(cleanedText)

    // Validate and fix blocks
    const validatedBlocks = blocks.map((block, index) => ({
      ...block,
      id: block.id || `block_${Date.now()}_${index}`,
      order: index,
    }))

    return {
      success: true,
      blocks: validatedBlocks,
      message: `Generated ${validatedBlocks.length} block(s) successfully`,
    }
  } catch (error) {
    console.error('Error generating blocks with AI:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate blocks',
    }
  }
}

export async function suggestBlockImprovements(
  block: Block,
  instruction: string
): Promise<AIBlockGeneratorResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `You are an expert educational content editor.
Improve the following lesson block based on the user's instruction.

**Current Block:**
${JSON.stringify(block, null, 2)}

**User Instruction:**
${instruction}

**Rules:**
1. Keep the same block type and structure
2. Maintain the id and order fields
3. Return ONLY the improved block as valid JSON
4. No markdown, no explanation, just the JSON object

Return the improved block:`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json\n?|\n?```/g, '').trim()
    const objectMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (!objectMatch) {
      throw new Error('No valid JSON object found in response')
    }

    const improvedBlock: Block = JSON.parse(objectMatch[0])

    return {
      success: true,
      blocks: [{ ...improvedBlock, id: block.id, order: block.order }],
      message: 'Block improved successfully',
    }
  } catch (error) {
    console.error('Error improving block with AI:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to improve block',
    }
  }
}
