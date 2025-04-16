import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('../views/WelcomeView.vue')
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: () => import('../views/QuizView.vue')
  },
  {
    path: '/results',
    name: 'Results',
    component: () => import('../views/ResultsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
