'use client'

import { useCallback, useEffect, useMemo,useState } from 'react'
import Image from 'next/image'

import { Check, ChevronsUpDown, Key,Lightbulb, Wifi, WifiOff } from 'lucide-react'

import { isChromeAIAvailable } from '@/lib/providers/chrome-ai'
import { Model } from '@/lib/types/models'
import { getCookie, setCookie } from '@/lib/utils/cookies'
import { isReasoningModel } from '@/lib/utils/registry'

import { createModelId } from '../lib/utils'

import { hasUserAPIKey } from './ui/api-key-manager'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from './ui/command'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

function groupModelsByProvider(models: Model[]) {
  return models
    .filter(model => model.enabled)
    .reduce(
      (groups, model) => {
        const provider = model.provider
        if (!groups[provider]) {
          groups[provider] = []
        }
        groups[provider].push(model)
        return groups
      },
      {} as Record<string, Model[]>
    )
}

interface ModelSelectorProps {
  models: Model[]
}

export function ModelSelector({ models }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [chromeAIAvailable, setChromeAIAvailable] = useState<boolean | null>(null)
  const [userAPIKeysVersion, setUserAPIKeysVersion] = useState<number>(0)
  const [allModels, setAllModels] = useState<Model[]>(models)
  const [filteredModels, setFilteredModels] = useState<Model[]>(models)
  const [isClient, setIsClient] = useState(false)

  // Minimal BYOK modal state
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [keyModalProvider, setKeyModalProvider] = useState<{ id: string; name: string } | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState('')

  // Detect client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const savedModel = getCookie('selectedModel')
    if (savedModel) {
      try {
        const model = JSON.parse(savedModel) as Model
        setValue(createModelId(model))
      } catch (e) {
        console.error('Failed to parse saved model:', e)
      }
    }
  }, [])

  // Client-side: always try to fetch the full models list to ensure completeness
  useEffect(() => {
    if (!isClient) return
    (async () => {
      try {
        const res = await fetch('/config/models.json', { cache: 'no-store' })
        if (!res.ok) throw new Error(res.statusText)
        const data = await res.json()
        if (Array.isArray(data?.models)) {
          setAllModels(data.models as Model[])
        } else {
          setAllModels(models)
        }
      } catch (e) {
        console.warn('[ModelSelector] fallback fetch failed, using props models', e)
        setAllModels(models)
      }
    })()
  }, [isClient, models])

  // Check Chrome AI availability
  useEffect(() => {
    const checkChromeAI = async () => {
      try {
        const available = await isChromeAIAvailable()
        setChromeAIAvailable(available)
      } catch {
        setChromeAIAvailable(false)
      }
    }
    checkChromeAI()
  }, [])

  // Check if app has default API key for provider (memoized to prevent re-renders)
  const checkAppHasKey = useCallback((providerId: string): boolean => {
    // This would check if the app has configured keys for the provider
    // For now, we'll assume only Google is free/configured by default
    return providerId === 'google' || providerId === 'chrome'
  }, [])

  // Show all enabled models; lock ones without keys at render time
  const filteredModelsList = useMemo(() => {
    return allModels
  }, [allModels])

  // Update filtered models state when the memoized list changes
  useEffect(() => {
    setFilteredModels(filteredModelsList)
  }, [filteredModelsList])

  const handleModelSelect = (id: string) => {
    const newValue = id === value ? '' : id
    setValue(newValue)

    const selectedModel = models.find(
      model => createModelId(model) === newValue
    )
    if (selectedModel) {
      setCookie('selectedModel', JSON.stringify(selectedModel))
    } else {
      setCookie('selectedModel', '')
    }

    setOpen(false)
  }

  const selectedModel = allModels.find(model => createModelId(model) === value)
  const groupedModels = groupModelsByProvider(filteredModels)

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="text-sm rounded-full shadow-none focus:ring-0"
        >
          {selectedModel ? (
            <div className="flex items-center space-x-1">
              <Image
                src={`/providers/logos/${selectedModel.providerId}.svg`}
                alt={selectedModel.provider}
                width={18}
                height={18}
                className="bg-white rounded-full border"
              />
              <span className="text-xs font-medium">{selectedModel.name}</span>
              {isReasoningModel(selectedModel.id) && (
                <Lightbulb size={12} className="text-accent-blue-foreground" />
              )}
            </div>
          ) : (
            'Select model'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 max-h-[70vh] overflow-y-auto" align="start">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList className="max-h-[60vh] overflow-y-auto pr-1">
              <CommandEmpty>No model found.</CommandEmpty>
              {Object.entries(groupedModels).map(([provider, models]) => (
                <CommandGroup key={provider} heading={provider}>
                  {models.map(model => {
                    const modelId = createModelId(model)
                    const isChromeAI = model.providerId === 'chrome'
                    const showStatus = isChromeAI && chromeAIAvailable !== null
                    
                    const hasUserKey = isClient ? hasUserAPIKey(model.providerId) : false
                    const hasAppKey = checkAppHasKey(model.providerId)
                    const requiresKey = !hasAppKey && !model.providerId.match(/^(google|chrome|ollama)$/)
                    const isLocked = requiresKey && !hasUserKey
                    
                    return (
                      <CommandItem
                        key={modelId}
                        value={modelId}
                        onSelect={(val) => {
                          if (isLocked) {
                            // Open minimal BYOK modal
                            setKeyModalProvider({ id: model.providerId, name: model.provider })
                            setKeyInput('')
                            setKeyError('')
                            setKeyModalOpen(true)
                            return
                          }
                          handleModelSelect(val)
                        }}
                        className={`flex justify-between ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center space-x-2">
                          <Image
                            src={`/providers/logos/${model.providerId}.svg`}
                            alt={model.provider}
                            width={18}
                            height={18}
                            className="bg-white rounded-full border"
                          />
                          <span className="text-xs font-medium">
                            {model.name}
                          </span>
                          
                          {/* API Key Status Indicators */}
                          {requiresKey && (
                            hasUserKey ? (
                              <span title="Using your API key">
                                <Key className="h-3 w-3 text-green-500" />
                              </span>
                            ) : (
                              <>
                                <span title="Requires API key">
                                  <Key className="h-3 w-3 text-amber-500" />
                                </span>
                                <Badge className="ml-1" variant="secondary">BYOK</Badge>
                              </>
                            )
                          )}
                          
                          {/* Chrome AI Status */}
                          {showStatus && (
                            chromeAIAvailable ? (
                              <span title="Chrome AI Ready">
                                <Wifi className="h-3 w-3 text-green-500" />
                              </span>
                            ) : (
                              <span title="Chrome AI Setup Required">
                                <WifiOff className="h-3 w-3 text-red-500" />
                              </span>
                            )
                          )}
                        </div>
                        <Check
                          className={`h-4 w-4 ${
                            value === modelId ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
              <div className="sticky bottom-0 w-full text-[10px] text-muted-foreground text-center py-2 bg-background/80 backdrop-blur-sm">
                Scroll to see more providers
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Minimal BYOK Modal */}
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="api-key-input">{keyModalProvider ? `${keyModalProvider.name} API Key` : 'API Key'}</Label>
              <Input
                id="api-key-input"
                placeholder="Paste your API key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
              {keyError && (
                <p className="text-xs text-red-500 mt-1">{keyError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setKeyModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!keyModalProvider) return
                  if (!keyInput.trim()) {
                    setKeyError('API key is required')
                    return
                  }
                  try {
                    // Save to localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(`byok_${keyModalProvider.id}`, keyInput.trim())
                    }
                    // Trigger re-filter
                    setUserAPIKeysVersion(v => v + 1)
                    setKeyModalOpen(false)
                    // Optionally auto-select a model from this provider next time
                  } catch (e) {
                    setKeyError('Failed to save API key')
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
