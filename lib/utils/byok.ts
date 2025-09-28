import { getUserAPIKey } from '@/components/ui/api-key-manager'

/**
 * Get the appropriate API key for a provider
 * Prioritizes user's BYOK key over app's default key
 */
export function getProviderAPIKey(providerId: string): string | null {
  // First try to get user's BYOK key (only on client side)
  const userKey = getUserAPIKey(providerId)
  if (userKey) {
    return userKey
  }

  // Fall back to app's environment key
  switch (providerId) {
    case 'openai':
      return process.env.OPENAI_API_KEY || null
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || null
    case 'groq':
      return process.env.GROQ_API_KEY || null
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY || null
    case 'fireworks':
      return process.env.FIREWORKS_API_KEY || null
    case 'xai':
      return process.env.XAI_API_KEY || null
    case 'azure':
      return process.env.AZURE_OPENAI_API_KEY || null
    default:
      return null
  }
}

/**
 * Check if we have any API key (user or app) for a provider
 */
export function hasAPIKeyForProvider(providerId: string): boolean {
  return getProviderAPIKey(providerId) !== null
}

/**
 * Get provider configuration with user's API key if available
 */
export function getProviderConfig(providerId: string) {
  const apiKey = getProviderAPIKey(providerId)
  
  switch (providerId) {
    case 'openai':
      return apiKey ? { apiKey } : null
    case 'anthropic':
      return apiKey ? { apiKey } : null
    case 'groq':
      return apiKey ? { apiKey } : null
    case 'deepseek':
      return apiKey ? { 
        apiKey,
        baseURL: 'https://api.deepseek.com'
      } : null
    case 'fireworks':
      return apiKey ? {
        apiKey,
        baseURL: 'https://api.fireworks.ai/inference/v1'
      } : null
    case 'xai':
      return apiKey ? {
        apiKey,
        baseURL: 'https://api.x.ai/v1'
      } : null
    case 'azure':
      return apiKey ? {
        apiKey,
        baseURL: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
      } : null
    default:
      return null
  }
}

/**
 * Create a provider instance with BYOK support
 */
export function createProviderWithBYOK(providerId: string, providerClass: any) {
  const config = getProviderConfig(providerId)
  
  if (!config) {
    throw new Error(`No API key available for provider: ${providerId}`)
  }
  
  return new providerClass(config)
}
