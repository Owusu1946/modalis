import { LanguageModelV1, LanguageModelV1StreamPart } from '@ai-sdk/provider'

// Chrome AI types are now defined in types/chrome-ai.d.ts

export class ChromeAILanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1'
  readonly provider = 'chrome'
  readonly modelId: string
  readonly maxTokens?: number
  readonly supportsStreaming = true
  readonly defaultObjectGenerationMode = undefined

  constructor(modelId: string, settings?: { maxTokens?: number }) {
    this.modelId = modelId
    this.maxTokens = settings?.maxTokens
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]) {
    if (typeof window === 'undefined') {
      throw new Error('Chrome AI only works in the browser, not on the server')
    }

    if (!window.ai) {
      throw new Error(
        'Chrome AI is not available. Please use Chrome Dev/Canary 127+ and enable these flags:\n' +
        '• chrome://flags/#prompt-api-for-gemini-nano → "Enabled"\n' +
        '• chrome://flags/#optimization-guide-on-device-model → "Enabled BypassPrefRequirement"\n' +
        'Then visit chrome://components and update "Optimization Guide On Device Model"'
      )
    }

    const canCreate = await window.ai.canCreateTextSession()
    if (canCreate === 'no') {
      throw new Error(
        'Gemini Nano is not available on this device. Requirements:\n' +
        '• 22GB+ free storage space\n' +
        '• 4GB+ VRAM (dedicated graphics)\n' +
        '• Unmetered internet connection\n' +
        '• Supported OS: Windows 10/11, macOS 13+, Linux, or ChromeOS'
      )
    }

    if (canCreate === 'after-download') {
      throw new Error(
        'Gemini Nano is downloading in the background. Please wait a few minutes and try again.\n' +
        'You can check download progress at chrome://on-device-internals'
      )
    }

    const session = await window.ai.createTextSession({
      temperature: options.temperature,
      topK: options.topK
    })

    try {
      const promptText = this.convertPromptToText(options.prompt)
      
      const response = await session.prompt(promptText)
      
      return {
        text: response,
        usage: {
          promptTokens: Math.ceil(promptText.length / 4), // Rough estimate
          completionTokens: Math.ceil(response.length / 4)
        },
        finishReason: 'stop' as const,
        logprobs: undefined,
        rawCall: { rawPrompt: promptText, rawSettings: options }
      }
    } finally {
      session.destroy()
    }
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]) {
    if (typeof window === 'undefined') {
      throw new Error('Chrome AI only works in the browser, not on the server')
    }

    if (!window.ai) {
      throw new Error(
        'Chrome AI is not available. Please use Chrome Dev/Canary 127+ and enable these flags:\n' +
        '• chrome://flags/#prompt-api-for-gemini-nano → "Enabled"\n' +
        '• chrome://flags/#optimization-guide-on-device-model → "Enabled BypassPrefRequirement"\n' +
        'Then visit chrome://components and update "Optimization Guide On Device Model"'
      )
    }

    const canCreate = await window.ai.canCreateTextSession()
    if (canCreate === 'no') {
      throw new Error(
        'Gemini Nano is not available on this device. Requirements:\n' +
        '• 22GB+ free storage space\n' +
        '• 4GB+ VRAM (dedicated graphics)\n' +
        '• Unmetered internet connection\n' +
        '• Supported OS: Windows 10/11, macOS 13+, Linux, or ChromeOS'
      )
    }

    if (canCreate === 'after-download') {
      throw new Error(
        'Gemini Nano is downloading in the background. Please wait a few minutes and try again.\n' +
        'You can check download progress at chrome://on-device-internals'
      )
    }

    const session = await window.ai.createTextSession({
      temperature: options.temperature,
      topK: options.topK
    })

    const promptText = this.convertPromptToText(options.prompt)
    
    const stream = session.promptStreaming(promptText)
    const reader = stream.getReader()
    
    let fullText = ''

    return {
      stream: new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              fullText += value
              controller.enqueue({
                type: 'text-delta',
                textDelta: value
              })
            }
            
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: {
                promptTokens: Math.ceil(promptText.length / 4),
                completionTokens: Math.ceil(fullText.length / 4)
              }
            })
          } catch (error) {
            controller.error(error)
          } finally {
            session.destroy()
            controller.close()
          }
        }
      }),
      rawCall: { rawPrompt: promptText, rawSettings: options }
    }
  }

  private convertPromptToText(prompt: any): string {
    if (typeof prompt === 'string') {
      return prompt
    }
    
    if (Array.isArray(prompt)) {
      return prompt
        .map((message: any) => {
          if (message.role === 'system') {
            return `System: ${message.content}`
          } else if (message.role === 'user') {
            return `User: ${message.content}`
          } else if (message.role === 'assistant') {
            return `Assistant: ${message.content}`
          }
          return message.content || ''
        })
        .join('\n\n')
    }
    
    return String(prompt)
  }
}

export function createChromeAI() {
  return {
    languageModel: (modelId: string, settings?: { maxTokens?: number }) =>
      new ChromeAILanguageModel(modelId, settings),
    textEmbeddingModel: () => {
      throw new Error('Chrome AI does not support text embeddings')
    }
  }
}

// Helper function to check if Chrome AI is available
export async function isChromeAIAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ai) {
    return false
  }
  
  try {
    const canCreate = await window.ai.canCreateTextSession()
    return canCreate === 'readily'
  } catch {
    return false
  }
}

// Helper function to get Chrome AI status
export async function getChromeAIStatus(): Promise<{
  available: boolean
  status: string
  message: string
}> {
  if (typeof window === 'undefined') {
    return {
      available: false,
      status: 'server-side',
      message: 'Chrome AI only works in the browser'
    }
  }
  
  if (!window.ai) {
    return {
      available: false,
      status: 'not-supported',
      message: 'Chrome AI not available. Use Chrome Dev/Canary 127+ with flags enabled.'
    }
  }
  
  try {
    const canCreate = await window.ai.canCreateTextSession()
    
    switch (canCreate) {
      case 'readily':
        return {
          available: true,
          status: 'ready',
          message: 'Gemini Nano is ready to use'
        }
      case 'after-download':
        return {
          available: false,
          status: 'downloading',
          message: 'Gemini Nano is downloading. Please wait and try again.'
        }
      case 'no':
        return {
          available: false,
          status: 'unavailable',
          message: 'Gemini Nano unavailable. Check hardware requirements (22GB storage, 4GB+ VRAM).'
        }
      default:
        return {
          available: false,
          status: 'unknown',
          message: 'Unknown Chrome AI status'
        }
    }
  } catch (error) {
    return {
      available: false,
      status: 'error',
      message: `Chrome AI error: ${error}`
    }
  }
}
