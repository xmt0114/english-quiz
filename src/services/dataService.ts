import type { Category, Question, QuizData, ParsedQuizData } from '../types/quiz'

// 基础路径
// 使用相对路径而不是环境变量
const BASE_PATH = '/data/images/'
const JSON_PATH = '/data/json/'

// 所有类别
export const categories: Category[] = [
  { id: 'Animals', name: '动物', folderPath: `${BASE_PATH}Animals/` },
  { id: 'Body Parts', name: '身体部位', folderPath: `${BASE_PATH}Body Parts/` },
  { id: 'Clothes', name: '衣物', folderPath: `${BASE_PATH}Clothes/` },
  { id: 'Colors', name: '颜色', folderPath: `${BASE_PATH}Colors/` },
  { id: 'Daily Routine', name: '日常活动', folderPath: `${BASE_PATH}Daily Routine/` },
  { id: 'Family & Friends', name: '家人和朋友', folderPath: `${BASE_PATH}Family & Friends/` },
  { id: 'Feelings', name: '情感', folderPath: `${BASE_PATH}Feelings/` },
  { id: 'Food & Drink', name: '食物和饮料', folderPath: `${BASE_PATH}Food & Drink/` },
  { id: 'Map', name: '地图', folderPath: `${BASE_PATH}Map/` },
  { id: 'Number', name: '数字', folderPath: `${BASE_PATH}Number/` },
  { id: 'Places&Preposition', name: '地点和介词', folderPath: `${BASE_PATH}Places&Preposition/` },
  { id: 'School', name: '学校', folderPath: `${BASE_PATH}School/` },
  { id: 'The Home', name: '家', folderPath: `${BASE_PATH}The Home/` },
  { id: 'Things to do', name: '活动', folderPath: `${BASE_PATH}Things to do/` },
  { id: 'Transportation', name: '交通工具', folderPath: `${BASE_PATH}Transportation/` }
]

// 添加缓存
let cachedJsonData: ParsedQuizData[] | null = null

// 加载JSON数据
export async function loadJsonData(): Promise<ParsedQuizData[]> {
  // 如果已有缓存数据，直接返回
  if (cachedJsonData) {
    console.log('Using cached JSON data')
    return cachedJsonData
  }

  try {
    const url = `${JSON_PATH}all_quiz_data.json`
    console.log(`Fetching JSON data from: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`)
    }

    const jsonData = await response.json()
    console.log(`JSON data loaded, ${jsonData.length} items found`)

    // 将JSON数据转换为ParsedQuizData格式
    const processedData: ParsedQuizData[] = jsonData.map((item: any) => {
      // 转换questions格式以匹配ParsedQuizData
      const questions: Question[] = item.questions.map((q: any) => ({
        question: q.question,
        answer: q.answer,
        category: item.category,
        themeWord: item.themeWord,
        number: q.number // 保留问题编号
      }))

      // 优先使用displayUrl字段，其次使用url字段，最后使用本地路径
      let imagePath = '';
      if (item.displayUrl) {
        imagePath = item.displayUrl;
      } else if (item.url) {
        imagePath = item.url;
      } else if (item.localImagePath) {
        imagePath = item.localImagePath;
      } else if (item.category && item.themeWord) {
        // 如果没有网络URL，则构建本地路径
        imagePath = `${BASE_PATH}${item.category}/${item.themeWord}.jpg`;
      }
      
      console.log(`Image path for ${item.themeWord}: ${imagePath}`);

      return {
        category: item.category,
        themeWord: item.themeWord,
        imagePath: imagePath,
        description: item.description || '',
        questions
      }
    })

    // 保存到缓存
    cachedJsonData = processedData
    
    return processedData
  } catch (error) {
    console.error('Error loading JSON data:', error)
    return []
  }
}

// 修改 loadCategoryData 函数，添加更好的错误处理
export const loadCategoryData = async (categoryId: string): Promise<ParsedQuizData[]> => {
  try {
    console.log(`Fetching data for category: ${categoryId}`)
    
    // 确保 categoryId 有效
    if (!categoryId) {
      console.error('Invalid categoryId provided')
      return []
    }
    
    // 加载所有数据
    const allData = await loadJsonData()
    
    // 筛选出特定类别的数据
    const categoryData = allData.filter(item => item.category === categoryId)
    
    console.log(`Found ${categoryData.length} items for category ${categoryId}`)
    
    return categoryData
  } catch (error) {
    console.error('Error loading category data:', error)
    return []
  }
}

// 删除不再需要的CSV相关函数
// 保留随机选择问题的函数
export function selectRandomQuestions(
  parsedData: ParsedQuizData[],
  count: number = 3
): { questions: Question[], imagePath: string, themeWord: string } {
  if (parsedData.length === 0) {
    return { questions: [], imagePath: '', themeWord: '' }
  }

  // 随机选择一个主题
  const randomIndex = Math.floor(Math.random() * parsedData.length)
  const selectedData = parsedData[randomIndex]

  // 如果问题数量不足，返回所有问题
  if (selectedData.questions.length <= count) {
    return {
      questions: selectedData.questions,
      imagePath: selectedData.imagePath,
      themeWord: selectedData.themeWord
    }
  }

  // 随机选择指定数量的问题
  const shuffled = [...selectedData.questions].sort(() => 0.5 - Math.random())

  return {
    questions: shuffled.slice(0, count),
    imagePath: selectedData.imagePath,
    themeWord: selectedData.themeWord
  }
}

// 评分函数
export function scoreAnswer(userAnswer: string, correctAnswer: string): number {
  if (!userAnswer) return 0

  // 转换为小写并去除标点符号进行比较
  const normalizedUserAnswer = userAnswer.toLowerCase().replace(/[.,?!]/g, '')
  const normalizedCorrectAnswer = correctAnswer.toLowerCase().replace(/[.,?!]/g, '')

  // 完全匹配
  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return 1
  }

  // 包含关键词
  const correctWords = normalizedCorrectAnswer.split(' ')
  const userWords = normalizedUserAnswer.split(' ')

  // 计算匹配的关键词数量
  let matchCount = 0
  for (const word of correctWords) {
    if (word.length > 3 && userWords.includes(word)) { // 只考虑长度大于3的词
      matchCount++
    }
  }

  // 计算得分比例
  const keywordScore = correctWords.length > 0 ? matchCount / correctWords.length : 0

  // 返回0-1之间的得分
  return Math.min(Math.max(keywordScore, 0), 1)
}










