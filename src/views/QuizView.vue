<template>
  <div class="quiz-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载题目...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <h2>加载失败</h2>
      <p>{{ error }}</p>
      <button @click="goToWelcome" class="back-btn">返回首页</button>
    </div>

    <div v-else class="quiz-content">
      <div class="quiz-header">
        <div class="header-top">
          <h2>{{ modeTitle }}</h2>
          <button @click="confirmExit" class="exit-btn" title="退出当前测试">退出</button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <div class="quiz-main">
        <div class="image-container">
          <div v-if="imageLoading" class="image-loading">
            <div class="loading-spinner"></div>
            <p>正在加载图片...</p>
          </div>
          <img
            :key="imageKey"
            :src="currentImageUrl"
            alt="Quiz Image"
            class="quiz-image"
            @load="handleImageLoaded"
            @error="handleImageError"
            :class="{ 'hidden': imageLoading }"
          />
          <div v-if="showThemeWord" class="theme-word">{{ currentThemeWord }}</div>
        </div>

        <div class="question-container">
          <div v-if="showQuestion" class="question">
            <p>{{ currentQuestion?.question }}</p>
          </div>

          <div class="answer-input">
            <div class="speech-controls">
              <button
                v-if="!isListening"
                @click="startListening"
                class="mic-btn"
                :disabled="isSpeaking"
                :title="isSpeaking ? '语音合成中，请等待' : '点击开始录音'"
              >
                <span class="mic-icon">开始录音 🎤</span>
              </button>
              <button
                v-else
                @click="stopListening"
                class="mic-btn listening"
                title="点击停止录音"
              >
                <span class="mic-icon listening">停止录音 🎤</span>
              </button>
            </div>

            <div class="transcript-container">
              <p v-if="interimTranscript" class="interim-transcript">{{ interimTranscript }}</p>
              <p v-else-if="finalTranscript" class="final-transcript">{{ finalTranscript }}</p>
              <p v-else class="placeholder">点击麦克风按钮开始回答...</p>
            </div>

            <button
              @click="submitAnswer"
              :disabled="!finalTranscript || isSubmitting"
              class="submit-btn"
            >
              提交答案
            </button>
          </div>

          <div v-if="showFeedback && currentMode === 'learn'" class="feedback">
            <div class="answer-comparison">
              <div class="user-answer">
                <h4>你的回答:</h4>
                <p>{{ finalTranscript }}</p>
              </div>
              <div class="correct-answer">
                <h4>参考答案:</h4>
                <p>{{ currentQuestion?.answer }}</p>
              </div>
            </div>
            <div class="score-display">
              <p>得分: {{ Math.round(currentScore * 100) }}%</p>
              <div class="score-bar">
                <div class="score-fill" :style="{ width: `${currentScore * 100}%` }"></div>
              </div>
            </div>
            <button @click="nextQuestion" class="next-btn">下一题</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '../stores/quiz'
import { loadCategoryData, selectRandomQuestions, scoreAnswer } from '../services/dataService'
import { speechSynthesis, speechRecognition } from '../services/speechService'
import type { ParsedQuizData, Question } from '../types/quiz'

const router = useRouter()
const quizStore = useQuizStore()

// 状态
const loading = ref(true)
const error = ref('')
const parsedData = ref<ParsedQuizData[]>([])
const isListening = ref(false)
const isSpeaking = ref(false) // 添加语音合成状态
const finalTranscript = ref('')
const interimTranscript = ref('')
const showFeedback = ref(false)
const currentScore = ref(0)
const isSubmitting = ref(false)
const imageLoading = ref(true)
const imageError = ref(false)
const questionSpoken = ref(false)
const imageKey = ref(0) // 用于强制重新加载图片

// 计算属性
const currentMode = computed(() => quizStore.currentMode)
const selectedCategories = computed(() => quizStore.selectedCategories)
const currentQuestion = computed(() => quizStore.currentQuestion)
const currentThemeWord = computed(() => quizStore.currentThemeWord)
const progress = computed(() => quizStore.progress)

const modeTitle = computed(() => {
  switch (currentMode.value) {
    case 'learn': return '学习模式'
    case 'train': return '训练模式'
    case 'compete': return '比赛模式'
    default: return '问答模式'
  }
})

const showThemeWord = computed(() => {
  return currentMode.value === 'learn' || currentMode.value === 'train'
})

const showQuestion = computed(() => {
  // 只在学习模式显示问题文本
  return currentMode.value === 'learn'
})

const currentImageUrl = computed(() => {
  if (!quizStore.currentImagePath) {
    console.log('No image path available, using placeholder')
    return 'https://via.placeholder.com/400x300?text=Image+Not+Found'
  }

  // 处理图片路径
  const imagePath = quizStore.currentImagePath
  console.log('Raw image path:', imagePath)

  // 如果路径已经是完整URL，直接返回
  if (imagePath.startsWith('http')) {
    return imagePath
  }

  // 如果路径已经包含完整路径，直接返回
  if (imagePath.startsWith('/')) {
    return imagePath
  }

  // 分解路径组件
  const pathParts = imagePath.split('/')
  let category = ''
  let filename = ''

  if (pathParts.length >= 2) {
    // 如果路径格式是 'Category/filename.jpg'
    category = pathParts[0]
    filename = pathParts[1]
  } else {
    // 如果路径只有文件名
    filename = pathParts[0]
    // 尝试从当前问题中获取类别
    if (currentQuestion.value) {
      category = currentQuestion.value.category
    }
  }

  // 构建完整路径
  // 检查文件名是否已经包含扩展名
  if (!filename.includes('.')) {
    // 处理文件名中可能有的空格
    const filenameWithoutSpace = filename.trim()

    // 我们已经检查了图片目录，发现有多种后缀名
    // 为了确保能找到正确的图片，我们尝试多种扩展名
    // 注意：有些文件名后面有空格，如 'giraffe '
    console.log(`Trying to find image for theme: ${filename}`)

    // 默认使用 .jpg，但在图片加载失败时会尝试其他后缀
    filename = `${filenameWithoutSpace}.jpg`
  }

  const path = `/data/images/${category}/${filename}`
  console.log('Constructed image path:', path)
  return path
})

// 方法
const loadQuizData = async () => {
  try {
    loading.value = true
    error.value = ''
    console.log('Loading quiz data...')

    // 如果没有选择类别，返回首页
    if (selectedCategories.value.length === 0) {
      console.log('No categories selected, returning to home page')
      router.push('/')
      return
    }

    console.log('Selected categories:', selectedCategories.value)

    // 随机选择一个类别
    const randomCategoryIndex = Math.floor(Math.random() * selectedCategories.value.length)
    const categoryId = selectedCategories.value[randomCategoryIndex]
    console.log(`Randomly selected category: ${categoryId}`)

    // 加载该类别的数据
    console.log(`Loading data for category: ${categoryId}`)
    const data = await loadCategoryData(categoryId)
    console.log(`Loaded ${data.length} items for category ${categoryId}`)
    parsedData.value = data

    if (data.length === 0) {
      console.error(`No data found for category: ${categoryId}`)
      error.value = `没有找到类别 "${categoryId}" 的题目数据`
      return
    }

    // 根据模式选择问题
    console.log(`Current mode: ${currentMode.value}`)

    if (currentMode.value === 'compete') {
      // 比赛模式：选择3张图片，每张3个问题
      console.log('Compete mode: selecting 3 images with 3 questions each')
      const selectedImages = []
      const allQuestions = []

      for (let i = 0; i < 3; i++) {
        console.log(`Selecting image ${i+1}/3`)
        const { questions, imagePath, themeWord } = selectRandomQuestions(data, 3)
        console.log(`Selected image: ${imagePath}, theme: ${themeWord}, questions: ${questions.length}`)

        if (questions.length > 0) {
          selectedImages.push({ imagePath, themeWord })
          allQuestions.push(...questions)
        }
      }

      console.log(`Total selected images: ${selectedImages.length}, total questions: ${allQuestions.length}`)
      quizStore.setQuizImages(selectedImages.map(img => img.imagePath))
      quizStore.setQuestions(allQuestions)

      // 设置第一张图片
      if (selectedImages.length > 0) {
        console.log(`Setting first image: ${selectedImages[0].imagePath}`)
        quizStore.setCurrentImage(selectedImages[0].imagePath, selectedImages[0].themeWord)
      } else {
        console.error('No images were selected')
        error.value = '无法选择图片'
        return
      }
    } else {
      // 学习和训练模式：选择一张图片的所有问题
      console.log(`${currentMode.value} mode: selecting one image with up to 7 questions`)
      const { questions, imagePath, themeWord } = selectRandomQuestions(data, 7) // 最多7个问题
      console.log(`Selected image: ${imagePath}, theme: ${themeWord}, questions: ${questions.length}`)

      if (questions.length === 0) {
        console.error('No questions were selected')
        error.value = '无法选择问题'
        return
      }

      quizStore.setQuestions(questions)
      quizStore.setCurrentImage(imagePath, themeWord)
    }

    // 设置图片加载状态
    imageLoading.value = true
    imageError.value = false
    questionSpoken.value = false

    // 注意：我们不在这里朗读问题，而是等待图片加载完成后再朗读
    if (currentQuestion.value) {
      console.log(`First question ready: ${currentQuestion.value.question}`)
    } else {
      console.warn('No first question available')
    }
  } catch (err) {
    console.error('Error loading quiz data:', err)
    error.value = '加载题目数据失败'
  } finally {
    loading.value = false
  }
}

const startListening = async () => {
  // 如果语音合成正在进行，不允许开始录音
  if (isSpeaking.value) {
    console.log('Cannot start listening while speech synthesis is active')
    return
  }

  try {
    isListening.value = true
    finalTranscript.value = ''
    interimTranscript.value = ''

    // 添加事件监听
    document.addEventListener('recognition-progress', handleRecognitionProgress)

    // 开始语音识别
    const result = await speechRecognition.start()
    finalTranscript.value = result
    isListening.value = false
  } catch (err) {
    console.error('Speech recognition error:', err)
    isListening.value = false
  }
}

const handleRecognitionProgress = (event: Event) => {
  const customEvent = event as CustomEvent
  if (customEvent.detail) {
    const { final, interim } = customEvent.detail
    if (final) finalTranscript.value = final
    if (interim) interimTranscript.value = interim
  }
}

const submitAnswer = async () => {
  // 如果正在录音，自动停止录音
  if (isListening.value) {
    console.log('Auto-stopping speech recognition before submitting answer')
    stopListening()
    // 等待录音停止并更新最终转录文本
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  if (!finalTranscript.value || !currentQuestion.value) return

  isSubmitting.value = true

  try {
    // 计算得分
    const score = scoreAnswer(finalTranscript.value, currentQuestion.value.answer)
    currentScore.value = score

    // 保存用户答案
    quizStore.addUserAnswer(finalTranscript.value, score)

    // 显示反馈
    showFeedback.value = true

    // 如果不是学习模式，自动进入下一题
    if (currentMode.value !== 'learn') {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 短暂延迟
      nextQuestion()
    }
  } finally {
    isSubmitting.value = false
  }
}

// 处理图片加载完成
const handleImageLoaded = async () => {
  console.log('Image loaded successfully')
  imageLoading.value = false
  imageError.value = false

  // 图片加载完成后朗读问题（如果还没朗读）
  if (!questionSpoken.value && currentQuestion.value) {
    console.log(`Speaking question after image load: ${currentQuestion.value.question}`)
    try {
      // 添加延迟，确保图片完全加载后再朗读
      await new Promise(resolve => setTimeout(resolve, 500))
      await speakQuestion(currentQuestion.value.question)
      questionSpoken.value = true
    } catch (err) {
      console.error('Error speaking question after image load:', err)
      // 如果朗读失败，再尝试一次
      try {
        console.log('Retrying speech after failure...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        await speakQuestion(currentQuestion.value.question)
        questionSpoken.value = true
      } catch (retryErr) {
        console.error('Retry also failed:', retryErr)
      }
    }
  }
}

// 处理图片加载错误
const handleImageError = () => {
  console.error('Image failed to load')

  // 尝试使用不同的文件后缀名
  const currentPath = quizStore.currentImagePath
  if (currentPath && !currentPath.includes('placeholder')) {
    // 如果当前路径不是占位图片
    const pathParts = currentPath.split('/')
    const filename = pathParts[pathParts.length - 1]
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'))
    const category = pathParts[pathParts.length - 2]

    // 尝试不同的文件后缀
    if (filename.endsWith('.jpg')) {
      // 如果当前是.jpg，尝试.jpeg
      const newPath = `/data/images/${category}/${filenameWithoutExt}.jpeg`
      console.log(`Trying alternative extension: ${newPath}`)
      quizStore.setCurrentImage(newPath, quizStore.currentThemeWord)
      return
    } else if (filename.endsWith('.jpeg')) {
      // 如果当前是.jpeg，尝试.png
      const newPath = `/data/images/${category}/${filenameWithoutExt}.png`
      console.log(`Trying alternative extension: ${newPath}`)
      quizStore.setCurrentImage(newPath, quizStore.currentThemeWord)
      return
    } else if (filename.endsWith('.png')) {
      // 如果当前是.png，尝试带空格的文件名
      const newPath = `/data/images/${category}/${filenameWithoutExt} .jpg`
      console.log(`Trying filename with space: ${newPath}`)
      quizStore.setCurrentImage(newPath, quizStore.currentThemeWord)
      return
    }
  }

  // 如果所有尝试都失败，标记为错误状态
  imageLoading.value = false
  imageError.value = true

  // 即使图片加载失败，也朗读问题
  if (!questionSpoken.value && currentQuestion.value) {
    console.log(`Speaking question after image error: ${currentQuestion.value.question}`)
    speakQuestion(currentQuestion.value.question)
      .then(() => { questionSpoken.value = true })
      .catch(err => console.error('Error speaking question after image error:', err))
  }
}

// 停止录音
const stopListening = () => {
  if (isListening.value) {
    console.log('Manually stopping speech recognition')
    speechRecognition.stop()
    isListening.value = false
  }
}

const nextQuestion = async () => {
  // 重置状态
  finalTranscript.value = ''
  interimTranscript.value = ''
  showFeedback.value = false
  questionSpoken.value = false

  // 记录当前图片路径，用于检测是否是同一张图片的不同问题
  const previousImagePath = quizStore.currentImagePath
  const previousQuestionIndex = quizStore.currentQuestionIndex

  // 进入下一题
  const hasNext = quizStore.nextQuestion()

  if (hasNext) {
    // 如果有下一题
    if (currentQuestion.value) {
      console.log(`Next question prepared: ${currentQuestion.value.question}`)

      // 比赛模式下，检查是否需要切换图片
      if (currentMode.value === 'compete') {
        // 每3道题切换一次图片
        const questionGroup = Math.floor(quizStore.currentQuestionIndex / 3)
        const previousGroup = Math.floor(previousQuestionIndex / 3)

        if (questionGroup !== previousGroup) {
          // 需要切换到新的图片
          console.log(`Switching to new image group: ${questionGroup}, previous: ${previousGroup}`)

          // 获取当前组对应的图片
          const imageIndex = questionGroup % quizStore.quizImages.length
          const newImagePath = quizStore.quizImages[imageIndex]

          if (newImagePath) {
            console.log(`Setting new image: ${newImagePath}`)
            quizStore.setCurrentImage(newImagePath, '')

            // 强制重新加载图片
            imageKey.value++
            imageLoading.value = true
            imageError.value = false
            // 朗读问题的逻辑移到了handleImageLoaded函数中
            return
          }
        }
      }

      // 检查是否是同一张图片
      const isSameImage = previousImagePath === quizStore.currentImagePath

      if (isSameImage) {
        console.log('Same image for next question, skipping image loading')
        // 如果是同一张图片，不需要重新加载，直接朗读问题
        imageLoading.value = false
        imageError.value = false

        // 直接朗读问题
        try {
          // 添加延迟，确保浏览器已准备好
          await new Promise(resolve => setTimeout(resolve, 500))
          await speakQuestion(currentQuestion.value.question)
          questionSpoken.value = true
        } catch (err) {
          console.error('Error speaking next question:', err)
          // 如果朗读失败，再尝试一次
          try {
            console.log('Retrying speech after failure...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            await speakQuestion(currentQuestion.value.question)
            questionSpoken.value = true
          } catch (retryErr) {
            console.error('Retry also failed:', retryErr)
          }
        }
      } else {
        // 如果是不同图片，需要重新加载
        console.log('Different image, loading new image')
        // 更新imageKey强制重新加载图片
        imageKey.value++
        imageLoading.value = true
        imageError.value = false
        // 朗读问题的逻辑移到了handleImageLoaded函数中
      }
    } else {
      console.warn('No current question available')
    }
  } else {
    // 如果没有下一题，进入结果页面
    router.push('/results')
  }
}

const speakQuestion = async (question: string) => {
  try {
    // 设置语音合成状态为正在进行
    isSpeaking.value = true

    // 先取消之前的语音合成
    speechSynthesis.cancel()

    // 等待一下，确保之前的语音合成已经完全停止
    await new Promise(resolve => setTimeout(resolve, 100))

    // 比赛模式下也要朗读问题
    console.log(`Speaking question: ${question}`)
    await speechSynthesis.speak(question)
    console.log('Question spoken successfully')
  } catch (err) {
    console.error('Speech synthesis error:', err)
    // 即使出错也继续流程，不中断用户体验
  } finally {
    // 无论成功还是失败，都将语音合成状态设置为已完成
    isSpeaking.value = false
  }
}

const goToWelcome = () => {
  router.push('/')
}

// 确认退出当前测试
const confirmExit = () => {
  if (confirm('确定要退出当前测试吗？您的进度将不会保存。')) {
    // 取消所有语音合成和语音识别
    speechSynthesis.cancel()
    speechRecognition.abort()

    // 返回首页
    goToWelcome()
  }
}

// 生命周期钩子
onMounted(() => {
  // 初始化时确保 isSpeaking 为 false
  isSpeaking.value = false
  loadQuizData()

  // 添加语音合成结束事件监听
  document.addEventListener('speechend', () => {
    console.log('Speech end event received')
    isSpeaking.value = false
  })
})

onBeforeUnmount(() => {
  // 清理事件监听
  document.removeEventListener('recognition-progress', handleRecognitionProgress)
  document.removeEventListener('speechend', () => {
    isSpeaking.value = false
  })

  // 取消语音
  speechSynthesis.cancel()
  speechRecognition.abort()
})
</script>

<style scoped>
.quiz-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.quiz-header {
  margin-bottom: 20px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-bar {
  height: 10px;
  background-color: #f3f3f3;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 10px;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.quiz-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 768px) {
  .quiz-main {
    flex-direction: row;
  }

  .image-container {
    flex: 1;
  }

  .question-container {
    flex: 1;
  }
}

.image-container {
  position: relative;
  margin-bottom: 20px;
  min-height: 300px;
  height: 400px; /* 固定高度 */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 8px;
  overflow: hidden; /* 防止内容溢出 */
}

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(245, 245, 245, 0.8);
  z-index: 2;
  border-radius: 8px;
}

.quiz-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  transition: opacity 0.3s ease;
}

.quiz-image.hidden {
  opacity: 0;
}

.theme-word {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 16px;
}

.question {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.question p {
  margin: 0;
  font-size: 18px;
}

.answer-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.speech-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.mic-btn {
  min-width: 120px;
  height: 60px;
  border-radius: 30px;
  border: none;
  background-color: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0 20px;
}

.mic-btn:hover {
  background-color: #e0e0e0;
}

.mic-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.mic-btn.listening {
  background-color: #ffebee;
  border: 2px solid #f44336;
}

.mic-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mic-icon.listening {
  color: #f44336;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.transcript-container {
  min-height: 60px;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  word-break: break-word; /* 允许单词内换行 */
  overflow-wrap: break-word; /* 确保长单词可以换行 */
}

.interim-transcript {
  color: #666;
  font-style: italic;
}

.final-transcript {
  color: #333;
  white-space: normal; /* 允许正常换行 */
}

.placeholder {
  color: #999;
  font-style: italic;
}

.submit-btn,
.next-btn,
.back-btn,
.exit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.submit-btn {
  background-color: #2196f3;
  color: white;
  align-self: center;
}

.submit-btn:hover {
  background-color: #0b7dda;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.feedback {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
}

.answer-comparison {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
}

@media (min-width: 768px) {
  .answer-comparison {
    flex-direction: row;
  }

  .user-answer,
  .correct-answer {
    flex: 1;
  }
}

.user-answer,
.correct-answer {
  padding: 10px;
  border-radius: 4px;
}

.user-answer {
  background-color: #e3f2fd;
}

.correct-answer {
  background-color: #e8f5e9;
}

.user-answer h4,
.correct-answer h4 {
  margin-top: 0;
  margin-bottom: 5px;
}

.score-display {
  margin-bottom: 15px;
}

.score-bar {
  height: 10px;
  background-color: #f3f3f3;
  border-radius: 5px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.next-btn {
  background-color: #4caf50;
  color: white;
  display: block;
  margin: 0 auto;
}

.back-btn {
  background-color: #f44336;
  color: white;
  margin-top: 20px;
}

.exit-btn {
  background-color: #f44336;
  color: white;
  padding: 5px 15px;
  font-size: 14px;
}

.next-btn:hover {
  background-color: #45a049;
}

.back-btn {
  background-color: #f44336;
  color: white;
}

.back-btn:hover {
  background-color: #d32f2f;
}
</style>

