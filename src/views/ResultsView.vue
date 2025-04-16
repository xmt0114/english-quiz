<template>
  <div class="results-container">
    <div class="results-header">
      <h1>答题结果</h1>
      <div class="score-summary">
        <div class="score-circle">
          <div class="score-value">{{ totalScore }}%</div>
        </div>
        <p class="score-text">{{ scoreMessage }}</p>
      </div>
    </div>
    
    <div v-if="currentMode === 'compete'" class="compete-summary">
      <h2>比赛模式总结</h2>
      <p>你完成了 {{ userAnswers.length }} 个问题，共 {{ quizImages.length }} 张图片</p>
    </div>
    
    <div v-if="currentMode !== 'learn'" class="answers-review">
      <h2>答题回顾</h2>
      <div v-for="(answer, index) in userAnswers" :key="index" class="answer-item">
        <div class="question-text">
          <span class="question-number">{{ index + 1 }}.</span>
          {{ answer.question }}
        </div>
        <div class="answer-comparison">
          <div class="user-answer">
            <h4>你的回答:</h4>
            <p>{{ answer.userAnswer || '(未回答)' }}</p>
          </div>
          <div class="correct-answer">
            <h4>参考答案:</h4>
            <p>{{ answer.correctAnswer }}</p>
          </div>
        </div>
        <div class="answer-score">
          <div class="score-bar">
            <div class="score-fill" :style="{ width: `${answer.score * 100}%` }"></div>
          </div>
          <span class="score-percentage">{{ Math.round(answer.score * 100) }}%</span>
        </div>
      </div>
    </div>
    
    <div class="action-buttons">
      <button @click="restartQuiz" class="restart-btn">再来一次</button>
      <button @click="goToWelcome" class="home-btn">返回首页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '../stores/quiz'

const router = useRouter()
const quizStore = useQuizStore()

// 计算属性
const userAnswers = computed(() => quizStore.userAnswers)
const currentMode = computed(() => quizStore.currentMode)
const quizImages = computed(() => quizStore.quizImages)

const totalScore = computed(() => {
  return Math.round(quizStore.score)
})

const scoreMessage = computed(() => {
  const score = totalScore.value
  
  if (score >= 90) return '太棒了！你做得非常出色！'
  if (score >= 80) return '很好！你的表现很优秀！'
  if (score >= 70) return '不错！你掌握了大部分内容！'
  if (score >= 60) return '还可以，继续努力！'
  return '加油，再多练习一下！'
})

// 方法
const restartQuiz = () => {
  // 保持当前的类别和模式，重新开始
  quizStore.resetQuiz()
  router.push('/quiz')
}

const goToWelcome = () => {
  quizStore.resetQuiz()
  router.push('/')
}
</script>

<style scoped>
.results-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.results-header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.score-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    #4caf50 0% calc(var(--score) * 1%),
    #f5f5f5 calc(var(--score) * 1%) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  position: relative;
  --score: v-bind('totalScore');
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: white;
}

.score-value {
  position: relative;
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.score-text {
  font-size: 18px;
  color: #2c3e50;
}

.compete-summary {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.answers-review {
  margin-bottom: 30px;
}

h2 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.answer-item {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.question-text {
  margin-bottom: 10px;
  font-size: 16px;
}

.question-number {
  font-weight: bold;
  margin-right: 5px;
}

.answer-comparison {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
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
  font-size: 14px;
}

.answer-score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-bar {
  flex: 1;
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

.score-percentage {
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.restart-btn,
.home-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.restart-btn {
  background-color: #4caf50;
  color: white;
}

.restart-btn:hover {
  background-color: #45a049;
}

.home-btn {
  background-color: #2196f3;
  color: white;
}

.home-btn:hover {
  background-color: #0b7dda;
}
</style>
