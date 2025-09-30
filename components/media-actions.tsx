'use client'

import { useEffect, useState } from 'react'

import { FileText, Globe, Image as ImageIcon, Mic, MoreHorizontal, Check } from 'lucide-react'

import { getCookie, setCookie } from '@/lib/utils/cookies'

import { Button } from './ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface MediaActionsProps {
  onSelectImage: () => void
  onRecordAudio: () => void
  onSelectPdf: () => void
  disabled?: boolean
}

export function MediaActions({
  onSelectImage,
  onRecordAudio,
  onSelectPdf,
  disabled
}: MediaActionsProps) {
  const [open, setOpen] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(true)

  // Mirror the same persisted state as SearchModeToggle
  useEffect(() => {
    const saved = getCookie('search-mode')
    if (saved !== null) {
      setIsSearchMode(saved === 'true')
    } else {
      setCookie('search-mode', 'true')
      setIsSearchMode(true)
    }
  }, [])

  const handle = (fn: () => void) => () => {
    if (disabled) return
    fn()
    setOpen(false)
  }

  const handleToggleSearch = () => {
    const next = !isSearchMode
    setIsSearchMode(next)
    setCookie('search-mode', next.toString())
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          title="Media actions"
          disabled={disabled}
          aria-label="Open media actions"
        >
          <MoreHorizontal size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem onSelect={handleToggleSearch} className="gap-2">
                <Globe className="h-4 w-4" />
                <span>{isSearchMode ? 'Disable search' : 'Enable search'}</span>
                {isSearchMode && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              <CommandItem onSelect={handle(onSelectImage)} className="gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Upload image</span>
              </CommandItem>
              <CommandItem onSelect={handle(onRecordAudio)} className="gap-2">
                <Mic className="h-4 w-4" />
                <span>Voice input</span>
              </CommandItem>
              <CommandItem onSelect={handle(onSelectPdf)} className="gap-2">
                <FileText className="h-4 w-4" />
                <span>Upload files</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default MediaActions
