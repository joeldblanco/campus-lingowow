import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface ShortAnswerGradingInput {
  question: string
  correctAnswer: string
  studentAnswer: string
  aiInstructions?: string
  caseSensitive?: boolean
  language?: 'english' | 'spanish'
}

export interface ShortAnswerGradingResult {
  isCorrect: boolean
  score: number // 0-100
  feedback: string
  suggestedCorrection?: string
}

export async function gradeShortAnswerWithAI(
  input: ShortAnswerGradingInput
): Promise<ShortAnswerGradingResult> {
  const { question, correctAnswer, studentAnswer, aiInstructions, caseSensitive, language = 'spanish' } = input

  // First, do a simple comparison
  const simpleMatch = caseSensitive
    ? studentAnswer.trim() === correctAnswer.trim()
    : studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

  // If exact match, return immediately
  if (simpleMatch) {
    return {
      isCorrect: true,
      score: 100,
      feedback: language === 'spanish' ? '¡Correcto!' : 'Correct!',
    }
  }

  // If no AI instructions provided, fall back to simple comparison
  if (!aiInstructions || aiInstructions.trim() === '') {
    return {
      isCorrect: false,
      score: 0,
      feedback: language === 'spanish' 
        ? `Incorrecto. La respuesta correcta es: ${correctAnswer}`
        : `Incorrect. The correct answer is: ${correctAnswer}`,
      suggestedCorrection: correctAnswer,
    }
  }

  // Use AI to grade the answer
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `You are an expert language teacher evaluating a student's short answer response.
Analyze the student's answer and determine if it is correct based on the grading instructions.

**Question:** ${question}

**Expected/Correct Answer:** ${correctAnswer}

**Student's Answer:** ${studentAnswer}

**Grading Instructions from Teacher:**
${aiInstructions}

**Additional Context:**
- Case sensitivity: ${caseSensitive ? 'Yes, case matters' : 'No, ignore case differences'}
- Response language: ${language === 'spanish' ? 'Spanish' : 'English'}

**Your Task:**
1. Evaluate if the student's answer is acceptable based on the grading instructions
2. Consider synonyms, paraphrasing, and alternative correct answers as specified in the instructions
3. Provide constructive feedback in ${language === 'spanish' ? 'Spanish' : 'English'}

**Response Format (JSON only, no markdown):**
{
  "isCorrect": <boolean - true if answer is acceptable, false otherwise>,
  "score": <number 0-100 - partial credit allowed based on how close the answer is>,
  "feedback": "<brief, encouraging feedback explaining why the answer is correct or what was wrong>",
  "suggestedCorrection": "<only if incorrect, show the correct answer or a better version>"
}

Respond ONLY with valid JSON, no additional text or markdown.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    const aiResponse = JSON.parse(cleanedText)

    return {
      isCorrect: aiResponse.isCorrect === true,
      score: Math.min(100, Math.max(0, aiResponse.score || 0)),
      feedback: aiResponse.feedback || (language === 'spanish' ? 'Respuesta evaluada.' : 'Answer evaluated.'),
      suggestedCorrection: aiResponse.isCorrect ? undefined : (aiResponse.suggestedCorrection || correctAnswer),
    }
  } catch (error) {
    console.error('Error grading short answer with AI:', error)
    // Fallback to simple comparison on error
    return {
      isCorrect: false,
      score: 0,
      feedback: language === 'spanish'
        ? `Error al evaluar con IA. La respuesta esperada es: ${correctAnswer}`
        : `AI evaluation error. The expected answer is: ${correctAnswer}`,
      suggestedCorrection: correctAnswer,
    }
  }
}
