// 流式AI响应解析器
// 用于实时解析不完整的AI响应内容

export interface ParsedStreamContent {
  code: string
  thoughts: string[]
  timeComplexity: string | null
  spaceComplexity: string | null
  answers?: Array<{
    question_number: string
    answer: string
    reasoning: string
  }>
  type: 'programming' | 'multiple_choice'
  isComplete: boolean
  progress: number // 0-100 解析进度
}

/**
 * 解析流式编程题解决方案 - 支持JSON格式
 */
export function parseStreamedProgrammingSolution(content: string): ParsedStreamContent {
  const result: ParsedStreamContent = {
    code: '',
    thoughts: [],
    timeComplexity: null,
    spaceComplexity: null,
    type: 'programming',
    isComplete: false,
    progress: 0
  }

  // 🆕 使用改进的markdown格式解析（优先代码实现部分）
  // 计算内容完整度，用于进度估算
  const hasThoughts = content.includes('思路') || content.includes('解题思路')
  const hasCode = content.includes('```')
  const hasComplexity = content.includes('复杂度') || content.includes('时间复杂度')
  
  let progress = 0
  if (hasThoughts) progress += 25
  if (hasCode) progress += 50
  if (hasComplexity) progress += 25
  
  result.progress = Math.min(progress, 95) // 最高95%，完成时才100%

  // 🆕 优化的代码提取逻辑 - 优先从**代码实现：**部分提取
  const codeImplMatch = content.match(/\*\*代码实现：?\*\*[\s\S]*?```(?:\w+)?\s*([\s\S]*?)```/i)
  if (codeImplMatch) {
    result.code = codeImplMatch[1].trim()
    console.log('✅ 从代码实现部分提取到代码 (流式):', {
      codeLength: result.code.length,
      startsWithValidCode: result.code.includes('main') || result.code.includes('def') || result.code.includes('class') || result.code.includes('function')
    })
  } else {
    // 后备方案：提取代码块，但检查是否是示例
    const codeMatches = content.match(/```[\s\S]*?```/g) || []
    if (codeMatches.length > 0) {
      // 先检查第一个代码块是否像示例输入
      const firstCodeBlock = codeMatches[0]
      const firstCode = firstCodeBlock.replace(/```\w*\n?/, '').replace(/```\s*$/, '').trim()
      const mightBeExample = /^\d+[\s\d]*$/.test(firstCode.split('\n')[0])
      
      if (mightBeExample && codeMatches.length > 1) {
        // 如果第一个像示例，尝试第二个
        const secondCodeBlock = codeMatches[1]
        const secondCode = secondCodeBlock.replace(/```\w*\n?/, '').replace(/```\s*$/, '').trim()
        if (secondCode.length > 20 && (secondCode.includes('def') || secondCode.includes('main') || secondCode.includes('function') || secondCode.includes('class'))) {
          result.code = secondCode
          console.log('✅ 使用第二个代码块 (流式，跳过示例)')
        } else {
          result.code = firstCode // 还是用第一个
        }
      } else {
        result.code = firstCode
      }
    } else {
      // 如果没有完整代码块，尝试提取部分代码
      const partialCodeMatch = content.match(/```[\w]*\n?([\s\S]*)$/m)
      if (partialCodeMatch) {
        result.code = partialCodeMatch[1]?.trim() || ''
      }
    }
  }

  // 提取解题思路 - 支持实时更新
  result.thoughts = extractThoughts(content)

  // 提取复杂度信息
  result.timeComplexity = extractComplexity(content, '时间复杂度')
  result.spaceComplexity = extractComplexity(content, '空间复杂度')

  // 判断是否完成（简单启发式）
  const hasCompleteCode = result.code.length > 20 && content.includes('```') && !content.endsWith('```\n')
  const hasCompleteThoughts = result.thoughts.length > 0
  const hasCompleteComplexity = result.timeComplexity && result.spaceComplexity
  
  result.isComplete = hasCompleteCode && hasCompleteThoughts && hasCompleteComplexity
  if (result.isComplete) {
    result.progress = 100
  }

  return result
}

/**
 * 解析流式选择题解决方案
 */
export function parseStreamedMultipleChoiceSolution(content: string): ParsedStreamContent {
  const result: ParsedStreamContent = {
    code: '',
    thoughts: [],
    timeComplexity: null,
    spaceComplexity: null,
    answers: [],
    type: 'multiple_choice',
    isComplete: false,
    progress: 0
  }

  // 计算选择题内容完整度
  const hasAnswers = content.includes('答案') || /题目\d+.*[A-D]/i.test(content)
  const hasThoughts = content.includes('思路') || content.includes('解题思路') || content.includes('分析')
  
  let progress = 0
  if (hasAnswers) progress += 60
  if (hasThoughts) progress += 40
  
  result.progress = Math.min(progress, 95)

  // 提取答案 - 实时解析
  result.answers = extractMultipleChoiceAnswers(content)
  
  // 提取解题思路
  result.thoughts = extractThoughts(content)

  // 判断完成状态
  result.isComplete = result.answers.length > 0 && result.thoughts.length > 0
  if (result.isComplete) {
    result.progress = 100
  }

  return result
}

/**
 * 通用流式解析器 - 自动判断类型
 */
export function parseStreamedSolution(content: string): ParsedStreamContent {
  // 简单判断是否为选择题
  const isMultipleChoice = /[A-D][\s\S]*选项|题目\d+.*[A-D]|答案.*[A-D]/i.test(content)
  
  if (isMultipleChoice) {
    return parseStreamedMultipleChoiceSolution(content)
  } else {
    return parseStreamedProgrammingSolution(content)
  }
}

/**
 * 提取解题思路（支持多种格式）
 */
function extractThoughts(content: string): string[] {
  const thoughts: string[] = []
  
  // 匹配思路部分的多种格式
  const thoughtsPatterns = [
    /(?:解题思路|思路|关键洞察|推理|方法)[:：]([\s\S]*?)(?:(?:代码实现|复杂度分析|答案|$))/i,
    /(?:解题思路|思路)[:：]?\s*\n([\s\S]*?)(?:\n\s*(?:\*\*|##|代码|复杂度|答案|$))/i
  ]

  for (const pattern of thoughtsPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      const thoughtsText = match[1].trim()
      
      // 提取列表项（支持多种格式）
      const bulletPoints = thoughtsText.match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.+)/g)
      if (bulletPoints) {
        thoughts.push(...bulletPoints.map(point => 
          point.replace(/^\s*(?:[-*•]|\d+\.)\s*/, '').trim()
        ).filter(Boolean))
      } else {
        // 如果没有列表格式，按行分割
        thoughts.push(...thoughtsText.split('\n')
          .map(line => line.trim())
          .filter(line => line && line.length > 3)
          .slice(0, 5) // 限制最多5行，避免噪音
        )
      }
      break
    }
  }

  return thoughts.filter(Boolean)
}

/**
 * 提取复杂度信息
 */
function extractComplexity(content: string, type: '时间复杂度' | '空间复杂度'): string | null {
  const pattern = new RegExp(`${type}[:：]?\\s*([^\\n]+(?:\\n[^\\n]*)*?)(?=\\n\\s*(?:空间复杂度|时间复杂度|$))`, 'i')
  const match = content.match(pattern)
  
  if (match && match[1]) {
    return match[1].trim()
  }
  
  return null
}

/**
 * 提取选择题答案
 */
function extractMultipleChoiceAnswers(content: string): Array<{
  question_number: string
  answer: string
  reasoning: string
}> {
  const answers: Array<{
    question_number: string
    answer: string
    reasoning: string
  }> = []

  // 多种答案格式的正则表达式
  const answerPatterns = [
    /题目(\d+)\s*[-－:：]\s*([A-D]+)/gi,
    /(\d+)\s*[-－:：]\s*([A-D]+)/gi,
    /题(\d+)\s*[-－:：]\s*([A-D]+)/gi,
    /第?(\d+)题?\s*[-－:：]?\s*答案?\s*[:：]?\s*([A-D]+)/gi
  ]

  for (const pattern of answerPatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      const questionNumber = match[1]
      const answer = match[2].toUpperCase()

      // 避免重复添加相同题目
      if (!answers.find(a => a.question_number === questionNumber)) {
        // 尝试提取对应的推理过程
        const reasoningPattern = new RegExp(`题目${questionNumber}[分析：:]*([^\\n]*(?:\\n(?!\\d+\\.|题目|第)[^\\n]*)*)`, 'i')
        const reasoningMatch = content.match(reasoningPattern)
        const reasoning = reasoningMatch && reasoningMatch[1] 
          ? reasoningMatch[1].trim().replace(/^[：:]\s*/, '')
          : `题目${questionNumber}的解答分析`

        answers.push({
          question_number: questionNumber,
          answer: answer,
          reasoning: reasoning
        })
      }
    }

    if (answers.length > 0) break
  }

  return answers
}

/**
 * 计算流式内容的预估完成度
 */
export function estimateStreamProgress(content: string, type: 'programming' | 'multiple_choice'): number {
  if (type === 'programming') {
    const sections = [
      { name: '思路', weight: 25, pattern: /(?:解题思路|思路)/i },
      { name: '代码', weight: 50, pattern: /```[\s\S]*?```/ },
      { name: '复杂度', weight: 25, pattern: /(?:时间复杂度|空间复杂度)/i }
    ]
    
    let progress = 0
    sections.forEach(section => {
      if (section.pattern.test(content)) {
        progress += section.weight
      }
    })
    
    return Math.min(progress, 95)
  } else {
    const sections = [
      { name: '答案', weight: 60, pattern: /题目\d+.*[A-D]/i },
      { name: '思路', weight: 40, pattern: /(?:解题思路|思路|分析)/i }
    ]
    
    let progress = 0
    sections.forEach(section => {
      if (section.pattern.test(content)) {
        progress += section.weight
      }
    })
    
    return Math.min(progress, 95)
  }
}

/**
 * 检测内容是否达到可显示的最小阈值
 */
export function shouldStartDisplaying(content: string): boolean {
  // 内容长度大于20字符，或者包含关键标识符
  return content.length > 20 || 
         /(?:思路|代码|答案|```)/i.test(content)
}

/**
 * 为流式显示格式化内容
 */
export function formatStreamContent(content: string, addCursor = true): string {
  if (addCursor && !content.endsWith('\n')) {
    return content + '▋' // 添加光标效果
  }
  return content
}