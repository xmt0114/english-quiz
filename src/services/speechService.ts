// 语音合成服务
export class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null
  private utterance: SpeechSynthesisUtterance | null = null
  private voices: SpeechSynthesisVoice[] = []
  private selectedVoice: SpeechSynthesisVoice | null = null
  private initialized: boolean = false
  private initializationAttempted: boolean = false

  constructor() {
    // 延迟初始化，避免在构造函数中直接访问语音API
    if (typeof window !== 'undefined') {
      // 等待页面完全加载后再初始化
      if (document.readyState === 'complete') {
        this.initialize()
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => this.initialize(), 100) // 额外延迟100ms确保浏览器准备好
        })
      }
    } else {
      this.initialize() // 非浏览器环境直接初始化
    }
  }

  // 初始化语音合成服务
  private async initialize(): Promise<void> {
    try {
      console.log('=== initialize: 开始初始化语音合成服务... ===')
      this.initializationAttempted = true

      // 检查浏览器支持
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        console.log('浏览器支持语音合成API')
        this.synth = window.speechSynthesis
        
        // 记录浏览器信息
        const userAgent = window.navigator.userAgent;
        console.log(`浏览器信息: ${userAgent}`);

        // 首次尝试加载语音
        console.log('首次尝试加载语音...')
        await this.loadVoices()
        console.log(`首次加载后voices数量: ${this.voices.length}`)

        // 监听voices加载完成事件
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          console.log('设置onvoiceschanged事件监听器')
          window.speechSynthesis.onvoiceschanged = this.handleVoicesChanged.bind(this)
        } else {
          console.log('此浏览器不支持onvoiceschanged事件')
        }

        this.initialized = true
        console.log('=== 语音合成服务初始化成功 ===')
      } else {
        console.error('=== 此浏览器不支持语音合成 ===')
      }
    } catch (error) {
      console.error('=== 初始化语音合成服务失败 ===', error)
    }
  }

  // 处理语音变化事件
  private handleVoicesChanged(): void {
    console.log('Voices changed event triggered')
    this.loadVoices()
  }

  // 加载可用的语音
  private async loadVoices(): Promise<void> {
    if (!this.synth) {
      console.error('Cannot load voices: speech synthesis not initialized')
      return
    }

    console.log('=== loadVoices: 开始加载语音 ===')
    // 尝试获取语音，有时候需要多次尝试
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      this.voices = this.synth.getVoices()
      console.log(`Loaded ${this.voices.length} voices (attempt ${attempts + 1}/${maxAttempts})`)
      
      if (this.voices.length > 0) {
        console.log('=== 语音加载成功，详细信息: ===')
        this.voices.forEach((voice, index) => {
          if (index < 5) { // 只打印前5个避免日志过多
            console.log(`Voice ${index}: ${voice.name}, Lang: ${voice.lang}, Default: ${voice.default}`)
          }
        })
        break
      }

      console.log(`尝试 ${attempts + 1} 失败，等待后重试...`)
      // 等待一下再尝试
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    // 尝试选择微软的英语声音
    // 首先尝试微软的声音
    let microsoftVoice = this.voices.find(voice =>
      (voice.name.includes('Microsoft') || voice.name.includes('Microsoft')) &&
      (voice.lang.includes('en-US') || voice.lang.includes('en-GB'))
    )

    // 如果没有微软的声音，则选择任何英语声音
    if (!microsoftVoice) {
      microsoftVoice = this.voices.find(voice =>
        voice.lang.includes('en-US') || voice.lang.includes('en-GB')
      )
    }

    // 如果还是没有找到，则使用第一个可用的声音
    this.selectedVoice = microsoftVoice || this.voices[0]

    if (this.selectedVoice) {
      console.log(`Selected voice: ${this.selectedVoice.name} (${this.selectedVoice.lang})`)
    } else {
      console.warn('No suitable voice found')
    }
  }

  async speak(text: string): Promise<void> {
    console.log('=== speak: 开始语音合成过程 ===')
    // 如果还没有初始化完成，尝试初始化
    if (!this.initialized && !this.initializationAttempted) {
      console.log('Speech service not initialized, attempting to initialize...')
      await this.initialize()
      console.log(`初始化后状态: initialized=${this.initialized}, voices数量=${this.voices.length}`)
    } else {
      console.log(`当前状态: initialized=${this.initialized}, voices数量=${this.voices.length}`)
    }

    // 添加预热步骤，确保语音引擎真正准备好
    await this.warmUpSpeechEngine()

    return new Promise((resolve, reject) => {
      if (!this.synth) {
        console.error('Speech synthesis not available')
        console.log('=== 语音合成不可用，提前退出 ===')
        // 如果语音合成不可用，仍然解析承诺，但记录错误
        resolve()
        return
      }

      try {
        // 取消之前的语音
        console.log('取消之前的语音合成...')
        this.cancel()

        console.log(`Creating utterance for text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`)
        this.utterance = new SpeechSynthesisUtterance(text)

        if (this.selectedVoice) {
          console.log(`Using voice: ${this.selectedVoice.name} (${this.selectedVoice.lang})`)
          this.utterance.voice = this.selectedVoice
        } else {
          console.warn('No voice selected, using default')
        }

        this.utterance.rate = 0.85 // 稍微放慢语速
        this.utterance.pitch = 1
        this.utterance.lang = 'en-US' // 确保语言设置为英语
        console.log(`语音参数设置完成: rate=${this.utterance.rate}, pitch=${this.utterance.pitch}, lang=${this.utterance.lang}`)

        this.utterance.onend = () => {
          console.log('=== 语音合成成功完成 ===')
          // 触发自定义事件，通知语音合成已结束
          document.dispatchEvent(new CustomEvent('speechend'))
          resolve()
        }

        this.utterance.onerror = (event) => {
          const errorMessage = `Speech synthesis error: ${event.error || 'unknown error'}`
          console.error(`=== 语音合成错误: ${errorMessage} ===`)
          reject(new Error(errorMessage))
        }

        console.log('=== 即将开始语音合成... ===')
        console.log('Starting speech...')
        
        // 记录语音合成前的状态
        console.log(`语音合成前状态检查: synth=${!!this.synth}, utterance=${!!this.utterance}, 
          paused=${this.synth?.paused}, speaking=${this.synth?.speaking}`)
        
        this.synth.speak(this.utterance)
        
        // 记录语音合成后的状态
        console.log(`语音合成后状态检查: synth=${!!this.synth}, utterance=${!!this.utterance}, 
          paused=${this.synth?.paused}, speaking=${this.synth?.speaking}`)
      } catch (error) {
        console.error('Error in speak method:', error)
        // 如果出错，仍然解析承诺，但记录错误
        resolve()
      }
    })
  }

  cancel(): void {
    try {
      if (this.synth) {
        console.log('Cancelling any ongoing speech')
        this.synth.cancel()
        // 触发自定义事件，通知语音合成已取消
        document.dispatchEvent(new CustomEvent('speechend'))
      }
    } catch (error) {
      console.error('Error cancelling speech:', error)
    }
  }

  isPaused(): boolean {
    try {
      return this.synth?.paused || false
    } catch (error) {
      console.error('Error checking pause state:', error)
      return false
    }
  }

  pause(): void {
    try {
      if (this.synth) {
        console.log('Pausing speech')
        this.synth.pause()
      }
    } catch (error) {
      console.error('Error pausing speech:', error)
    }
  }

  resume(): void {
    try {
      if (this.synth) {
        console.log('Resuming speech')
        this.synth.resume()
      }
    } catch (error) {
      console.error('Error resuming speech:', error)
    }
  }

  // 新增预热方法，确保语音引擎真正准备好
  private async warmUpSpeechEngine(): Promise<void> {
    // 检查语音合成引擎是否可用
    if (!this.synth) {
      console.log('语音引擎不可用，跳过预热');
      return;
    }
    
    // 如果已经在说话，则不需要预热
    if (this.synth.speaking || this.synth.pending) {
      console.log('语音引擎已经活跃，跳过预热');
      return;
    }
    
    console.log('开始预热语音引擎...');
    
    try {
      // 确保取消任何可能存在的语音
      this.synth.cancel();
      
      // 创建一个空的语音请求来"唤醒"引擎
      const warmupUtterance = new SpeechSynthesisUtterance('.');
      warmupUtterance.volume = 0; // 静音
      warmupUtterance.rate = 1;
      
      // 使用Promise等待预热完成
      await new Promise<void>((resolve) => {
        // 设置事件处理器
        const handleEnd = () => {
          console.log('语音引擎预热完成');
          warmupUtterance.onend = null;
          warmupUtterance.onerror = null;
          resolve();
        };
        
        warmupUtterance.onend = handleEnd;
        
        warmupUtterance.onerror = (event) => {
          console.log(`语音引擎预热出错: ${event.error || '未知错误'}`);
          warmupUtterance.onend = null;
          warmupUtterance.onerror = null;
          resolve(); // 即使出错也继续执行
        };
        
        // 设置超时，防止卡住
        const timeoutId = setTimeout(() => {
          console.log('语音引擎预热超时，继续执行');
          warmupUtterance.onend = null;
          warmupUtterance.onerror = null;
          resolve();
        }, 1000); // 增加超时时间到1秒
      
        // 开始预热 - 添加null检查
        if (this.synth) {
          this.synth.speak(warmupUtterance);
          
          // 检查是否真的开始了 - 添加null检查
          if (!this.synth.speaking && !this.synth.pending) {
            console.log('预热语音没有开始，可能是浏览器限制');
            clearTimeout(timeoutId);
            resolve();
          }
        } else {
          console.log('预热过程中语音引擎变为不可用');
          clearTimeout(timeoutId);
          resolve();
        }
      });
      
      // 确保清除预热的语音 - 添加null检查
      if (this.synth) {
        this.synth.cancel();
      }
      console.log('语音引擎预热流程完成');
      
    } catch (error) {
      console.error('预热语音引擎出错:', error);
      // 错误不阻止继续执行
    }
  }
}

// 语音识别服务
export class SpeechRecognitionService {
  private recognition: any = null
  private isListening: boolean = false
  private finalTranscript: string = ''
  private initialized: boolean = false
  private initializationAttempted: boolean = false

  constructor() {
    // 延迟初始化，避免在构造函数中直接访问语音API
    this.initialize()
  }

  // 初始化语音识别服务
  private initialize(): void {
    try {
      console.log('Initializing speech recognition service...')
      this.initializationAttempted = true

      // 检查浏览器支持
      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
          console.error('Speech recognition not supported in this browser')
          return
        }

        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true  // 改为持续模式，不会自动停止
        this.recognition.interimResults = true
        this.recognition.lang = 'en-US'
        // 禁用自动停止
        this.recognition.maxAlternatives = 1

        this.initialized = true
        console.log('Speech recognition service initialized successfully')
      } else {
        console.error('Window object not available (not running in browser)')
      }
    } catch (error) {
      console.error('Failed to initialize speech recognition service:', error)
    }
  }

  async start(): Promise<string> {
    // 如果还没有初始化完成，尝试初始化
    if (!this.initialized && !this.initializationAttempted) {
      console.log('Speech recognition service not initialized, attempting to initialize...')
      this.initialize()
      // 给初始化一些时间
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        const errorMsg = 'Speech recognition not supported or not initialized'
        console.error(errorMsg)
        reject(new Error(errorMsg))
        return
      }

      if (this.isListening) {
        console.warn('Speech recognition is already active, stopping previous session')
        this.stop()
      }

      try {
        console.log('Starting speech recognition...')
        this.finalTranscript = ''
        this.isListening = true

        this.recognition.onresult = (event: any) => {
          try {
            let interimTranscript = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript

              if (event.results[i].isFinal) {
                this.finalTranscript += transcript
                console.log(`Final transcript updated: ${this.finalTranscript}`)
              } else {
                interimTranscript += transcript
              }
            }

            // 触发进度更新事件
            console.log('Dispatching recognition progress event')
            const progressEvent = new CustomEvent('recognition-progress', {
              detail: { final: this.finalTranscript, interim: interimTranscript }
            })
            document.dispatchEvent(progressEvent)
          } catch (error) {
            console.error('Error in onresult handler:', error)
          }
        }

      this.recognition.onend = () => {
        try {
          console.log('Speech recognition ended')
          this.isListening = false

          // 触发结束事件
          console.log('Dispatching recognition end event')
          const endEvent = new CustomEvent('recognition-end', {
            detail: { transcript: this.finalTranscript }
          })
          document.dispatchEvent(endEvent)

          resolve(this.finalTranscript)
        } catch (error) {
          console.error('Error in onend handler:', error)
          resolve(this.finalTranscript) // 仍然解析承诺
        }
      }

      this.recognition.onerror = (event: any) => {
        try {
          const errorMessage = `Speech recognition error: ${event.error || 'unknown error'}`
          console.error(errorMessage)
          this.isListening = false

          // 对于非致命错误，仍然解析承诺
          if (event.error === 'no-speech' || event.error === 'aborted') {
            console.log('Non-fatal error, resolving promise')
            resolve('')
          } else {
            reject(new Error(errorMessage))
          }
        } catch (error) {
          console.error('Error in onerror handler:', error)
          reject(new Error('Unknown speech recognition error'))
        }
      }

      try {
        console.log('Calling recognition.start()')

        // 确保之前的语音合成已经停止
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel()
          // 给语音合成一些时间停止 - 使用同步方式
          // 注意：这里不能使用await，因为我们在Promise回调中，不是async函数
          window.setTimeout(() => {
            try {
              this.recognition.start()

              // 触发开始事件
              console.log('Dispatching recognition start event')
              const startEvent = new CustomEvent('recognition-start')
              document.dispatchEvent(startEvent)
            } catch (startError) {
              console.error('Error starting speech recognition in timeout:', startError)
              reject(new Error(`Failed to start speech recognition: ${startError}`))
            }
          }, 200)
          return // 提前返回，避免下面的代码执行
        }

        // 如果不需要等待语音合成，直接开始识别
        this.recognition.start()

        // 触发开始事件
        console.log('Dispatching recognition start event')
        const startEvent = new CustomEvent('recognition-start')
        document.dispatchEvent(startEvent)
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        reject(new Error(`Failed to start speech recognition: ${error}`))
      }
      } catch (error) {
        console.error('Error in start method:', error)
        reject(new Error(`Speech recognition error: ${error}`))
      }
    })
  }

  stop(): void {
    try {
      if (this.recognition && this.isListening) {
        console.log('Stopping speech recognition')
        this.recognition.stop()
        this.isListening = false
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error)
    }
  }

  abort(): void {
    try {
      if (this.recognition && this.isListening) {
        console.log('Aborting speech recognition')
        this.recognition.abort()
        this.isListening = false
      }
    } catch (error) {
      console.error('Error aborting speech recognition:', error)
    }
  }

  isRecognizing(): boolean {
    return this.isListening
  }
}

// 创建单例实例
export const speechSynthesis = new SpeechSynthesisService()
export const speechRecognition = new SpeechRecognitionService()







