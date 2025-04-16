export type QuizMode = 'learn' | 'train' | 'compete'

export interface Category {
  id: string
  name: string
  folderPath: string
}

export interface Question {
  question: string
  answer: string
  category: string
  themeWord: string
}

export interface UserAnswer {
  questionIndex: number
  question: string
  userAnswer: string
  correctAnswer: string
  score: number
}

export interface QuizData {
  // 支持中文列名
  类别: string
  提取名字: string
  图片路径: string
  信息提取2: string
  问题: string
  答案: string

  // 支持英文列名
  Category?: string
  ThemeWord?: string
  ImagePath?: string
  Description?: string
  Question?: string
  Answer?: string

  // 支持其他可能的列名变体
  信息提取_2?: string

  // 支持动态属性
  [key: string]: string | undefined
}

export interface ParsedQuizData {
  category: string
  themeWord: string
  imagePath: string
  description: string
  questions: Question[]
}
