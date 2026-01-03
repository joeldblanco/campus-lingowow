import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface EssayGradingCriteria {
  language: 'english' | 'spanish'
  targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  topic: string
  prompt: string
  minWords?: number
  maxWords?: number
  rubric?: {
    grammar: number
    vocabulary: number
    coherence: number
    taskCompletion: number
  }
}

export interface EssayGradingResult {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  feedback: {
    overall: string
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
    coherence: {
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
  wordCount: number
  estimatedLevel: string
  strengths: string[]
  areasToImprove: string[]
}

export async function gradeEssayWithAI(
  essayText: string,
  criteria: EssayGradingCriteria,
  maxPoints: number = 100
): Promise<EssayGradingResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const rubricWeights = criteria.rubric || {
    grammar: 25,
    vocabulary: 25,
    coherence: 25,
    taskCompletion: 25,
  }

  const prompt = `You are an expert language teacher evaluating a student's essay. 
Analyze the following essay and provide detailed feedback in JSON format.

**Essay Details:**
- Target Language: ${criteria.language === 'english' ? 'English' : 'Spanish'}
- Expected Level: ${criteria.targetLevel}
- Topic: ${criteria.topic}
- Writing Prompt: ${criteria.prompt}
${criteria.minWords ? `- Minimum Words: ${criteria.minWords}` : ''}
${criteria.maxWords ? `- Maximum Words: ${criteria.maxWords}` : ''}

**Scoring Rubric (out of ${maxPoints} total points):**
- Grammar & Accuracy: ${rubricWeights.grammar} points
- Vocabulary & Word Choice: ${rubricWeights.vocabulary} points
- Coherence & Organization: ${rubricWeights.coherence} points
- Task Completion & Content: ${rubricWeights.taskCompletion} points

**Student's Essay:**
"""
${essayText}
"""

**Instructions:**
1. Evaluate the essay based on the rubric above
2. Identify specific grammar errors with corrections
3. Suggest vocabulary improvements
4. Assess overall coherence and organization
5. Determine if the student addressed the prompt adequately
6. Estimate the student's actual language level based on their writing
7. Provide constructive feedback in ${criteria.language === 'english' ? 'English' : 'Spanish'}

**Response Format (JSON only, no markdown):**
{
  "grammar": {
    "score": <number>,
    "comments": "<detailed feedback>",
    "corrections": [
      {
        "original": "<incorrect text>",
        "corrected": "<corrected text>",
        "explanation": "<why this is wrong>"
      }
    ]
  },
  "vocabulary": {
    "score": <number>,
    "comments": "<detailed feedback>",
    "suggestions": ["<better word choices or phrases>"]
  },
  "coherence": {
    "score": <number>,
    "comments": "<feedback on organization and flow>"
  },
  "taskCompletion": {
    "score": <number>,
    "comments": "<feedback on how well they addressed the prompt>"
  },
  "overall": "<comprehensive summary of the essay quality>",
  "estimatedLevel": "<A1|A2|B1|B2|C1|C2>",
  "strengths": ["<what the student did well>"],
  "areasToImprove": ["<specific areas to work on>"],
  "wordCount": <number>
}

Respond ONLY with valid JSON, no additional text or markdown.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    const aiResponse = JSON.parse(cleanedText)

    // Calculate total score
    const totalScore =
      (aiResponse.grammar?.score || 0) +
      (aiResponse.vocabulary?.score || 0) +
      (aiResponse.coherence?.score || 0) +
      (aiResponse.taskCompletion?.score || 0)

    const percentage = (totalScore / maxPoints) * 100

    return {
      score: totalScore,
      maxScore: maxPoints,
      percentage: Math.round(percentage * 100) / 100,
      passed: percentage >= 60,
      feedback: {
        overall: aiResponse.overall || '',
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
        coherence: {
          score: aiResponse.coherence?.score || 0,
          maxScore: rubricWeights.coherence,
          comments: aiResponse.coherence?.comments || '',
        },
        taskCompletion: {
          score: aiResponse.taskCompletion?.score || 0,
          maxScore: rubricWeights.taskCompletion,
          comments: aiResponse.taskCompletion?.comments || '',
        },
      },
      wordCount: aiResponse.wordCount || essayText.split(/\s+/).filter(Boolean).length,
      estimatedLevel: aiResponse.estimatedLevel || criteria.targetLevel,
      strengths: aiResponse.strengths || [],
      areasToImprove: aiResponse.areasToImprove || [],
    }
  } catch (error) {
    console.error('Error grading essay with AI:', error)
    throw new Error('Failed to grade essay with AI. Please try again.')
  }
}

export async function gradeEssayQuestion(
  essayText: string,
  question: string,
  maxPoints: number,
  language: 'english' | 'spanish' = 'english',
  targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' = 'B1'
): Promise<{
  pointsEarned: number
  feedback: string
  detailedResult: EssayGradingResult
}> {
  const criteria: EssayGradingCriteria = {
    language,
    targetLevel,
    topic: question,
    prompt: question,
    rubric: {
      grammar: Math.round(maxPoints * 0.25),
      vocabulary: Math.round(maxPoints * 0.25),
      coherence: Math.round(maxPoints * 0.25),
      taskCompletion: Math.round(maxPoints * 0.25),
    },
  }

  const result = await gradeEssayWithAI(essayText, criteria, maxPoints)

  return {
    pointsEarned: result.score,
    feedback: result.feedback.overall,
    detailedResult: result,
  }
}
