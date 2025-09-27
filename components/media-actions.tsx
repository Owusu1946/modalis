'use client'

import { useState } from 'react'

import { FileText, Image as ImageIcon, Mic, MoreHorizontal } from 'lucide-react'

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

  const handle = (fn: () => void) => () => {
    if (disabled) return
    fn()
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
