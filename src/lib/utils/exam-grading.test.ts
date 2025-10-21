import { describe, it, expect } from 'vitest'
import { gradeQuestion, gradeExam } from './exam-grading'
import { CreateExamQuestionData } from '@/types/exam'

describe('Exam Grading - Multiple Choice Questions', () => {
  const multipleChoiceQuestion: CreateExamQuestionData = {
    type: 'MULTIPLE_CHOICE',
    question: '¿Cuál es la capital de España?',
    options: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla'],
    correctAnswer: 'Madrid',
    points: 10,
  }

  it('should mark correct answer as correct', () => {
    const result = gradeQuestion(multipleChoiceQuestion, 'Madrid', '0-0')
    expect(result.isCorrect).toBe(true)
    expect(result.pointsEarned).toBe(10)
    expect(result.maxPoints).toBe(10)
  })

  it('should mark incorrect answer as incorrect', () => {
    const result = gradeQuestion(multipleChoiceQuestion, 'Barcelona', '0-0')
    expect(result.isCorrect).toBe(false)
    expect(result.pointsEarned).toBe(0)
    expect(result.maxPoints).toBe(10)
  })

  it('should be case-sensitive for multiple choice', () => {
    const result = gradeQuestion(multipleChoiceQuestion, 'madrid', '0-0')
    expect(result.isCorrect).toBe(false)
  })

  it('should include question key and answer in result', () => {
    const result = gradeQuestion(multipleChoiceQuestion, 'Madrid', '0-0')
    expect(result.questionKey).toBe('0-0')
    expect(result.userAnswer).toBe('Madrid')
    expect(result.correctAnswer).toBe('Madrid')
  })
})

describe('Exam Grading - True/False Questions', () => {
  const trueFalseQuestion: CreateExamQuestionData = {
    type: 'TRUE_FALSE',
    question: 'El sol es una estrella',
    correctAnswer: 'true',
    points: 5,
  }

  it('should mark true as correct', () => {
    const result = gradeQuestion(trueFalseQuestion, 'true', '0-0')
    expect(result.isCorrect).toBe(true)
    expect(result.pointsEarned).toBe(5)
  })

  it('should mark false as incorrect when answer is true', () => {
    const result = gradeQuestion(trueFalseQuestion, 'false', '0-0')
    expect(result.isCorrect).toBe(false)
    expect(result.pointsEarned).toBe(0)
  })
})

describe('Exam Grading - Short Answer Questions', () => {
  const shortAnswerQuestion: CreateExamQuestionData = {
    type: 'SHORT_ANSWER',
    question: '¿Cuál es la capital de Francia?',
    correctAnswer: 'París',
    points: 10,
    caseSensitive: false,
  }

  it('should mark correct answer as correct (case insensitive)', () => {
    const result = gradeQuestion(shortAnswerQuestion, 'parís', '0-0')
    expect(result.isCorrect).toBe(true)
    expect(result.pointsEarned).toBe(10)
  })

  it('should handle case variations when case insensitive', () => {
    expect(gradeQuestion(shortAnswerQuestion, 'PARÍS', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(shortAnswerQuestion, 'París', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(shortAnswerQuestion, 'paris', '0-0').isCorrect).toBe(false) // accent matters
  })

  it('should trim whitespace from answers', () => {
    const result = gradeQuestion(shortAnswerQuestion, '  parís  ', '0-0')
    expect(result.isCorrect).toBe(true)
  })

  it('should normalize multiple spaces', () => {
    const question: CreateExamQuestionData = {
      ...shortAnswerQuestion,
      correctAnswer: 'New York',
    }
    const result = gradeQuestion(question, 'New   York', '0-0')
    expect(result.isCorrect).toBe(true)
  })
})

describe('Exam Grading - Short Answer with Case Sensitivity', () => {
  const caseSensitiveQuestion: CreateExamQuestionData = {
    type: 'SHORT_ANSWER',
    question: 'What is the chemical symbol for gold?',
    correctAnswer: 'Au',
    points: 5,
    caseSensitive: true,
  }

  it('should respect case sensitivity when enabled', () => {
    expect(gradeQuestion(caseSensitiveQuestion, 'Au', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(caseSensitiveQuestion, 'au', '0-0').isCorrect).toBe(false)
    expect(gradeQuestion(caseSensitiveQuestion, 'AU', '0-0').isCorrect).toBe(false)
  })
})

describe('Exam Grading - Multiple Correct Answers', () => {
  const multipleAnswersQuestion: CreateExamQuestionData = {
    type: 'SHORT_ANSWER',
    question: '¿Cómo se dice "hello" en español?',
    correctAnswer: ['hola', 'buenos días', 'buenas'],
    points: 10,
    caseSensitive: false,
  }

  it('should accept any of the correct answers', () => {
    expect(gradeQuestion(multipleAnswersQuestion, 'hola', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(multipleAnswersQuestion, 'buenos días', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(multipleAnswersQuestion, 'buenas', '0-0').isCorrect).toBe(true)
  })

  it('should reject incorrect answers', () => {
    expect(gradeQuestion(multipleAnswersQuestion, 'adiós', '0-0').isCorrect).toBe(false)
  })
})

describe('Exam Grading - Partial Credit', () => {
  const partialCreditQuestion: CreateExamQuestionData = {
    type: 'SHORT_ANSWER',
    question: 'What is the capital of the United Kingdom?',
    correctAnswer: 'London',
    points: 10,
    partialCredit: true,
    caseSensitive: false,
  }

  it('should give full points for exact match', () => {
    const result = gradeQuestion(partialCreditQuestion, 'London', '0-0')
    expect(result.isCorrect).toBe(true)
    expect(result.pointsEarned).toBe(10)
  })

  it('should give partial credit for similar answers (>70% similarity)', () => {
    const result = gradeQuestion(partialCreditQuestion, 'Londn', '0-0') // Missing 'o'
    expect(result.isCorrect).toBe(false)
    expect(result.pointsEarned).toBe(5) // 50% of points
  })

  it('should give no credit for very different answers', () => {
    const result = gradeQuestion(partialCreditQuestion, 'Paris', '0-0')
    expect(result.isCorrect).toBe(false)
    expect(result.pointsEarned).toBe(0)
  })

  it('should not give partial credit when disabled', () => {
    const noPartialQuestion = { ...partialCreditQuestion, partialCredit: false }
    const result = gradeQuestion(noPartialQuestion, 'Londn', '0-0')
    expect(result.pointsEarned).toBe(0)
  })
})

describe('Exam Grading - Fill in the Blank', () => {
  const fillBlankQuestion: CreateExamQuestionData = {
    type: 'FILL_BLANK',
    question: 'The sky is ____',
    correctAnswer: 'blue',
    points: 5,
    caseSensitive: false,
  }

  it('should grade fill in the blank like short answer', () => {
    expect(gradeQuestion(fillBlankQuestion, 'blue', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(fillBlankQuestion, 'BLUE', '0-0').isCorrect).toBe(true)
    expect(gradeQuestion(fillBlankQuestion, 'red', '0-0').isCorrect).toBe(false)
  })
})

describe('Exam Grading - Essay Questions', () => {
  const essayQuestion: CreateExamQuestionData = {
    type: 'ESSAY',
    question: 'Describe the water cycle',
    correctAnswer: '',
    points: 20,
  }

  it('should not auto-grade essay questions', () => {
    const result = gradeQuestion(essayQuestion, 'The water cycle involves...', '0-0')
    expect(result.isCorrect).toBe(false)
    expect(result.pointsEarned).toBe(0)
    expect(result.maxPoints).toBe(20)
  })

  it('should preserve user answer for manual grading', () => {
    const userAnswer = 'The water cycle is a complex process...'
    const result = gradeQuestion(essayQuestion, userAnswer, '0-0')
    expect(result.userAnswer).toBe(userAnswer)
  })
})

describe('Exam Grading - Full Exam Grading', () => {
  const examSections = [
    {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'Question 1',
          options: ['A', 'B', 'C'],
          correctAnswer: 'A',
          points: 10,
        },
        {
          type: 'TRUE_FALSE' as const,
          question: 'Question 2',
          correctAnswer: 'true',
          points: 10,
        },
      ],
    },
    {
      questions: [
        {
          type: 'SHORT_ANSWER' as const,
          question: 'Question 3',
          correctAnswer: 'answer',
          points: 20,
          caseSensitive: false,
        },
      ],
    },
  ]

  it('should grade complete exam with all correct answers', () => {
    const answers = {
      '0-0': 'A',
      '0-1': 'true',
      '1-0': 'answer',
    }

    const result = gradeExam(examSections, answers)

    expect(result.totalQuestions).toBe(3)
    expect(result.correctAnswers).toBe(3)
    expect(result.incorrectAnswers).toBe(0)
    expect(result.totalPoints).toBe(40)
    expect(result.earnedPoints).toBe(40)
    expect(result.percentage).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('should grade exam with some incorrect answers', () => {
    const answers = {
      '0-0': 'B', // Incorrect
      '0-1': 'true', // Correct
      '1-0': 'answer', // Correct
    }

    const result = gradeExam(examSections, answers)

    expect(result.totalQuestions).toBe(3)
    expect(result.correctAnswers).toBe(2)
    expect(result.incorrectAnswers).toBe(1)
    expect(result.totalPoints).toBe(40)
    expect(result.earnedPoints).toBe(30)
    expect(result.percentage).toBe(75)
    expect(result.passed).toBe(true)
  })

  it('should fail exam when below passing score', () => {
    const answers = {
      '0-0': 'B', // Incorrect
      '0-1': 'false', // Incorrect
      '1-0': 'wrong', // Incorrect
    }

    const result = gradeExam(examSections, answers, 70)

    expect(result.correctAnswers).toBe(0)
    expect(result.incorrectAnswers).toBe(3)
    expect(result.earnedPoints).toBe(0)
    expect(result.percentage).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('should handle missing answers', () => {
    const answers = {
      '0-0': 'A', // Correct
      // '0-1' missing
      // '1-0' missing
    }

    const result = gradeExam(examSections, answers)

    expect(result.correctAnswers).toBe(1)
    expect(result.incorrectAnswers).toBe(2)
    expect(result.earnedPoints).toBe(10)
  })

  it('should use custom passing score', () => {
    const answers = {
      '0-0': 'A',
      '0-1': 'true',
      '1-0': 'wrong',
    }

    const result80 = gradeExam(examSections, answers, 80)
    const result50 = gradeExam(examSections, answers, 50)

    expect(result80.percentage).toBe(50)
    expect(result80.passed).toBe(false)
    expect(result50.passed).toBe(true)
  })

  it('should include question results with details', () => {
    const answers = {
      '0-0': 'A',
      '0-1': 'true',
      '1-0': 'answer',
    }

    const result = gradeExam(examSections, answers)

    expect(result.questionResults).toHaveLength(3)
    expect(result.questionResults[0].questionKey).toBe('0-0')
    expect(result.questionResults[0].isCorrect).toBe(true)
    expect(result.questionResults[0].userAnswer).toBe('A')
  })
})

describe('Exam Grading - Exam with Essays', () => {
  const examWithEssay = [
    {
      questions: [
        {
          type: 'MULTIPLE_CHOICE' as const,
          question: 'MC Question',
          options: ['A', 'B'],
          correctAnswer: 'A',
          points: 10,
        },
        {
          type: 'ESSAY' as const,
          question: 'Essay Question',
          correctAnswer: '',
          points: 30,
        },
      ],
    },
  ]

  it('should skip essay questions in automatic grading', () => {
    const answers = {
      '0-0': 'A',
      '0-1': 'My essay answer...',
    }

    const result = gradeExam(examWithEssay, answers)

    expect(result.totalQuestions).toBe(2)
    expect(result.correctAnswers).toBe(1) // Only MC counted
    expect(result.totalPoints).toBe(40)
    expect(result.earnedPoints).toBe(10) // Essay not graded
    expect(result.questionResults[1].explanation).toContain('manual')
  })
})

describe('Exam Grading - Edge Cases', () => {
  it('should handle empty exam', () => {
    const result = gradeExam([], {})

    expect(result.totalQuestions).toBe(0)
    expect(result.correctAnswers).toBe(0)
    expect(result.percentage).toBe(0)
  })

  it('should handle exam with no answers provided', () => {
    const sections = [
      {
        questions: [
          {
            type: 'MULTIPLE_CHOICE' as const,
            question: 'Q1',
            options: ['A'],
            correctAnswer: 'A',
            points: 10,
          },
        ],
      },
    ]

    const result = gradeExam(sections, {})

    expect(result.totalQuestions).toBe(1)
    expect(result.correctAnswers).toBe(0)
    expect(result.earnedPoints).toBe(0)
  })

  it('should round percentage to 2 decimal places', () => {
    const sections = [
      {
        questions: [
          {
            type: 'MULTIPLE_CHOICE' as const,
            question: 'Q1',
            options: ['A'],
            correctAnswer: 'A',
            points: 3,
          },
          {
            type: 'MULTIPLE_CHOICE' as const,
            question: 'Q2',
            options: ['A'],
            correctAnswer: 'A',
            points: 3,
          },
          {
            type: 'MULTIPLE_CHOICE' as const,
            question: 'Q3',
            options: ['A'],
            correctAnswer: 'A',
            points: 3,
          },
        ],
      },
    ]

    const answers = { '0-0': 'A', '0-1': 'B', '0-2': 'B' }
    const result = gradeExam(sections, answers)

    expect(result.percentage).toBe(33.33)
  })
})
