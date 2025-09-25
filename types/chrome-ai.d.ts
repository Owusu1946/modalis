declare global {
  interface Window {
    ai?: {
      canCreateTextSession(): Promise<'readily' | 'after-download' | 'no'>
      createTextSession(options?: {
        temperature?: number
        topK?: number
      }): Promise<{
        prompt(input: string): Promise<string>
        promptStreaming(input: string): ReadableStream<string>
        destroy(): void
      }>
    }
  }
}

export {}
