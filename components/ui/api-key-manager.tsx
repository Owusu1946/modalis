'use client'

import React, { useEffect,useState } from 'react'

import { AlertCircle,CheckCircle2, Eye, EyeOff, Key, Settings, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Badge } from './badge'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { Input } from './input'
import { Label } from './label'
import { Separator } from './separator'

interface ProviderConfig {
  id: string
  name: string
  description: string
  keyPattern?: RegExp
  placeholder: string
  required: boolean
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, o3-mini models',
    keyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    placeholder: 'sk-...',
    required: false
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3.7 models',
    keyPattern: /^sk-ant-[a-zA-Z0-9\-_]{32,}$/,
    placeholder: 'sk-ant-...',
    required: false
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Fast inference for Llama and other models',
    keyPattern: /^gsk_[a-zA-Z0-9]{32,}$/,
    placeholder: 'gsk_...',
    required: false
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek R1 and V3 reasoning models',
    keyPattern: /^sk-[a-zA-Z0-9]{32,}$/,
    placeholder: 'sk-...',
    required: false
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'DeepSeek R1, Llama 4 Maverick models',
    keyPattern: /^[a-zA-Z0-9]{32,}$/,
    placeholder: 'fw_...',
    required: false
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    description: 'Grok 2, Grok 3 Beta models',
    keyPattern: /^xai-[a-zA-Z0-9]{32,}$/,
    placeholder: 'xai-...',
    required: false
  }
]

interface APIKeyManagerProps {
  onKeysChange?: (keys: Record<string, string>) => void
}

export function APIKeyManager({ onKeysChange }: APIKeyManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load saved keys from localStorage on mount
  useEffect(() => {
    const savedKeys: Record<string, string> = {}
    PROVIDERS.forEach(provider => {
      const key = localStorage.getItem(`byok_${provider.id}`)
      if (key) {
        savedKeys[provider.id] = key
      }
    })
    setKeys(savedKeys)
    if (onKeysChange) {
      onKeysChange(savedKeys)
    }
  }, [onKeysChange])

  const validateKey = (providerId: string, key: string): string | null => {
    if (!key.trim()) return null
    
    const provider = PROVIDERS.find(p => p.id === providerId)
    if (!provider?.keyPattern) return null
    
    if (!provider.keyPattern.test(key)) {
      return `Invalid ${provider.name} API key format`
    }
    
    return null
  }

  const handleKeyChange = (providerId: string, value: string) => {
    const newKeys = { ...keys, [providerId]: value }
    setKeys(newKeys)

    // Validate the key
    const error = validateKey(providerId, value)
    setValidationErrors(prev => ({
      ...prev,
      [providerId]: error || ''
    }))

    // Save to localStorage and notify parent
    if (value.trim()) {
      localStorage.setItem(`byok_${providerId}`, value)
    } else {
      localStorage.removeItem(`byok_${providerId}`)
      delete newKeys[providerId]
    }

    if (onKeysChange) {
      onKeysChange(newKeys)
    }
  }

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }

  const removeKey = (providerId: string) => {
    const newKeys = { ...keys }
    delete newKeys[providerId]
    setKeys(newKeys)
    
    localStorage.removeItem(`byok_${providerId}`)
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[providerId]
      return newErrors
    })

    if (onKeysChange) {
      onKeysChange(newKeys)
    }
  }

  const getKeyStatus = (providerId: string) => {
    const key = keys[providerId]
    const error = validationErrors[providerId]
    
    if (!key) return 'none'
    if (error) return 'invalid'
    return 'valid'
  }

  const activeKeysCount = Object.keys(keys).filter(id => keys[id] && !validationErrors[id]).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Key className="h-4 w-4" />
          API Keys
          {activeKeysCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeKeysCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage API Keys (BYOK)
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            <p>Bring Your Own Key (BYOK) allows you to use your personal API keys for different AI providers.</p>
            <p className="mt-2">Your keys are stored locally in your browser and never sent to our servers.</p>
          </div>

          <Separator />

          <div className="space-y-4">
            {PROVIDERS.map(provider => {
              const status = getKeyStatus(provider.id)
              const hasKey = !!keys[provider.id]
              
              return (
                <div key={provider.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">{provider.name}</Label>
                        {status === 'valid' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {status === 'invalid' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {provider.description}
                      </p>
                    </div>
                    
                    {hasKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKey(provider.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          placeholder={provider.placeholder}
                          value={keys[provider.id] || ''}
                          onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                          className={cn(
                            validationErrors[provider.id] && 'border-red-500'
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => toggleKeyVisibility(provider.id)}
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {validationErrors[provider.id] && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors[provider.id]}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Active API Keys: {activeKeysCount}</span>
              <span>🔒 Stored locally in your browser</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Utility function to get user's API key for a provider
export function getUserAPIKey(providerId: string): string | null {
  // Check if we're on the client side
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem(`byok_${providerId}`) || null
  } catch (error) {
    console.warn('Failed to access localStorage:', error)
    return null
  }
}

// Utility function to check if user has valid API key for a provider
export function hasUserAPIKey(providerId: string): boolean {
  // Check if we're on the client side
  if (typeof window === 'undefined') return false
  
  const key = getUserAPIKey(providerId)
  if (!key) return false
  
  const provider = PROVIDERS.find(p => p.id === providerId)
  if (!provider?.keyPattern) return !!key
  
  return provider.keyPattern.test(key)
}
