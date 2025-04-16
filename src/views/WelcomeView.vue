<template>
  <div class="welcome-container">
    <p>欢迎来到英语问答游戏！选择你想要练习的类别和模式，然后开始答题吧！</p>
    <p>(请在PC浏览器中选择Edge浏览器，效果更佳)</p>
    
    <div class="categories-section">
      <h2>选择类别</h2>
      <div class="categories-grid">
        <div 
          v-for="category in categories" 
          :key="category.id"
          class="category-item"
          :class="{ selected: isSelected(category.id) }"
          @click="toggleCategory(category.id)"
        >
          {{ category.name }}
        </div>
      </div>
      <div class="select-all-container">
        <button @click="selectAll" class="select-all-btn">全选</button>
        <button @click="deselectAll" class="deselect-all-btn">取消全选</button>
      </div>
    </div>
    
    <div class="mode-section">
      <h2>选择模式</h2>
      <div class="mode-options">
        <div 
          class="mode-item" 
          :class="{ selected: currentMode === 'learn' }"
          @click="setMode('learn')"
        >
          <h3>学习模式</h3>
          <p>显示问题和答案，实时反馈</p>
        </div>
        <div 
          class="mode-item" 
          :class="{ selected: currentMode === 'train' }"
          @click="setMode('train')"
        >
          <h3>训练模式</h3>
          <p>只显示主题词，结束后显示所有问题和答案</p>
        </div>
        <div 
          class="mode-item" 
          :class="{ selected: currentMode === 'compete' }"
          @click="setMode('compete')"
        >
          <h3>比赛模式</h3>
          <p>3张图片，每张3个问题，最后给总评分</p>
        </div>
      </div>
    </div>
    
    <div class="start-section">
      <button 
        @click="startQuiz" 
        class="start-btn"
        :disabled="selectedCategories.length === 0"
      >
        开始答题
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from '../stores/quiz'
import { categories } from '../services/dataService'
import type { QuizMode } from '../types/quiz'

const router = useRouter()
const quizStore = useQuizStore()

const selectedCategories = ref<string[]>([])
const currentMode = ref<QuizMode>('learn')

// 检查类别是否被选中
const isSelected = (categoryId: string): boolean => {
  return selectedCategories.value.includes(categoryId)
}

// 切换类别选择状态
const toggleCategory = (categoryId: string): void => {
  if (isSelected(categoryId)) {
    selectedCategories.value = selectedCategories.value.filter(id => id !== categoryId)
  } else {
    selectedCategories.value.push(categoryId)
  }
}

// 全选
const selectAll = (): void => {
  selectedCategories.value = categories.map(category => category.id)
}

// 取消全选
const deselectAll = (): void => {
  selectedCategories.value = []
}

// 设置模式
const setMode = (mode: QuizMode): void => {
  currentMode.value = mode
}

// 开始答题
const startQuiz = (): void => {
  // 保存选择的类别和模式到store
  quizStore.setCategories(selectedCategories.value)
  quizStore.setMode(currentMode.value)
  quizStore.resetQuiz()
  
  // 导航到答题页面
  router.push('/quiz')
}
</script>

<style scoped>
.welcome-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
}

p {
  text-align: center;
  margin-bottom: 30px;
}

.categories-section,
.mode-section {
  margin-bottom: 30px;
}

h2 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.category-item {
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-item:hover {
  background-color: #e0e0e0;
}

.category-item.selected {
  background-color: #4caf50;
  color: white;
}

.select-all-container {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.select-all-btn,
.deselect-all-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.select-all-btn {
  background-color: #2196f3;
  color: white;
}

.deselect-all-btn {
  background-color: #f44336;
  color: white;
}

.mode-options {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.mode-item {
  flex: 1;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-item:hover {
  background-color: #e0e0e0;
}

.mode-item.selected {
  background-color: #2196f3;
  color: white;
}

.mode-item h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.mode-item p {
  margin: 0;
  font-size: 14px;
}

.start-section {
  text-align: center;
}

.start-btn {
  padding: 12px 30px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.start-btn:hover {
  background-color: #45a049;
}

.start-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
