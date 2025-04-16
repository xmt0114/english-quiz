import type { Category, Question, QuizData, ParsedQuizData } from '../types/quiz'

// 基础路径
// 使用相对路径而不是环境变量
const BASE_PATH = '/data/images/'
const CSV_PATH = '/data/csv/'

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

// 加载CSV数据
export async function loadCsvData(categoryId: string): Promise<ParsedQuizData[]> {
  try {
    // 尝试加载新的英文列名CSV文件，如果失败则回退到原始文件
    let url = `${CSV_PATH}${categoryId}_qa_fixed.csv`
    console.log(`Trying to fetch fixed CSV data from: ${url}`)

    let response = await fetch(url)

    // 如果新文件不存在，则使用原始文件
    if (!response.ok) {
      url = `${CSV_PATH}${categoryId}_qa.csv`
      console.log(`Fixed CSV not found, fetching original CSV data from: ${url}`)
      response = await fetch(url)
    } else {
      console.log(`Successfully loaded fixed CSV file`)
    }

    // 检查最终的响应是否成功
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log(`CSV data loaded, length: ${csvText.length} bytes`)

    if (csvText.length === 0) {
      throw new Error('CSV file is empty')
    }

    // 输出前100个字符作为调试信息
    console.log(`CSV preview: ${csvText.substring(0, 100)}...`)

    const parsedData = parseCSV(csvText)
    console.log(`Parsed ${parsedData.length} rows from CSV`)

    const processedData = processQuizData(parsedData)
    console.log(`Processed ${processedData.length} quiz items`)

    return processedData
  } catch (error) {
    console.error(`Error loading CSV data for ${categoryId}:`, error)
    return []
  }
}

// 解析CSV文本
function parseCSV(csvText: string): QuizData[] {
  console.log(`Parsing CSV text of length: ${csvText.length}`)

  // 定义必要的列名映射
  const requiredHeadersMap = {
    '类别': ['类别', 'Category'],
    '提取名字': ['提取名字', 'ThemeWord'],
    '图片路径': ['图片路径', 'ImagePath'],
    '问题': ['问题', 'Question'],
    '答案': ['答案', 'Answer'],
    '信息提取2': ['信息提取2', '信息提取_2', 'Description']
  }

  try {
    // 分析CSV文本
    const result: QuizData[] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false
    let rowCount = 0
    let headers: string[] = []

    // 创建列名映射表
    const headerMap: Record<string, string> = {}

    // 逐字符处理CSV文本
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i]
      const nextChar = i < csvText.length - 1 ? csvText[i + 1] : ''

      // 处理引号
      if (char === '"') {
        // 如果下一个字符也是引号，表示转义引号
        if (nextChar === '"') {
          currentField += '"'
          i++ // 跳过下一个引号
        } else {
          inQuotes = !inQuotes
        }
      }
      // 处理逗号（如果不在引号内）
      else if (char === ',' && !inQuotes) {
        currentRow.push(currentField)
        currentField = ''
      }
      // 处理换行符（如果不在引号内）
      else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
        // 如果是\r\n，跳过\n
        if (char === '\r' && nextChar === '\n') {
          i++
        }

        // 添加最后一个字段
        currentRow.push(currentField)
        currentField = ''

        // 处理行
        if (rowCount === 0) {
          // 第一行是标题
          headers = currentRow.map(h => h.trim())

          // 创建列名映射表
          for (const [field, possibleHeaders] of Object.entries(requiredHeadersMap)) {
            for (const header of possibleHeaders) {
              if (headers.includes(header)) {
                headerMap[header] = field
                break
              }
            }
          }

          // 检查必要字段
          const missingFields = []
          for (const [field, possibleHeaders] of Object.entries(requiredHeadersMap)) {
            if (!possibleHeaders.some(h => headers.includes(h))) {
              missingFields.push(field)
            }
          }

          if (missingFields.length > 0) {
            console.error(`CSV is missing required fields: ${missingFields.join(', ')}`)
            console.log('Available headers:', headers)
          }
        } else {
          // 处理数据行
          if (currentRow.length === headers.length) {
            const entry: Record<string, string> = {}

            headers.forEach((header, index) => {
              // 如果是英文列名，使用映射表将其映射到中文列名
              const mappedHeader = headerMap[header] || header
              entry[mappedHeader] = currentRow[index] || ''

              // 同时保存原始列名的值
              entry[header] = currentRow[index] || ''
            })

            result.push(entry as QuizData)
          } else {
            console.warn(`Row ${rowCount} has ${currentRow.length} fields, expected ${headers.length}`)
          }
        }

        // 重置行
        currentRow = []
        rowCount++
      }
      // 其他字符
      else {
        currentField += char
      }
    }

    // 处理最后一行（如果文件不以换行符结尾）
    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField)

      if (rowCount > 0 && currentRow.length === headers.length) {
        const entry: Record<string, string> = {}

        headers.forEach((header, index) => {
          const mappedHeader = headerMap[header] || header
          entry[mappedHeader] = currentRow[index] || ''
          entry[header] = currentRow[index] || ''
        })

        result.push(entry as QuizData)
      }
    }

    console.log(`Parsed ${result.length} rows from CSV`)
    return result
  } catch (error) {
    console.error('Error parsing CSV:', error)
    return []
  }
}

// 处理问题和答案
function processQuizData(data: QuizData[]): ParsedQuizData[] {
  return data.map(item => {
    console.log('Processing item:', item)

    // 解析问题和答案
    // 处理不同的换行符
    // 支持英文列名
    const questionText = item.问题 || item.Question || ''
    const answerText = item.答案 || item.Answer || ''

    const questionLines = questionText.split(/\\n|\n/) || []
    const answerLines = answerText.split(/\\n|\n/) || []

    const questions: Question[] = []

    for (let i = 0; i < questionLines.length; i++) {
      const questionLine = questionLines[i].trim()
      const answerLine = answerLines[i]?.trim() || ''

      if (questionLine && answerLine) {
        // 提取问题和答案文本（去掉序号）
        const questionMatch = questionLine.match(/^\d+\.\s*(.+)$/)
        const answerMatch = answerLine.match(/^\d+\.\s*(.+)$/)

        if (questionMatch && answerMatch) {
          questions.push({
            question: questionMatch[1],
            answer: answerMatch[1],
            category: item.类别 || item.Category || '',
            themeWord: item.提取名字 || item.ThemeWord || ''
          })
        }
      }
    }

    // 处理图片路径
    // 支持英文列名
    let imagePath = item.图片路径 || item.ImagePath || ''

    // 处理类别名称，确保与文件夹名称匹配
    const categoryFolder = item.类别 || item.Category || ''

    // 处理主题词，确保与文件名匹配
    const themeWord = item.提取名字 || item.ThemeWord || ''

    console.log(`ThemeWord from CSV: ${themeWord}, Category: ${categoryFolder}`)

    // 如果没有图片路径，则根据类别和主题词构建
    if (categoryFolder && themeWord) {
      // 构建图片路径
      imagePath = `${categoryFolder}/${themeWord}.jpg`
      console.log(`Constructed image path: ${imagePath}`)
    }

    // 检查图片路径是否有效
    if (!categoryFolder || !themeWord) {
      console.error(`Invalid image path components: category=${categoryFolder}, themeWord=${themeWord}`)
    }

    return {
      category: item.类别 || item.Category || '',
      themeWord: item.提取名字 || item.ThemeWord || '',
      imagePath: imagePath,
      description: item.信息提取2 || item.信息提取_2 || item.Description || '',
      questions
    }
  })
}

// 获取图片URL
export function getImageUrl(category: string, themeWord: string): string {
  console.log(`Getting image URL for category: ${category}, themeWord: ${themeWord}`)

  // 处理文件名中可能有的空格
  const themeWordTrimmed = themeWord.trim()

  // 默认使用 .jpg 扩展名
  const url = `${BASE_PATH}${category}/${themeWordTrimmed}.jpg`
  console.log(`Constructed image URL: ${url}`)
  return url
}

// 随机选择问题
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
