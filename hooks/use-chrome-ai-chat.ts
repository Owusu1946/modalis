import { useState, useCallback } from 'react'
import { Message } from 'ai'
import { streamChromeAI } from '@/lib/chrome-ai/client-stream'

export interface ChromeAIChatOptions {
  onFinish?: (message: Message) => void
  onError?: (error: Error) => void
}

export function useChromeAIChat(options: ChromeAIChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')

  const sendMessage = useCallback(async (messages: Message[], input: string) => {
    setIsLoading(true)
    setStreamingMessage('')

    // Use the existing messages array (user message should already be added by the caller)
    const allMessages = messages

    try {
      let fullResponse = ''

      await streamChromeAI({
        messages: allMessages,
        onChunk: (chunk) => {
          fullResponse += chunk
          setStreamingMessage(fullResponse)
        },
        onFinish: (response) => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response
          }
          
          setStreamingMessage('')
          options.onFinish?.(assistantMessage)
        },
        onError: (error) => {
          setStreamingMessage('')
          options.onError?.(error)
        }
      })

    } catch (error) {
      setStreamingMessage('')
      options.onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsLoading(false)
    }
  }, [options])

  return {
    sendMessage,
    isLoading,
    streamingMessage
  }
}
