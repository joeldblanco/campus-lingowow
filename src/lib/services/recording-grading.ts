import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface RecordingGradingCriteria {
  language: 'english' | 'spanish'
  targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  instruction: string
  prompt?: string
}

export interface RecordingGradingResult {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  transcription: string
  feedback: {
    overall: string
    pronunciation: {
      score: number
      maxScore: number
      comments: string
      corrections: Array<{
        spoken: string
        correct: string
        explanation: string
      }>
    }
    grammar: {
      score: number
      maxScore: number
      comments: string
      corrections: Array<{
        original: string
        corrected: string
        explanation: string
      }>
    }
    vocabulary: {
      score: number
      maxScore: number
      comments: string
      suggestions: string[]
    }
    fluency: {
      score: number
      maxScore: number
      comments: string
    }
    taskCompletion: {
      score: number
      maxScore: number
      comments: string
    }
  }
  estimatedLevel: string
  strengths: string[]
  areasToImprove: string[]
}

export async function gradeRecordingWithAI(
  audioBase64: string,
  mimeType: string,
  criteria: RecordingGradingCriteria,
  maxPoints: number = 100
): Promise<RecordingGradingResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const rubricWeights = {
    pronunciation: 20,
    grammar: 20,
    vocabulary: 20,
    fluency: 20,
    taskCompletion: 20,
  }

  const prompt = `You are an expert language teacher evaluating a student's spoken audio recording.
Listen to the audio carefully, transcribe it, and provide detailed feedback in JSON format.

**Recording Details:**
- Target Language: ${criteria.language === 'english' ? 'English' : 'Spanish'}
- Expected Level: ${criteria.targetLevel}
- Task Instructions: ${criteria.instruction || criteria.prompt || 'Speak about the given topic'}

**Scoring Rubric (out of ${maxPoints} total points):**
- Pronunciation & Accent: ${rubricWeights.pronunciation} points
- Grammar & Accuracy: ${rubricWeights.grammar} points
- Vocabulary & Word Choice: ${rubricWeights.vocabulary} points
- Fluency & Natural Flow: ${rubricWeights.fluency} points
- Task Completion & Content: ${rubricWeights.taskCompletion} points

**Instructions:**
1. First, transcribe the audio accurately
2. Evaluate pronunciation, noting any mispronounced words
3. Identify grammar errors in the spoken content
4. Assess vocabulary usage and suggest improvements
5. Evaluate fluency, hesitations, and natural flow
6. Determine if the student addressed the task adequately
7. Estimate the student's actual language level based on their speech
8. Provide constructive feedback in ${criteria.language === 'english' ? 'English' : 'Spanish'}

**Response Format (JSON only, no markdown):**
{
  "transcription": "<exact transcription of what was said>",
  "pronunciation": {
    "score": <number>,
    "comments": "<detailed feedback>",
    "corrections": [
      {
        "spoken": "<how it was pronounced>",
        "correct": "<correct pronunciation>",
        "explanation": "<pronunciation tip>"
      }
    ]
  },
  "grammar": {
    "score": <number>,
    "comments": "<detailed feedback>",
    "corrections": [
      {
        "original": "<what was said>",
        "corrected": "<correct form>",
        "explanation": "<grammar rule>"
      }
    ]
  },
  "vocabulary": {
    "score": <number>,
    "comments": "<detailed feedback>",
    "suggestions": ["<better word choices or phrases>"]
  },
  "fluency": {
    "score": <number>,
    "comments": "<feedback on flow, hesitations, pace>"
  },
  "taskCompletion": {
    "score": <number>,
    "comments": "<feedback on how well they addressed the task>"
  },
  "overall": "<comprehensive summary of the speaking performance>",
  "estimatedLevel": "<A1|A2|B1|B2|C1|C2>",
  "strengths": ["<what the student did well>"],
  "areasToImprove": ["<specific areas to work on>"]
}

Respond ONLY with valid JSON, no additional text or markdown.`

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBase64,
        },
      },
      { text: prompt },
    ])
    const response = await result.response
    const text = response.text()

    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    const aiResponse = JSON.parse(cleanedText)

    const totalScore =
      (aiResponse.pronunciation?.score || 0) +
      (aiResponse.grammar?.score || 0) +
      (aiResponse.vocabulary?.score || 0) +
      (aiResponse.fluency?.score || 0) +
      (aiResponse.taskCompletion?.score || 0)

    const percentage = maxPoints > 0 ? (totalScore / maxPoints) * 100 : 0

    return {
      score: totalScore,
      maxScore: maxPoints,
      percentage: Math.round(percentage * 100) / 100,
      passed: maxPoints > 0 ? percentage >= 60 : true,
      transcription: aiResponse.transcription || '',
      feedback: {
        overall: aiResponse.overall || '',
        pronunciation: {
          score: aiResponse.pronunciation?.score || 0,
          maxScore: rubricWeights.pronunciation,
          comments: aiResponse.pronunciation?.comments || '',
          corrections: aiResponse.pronunciation?.corrections || [],
        },
        grammar: {
          score: aiResponse.grammar?.score || 0,
          maxScore: rubricWeights.grammar,
          comments: aiResponse.grammar?.comments || '',
          corrections: aiResponse.grammar?.corrections || [],
        },
        vocabulary: {
          score: aiResponse.vocabulary?.score || 0,
          maxScore: rubricWeights.vocabulary,
          comments: aiResponse.vocabulary?.comments || '',
          suggestions: aiResponse.vocabulary?.suggestions || [],
        },
        fluency: {
          score: aiResponse.fluency?.score || 0,
          maxScore: rubricWeights.fluency,
          comments: aiResponse.fluency?.comments || '',
        },
        taskCompletion: {
          score: aiResponse.taskCompletion?.score || 0,
          maxScore: rubricWeights.taskCompletion,
          comments: aiResponse.taskCompletion?.comments || '',
        },
      },
      estimatedLevel: aiResponse.estimatedLevel || criteria.targetLevel,
      strengths: aiResponse.strengths || [],
      areasToImprove: aiResponse.areasToImprove || [],
    }
  } catch (error) {
    console.error('Error grading recording with AI:', error)
    throw new Error('Failed to grade recording with AI. Please try again.')
  }
}

export async function gradeRecordingFromUrl(
  audioUrl: string,
  criteria: RecordingGradingCriteria,
  maxPoints: number = 100
): Promise<RecordingGradingResult> {
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error('Failed to fetch audio file')
  }

  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const contentType = response.headers.get('content-type') || 'audio/webm'

  return gradeRecordingWithAI(base64, contentType, criteria, maxPoints)
}
