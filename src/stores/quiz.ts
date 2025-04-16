import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category, Question, QuizMode, UserAnswer } from '../types/quiz'

export const useQuizStore = defineStore('quiz', () => {
  // State
  const selectedCategories = ref<string[]>([])
  const currentMode = ref<QuizMode>('learn')
  const currentQuestions = ref<Question[]>([])
  const currentQuestionIndex = ref(0)
  const userAnswers = ref<UserAnswer[]>([])
  const currentImagePath = ref('')
  const currentThemeWord = ref('')
  const isQuizComplete = ref(false)
  const quizImages = ref<string[]>([])
  
  // Getters
  const currentQuestion = computed(() => 
    currentQuestions.value[currentQuestionIndex.value] || null
  )
  
  const progress = computed(() => {
    if (currentQuestions.value.length === 0) return 0
    return (currentQuestionIndex.value / currentQuestions.value.length) * 100
  })
  
  const score = computed(() => {
    if (userAnswers.value.length === 0) return 0
    const totalScore = userAnswers.value.reduce((sum, answer) => sum + answer.score, 0)
    return Math.round((totalScore / userAnswers.value.length) * 100)
  })
  
  // Actions
  function setCategories(categories: string[]) {
    selectedCategories.value = categories
  }
  
  function setMode(mode: QuizMode) {
    currentMode.value = mode
  }
  
  function setQuestions(questions: Question[]) {
    currentQuestions.value = questions
    currentQuestionIndex.value = 0
    userAnswers.value = []
    isQuizComplete.value = false
  }
  
  function setCurrentImage(imagePath: string, themeWord: string) {
    currentImagePath.value = imagePath
    currentThemeWord.value = themeWord
  }
  
  function nextQuestion() {
    if (currentQuestionIndex.value < currentQuestions.value.length - 1) {
      currentQuestionIndex.value++
      return true
    } else {
      isQuizComplete.value = true
      return false
    }
  }
  
  function addUserAnswer(answer: string, score: number) {
    userAnswers.value.push({
      questionIndex: currentQuestionIndex.value,
      question: currentQuestions.value[currentQuestionIndex.value].question,
      userAnswer: answer,
      correctAnswer: currentQuestions.value[currentQuestionIndex.value].answer,
      score
    })
  }
  
  function resetQuiz() {
    currentQuestions.value = []
    currentQuestionIndex.value = 0
    userAnswers.value = []
    currentImagePath.value = ''
    currentThemeWord.value = ''
    isQuizComplete.value = false
    quizImages.value = []
  }
  
  function setQuizImages(images: string[]) {
    quizImages.value = images
  }
  
  return {
    // State
    selectedCategories,
    currentMode,
    currentQuestions,
    currentQuestionIndex,
    userAnswers,
    currentImagePath,
    currentThemeWord,
    isQuizComplete,
    quizImages,
    
    // Getters
    currentQuestion,
    progress,
    score,
    
    // Actions
    setCategories,
    setMode,
    setQuestions,
    setCurrentImage,
    nextQuestion,
    addUserAnswer,
    resetQuiz,
    setQuizImages
  }
})
