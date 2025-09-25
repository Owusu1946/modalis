import { Message } from 'ai'
import { getChromeAIStatus } from '../providers/chrome-ai'

export interface ChromeAIStreamOptions {
  messages: Message[]
  onChunk?: (chunk: string) => void
  onFinish?: (fullResponse: string) => void
  onError?: (error: Error) => void
  temperature?: number
  topK?: number
}

export async function streamChromeAI(options: ChromeAIStreamOptions) {
  const { messages, onChunk, onFinish, onError, temperature = 0.7, topK = 40 } = options

  try {
    // Check if Chrome AI is available
    const status = await getChromeAIStatus()
    if (!status.available) {
      throw new Error(status.message)
    }

    if (typeof window === 'undefined' || !window.ai) {
      throw new Error('Chrome AI is not available in this environment')
    }

    // Create a session
    const session = await window.ai.createTextSession({
      temperature,
      topK
    })

    try {
      // Convert messages to a single prompt
      const prompt = convertMessagesToPrompt(messages)
      
      // Stream the response
      const stream = session.promptStreaming(prompt)
      const reader = stream.getReader()
      
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        fullResponse += value
        onChunk?.(value)
      }

      onFinish?.(fullResponse)
      return fullResponse

    } finally {
      session.destroy()
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error(String(error))
    onError?.(errorMessage)
    throw errorMessage
  }
}

function convertMessagesToPrompt(messages: Message[]): string {
  return messages
    .map((message) => {
      if (message.role === 'system') {
        return `System: ${message.content}`
      } else if (message.role === 'user') {
        return `User: ${message.content}`
      } else if (message.role === 'assistant') {
        return `Assistant: ${message.content}`
      }
      return message.content
    })
    .join('\n\n')
}
