'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'
import { useRouter } from 'next/navigation'

import { Message } from 'ai'
import {
  ArrowUp,
  ChevronDown,
  Loader2,
  MessageCirclePlus,
  Mic,
  Square,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { Model } from '@/lib/types/models'
import { cn } from '@/lib/utils'

import { useArtifact } from './artifact/artifact-context'
import { Button } from './ui/button'
import { AnimatedIconLogo } from './ui/icons'
import { VoiceChatOverlay } from './ui/voice-chat-overlay'
import { VoiceInputBar } from './ui/voice-input-bar'
import { EmptyScreen } from './empty-screen'
import { IntroBubbles } from './intro-bubbles'
import { MediaActions } from './media-actions'
import { ModelSelector } from './model-selector'
import { SearchModeToggle } from './search-mode-toggle'

interface ChatPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  messages: Message[]
  setMessages: (messages: Message[]) => void
  query?: string
  stop: () => void
  append: (message: any) => void
  models?: Model[]
  /** Whether to show the scroll to bottom button */
  showScrollToBottomButton: boolean
  /** Reference to the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement>
}

export function ChatPanel({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  messages,
  setMessages,
  query,
  stop,
  append,
  models,
  showScrollToBottomButton,
  scrollContainerRef
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false) // Composition state
  const [enterDisabled, setEnterDisabled] = useState(false) // Disable Enter after composition ends
  const { close: closeArtifact } = useArtifact()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false)
  const preVoiceInputRef = useRef<string>('')
  type SelectedImage = {
    id: string
    url: string // local object URL for preview
    name: string
    size: number
    type: string
    file: File
    status: 'uploading' | 'done' | 'error'
    remoteUrl?: string // signed URL after upload
  }
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  // We trigger uploads immediately in the event handlers

  const CLOUDINARY_CLOUD_NAME = useMemo(
    () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    []
  )
  const CLOUDINARY_UPLOAD_PRESET = useMemo(
    () => process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'chat-uploads',
    []
  )

  // Simple type guard for supported files
  const isSupportedFile = (file: File) => {
    const t = file.type || ''
    return (
      t.startsWith('image/') ||
      t.startsWith('video/') ||
      t.startsWith('audio/') ||
      t === 'application/pdf' ||
      t === 'text/plain' ||
      t === 'text/csv' ||
      t === 'application/json' ||
      t.includes('word') || // doc, docx
      t.includes('excel') || // xls, xlsx
      t === 'application/zip'
    )
  }

  const isUploading = selectedImages.some(img => img.status === 'uploading')
  useEffect(() => {
    // Log environment detection once on mount
    console.log('[ChatPanel] Cloudinary env', {
      cloudName: CLOUDINARY_CLOUD_NAME ? '***' : 'missing',
      uploadPreset: CLOUDINARY_UPLOAD_PRESET
    })
  }, [CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET])

  const uploadOne = useCallback(async (img: SelectedImage) => {
    try {
      if (!CLOUDINARY_CLOUD_NAME) {
        throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set')
      }

      console.log('[ChatPanel] upload:start', { 
        id: img.id, 
        name: img.name, 
        size: img.size, 
        type: img.type, 
        cloudName: CLOUDINARY_CLOUD_NAME 
      })

      // Mark uploading
      setSelectedImages(prev => prev.map((it) => (it.id === img.id ? { ...it, status: 'uploading' } : it)))

      // Create FormData for Cloudinary upload
      const formData = new FormData()
      formData.append('file', img.file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      formData.append('folder', 'chat-uploads') // Optional: organize in folders

      // Choose resource type based on MIME
      const rt = img.type.startsWith('image/')
        ? 'image'
        : (img.type.startsWith('video/') || img.type.startsWith('audio/'))
          ? 'video'
          : 'raw'

      // Upload to Cloudinary with timeout
      const uploadPromise = fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${rt}/upload`, {
        method: 'POST',
        body: formData
      })

      const response = await Promise.race([
        uploadPromise,
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout')), 30000)
        )
      ])

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('[ChatPanel] upload:done', { id: img.id, url: result.secure_url })

      setSelectedImages(prev => prev.map((it) => (it.id === img.id ? { 
        ...it, 
        status: 'done', 
        remoteUrl: result.secure_url 
      } : it)))
    } catch (err) {
      console.error('[ChatPanel] upload:error', err)
      setSelectedImages(prev => prev.map((it) => (it.id === img.id ? { ...it, status: 'error' } : it)))
      toast.error('Image upload failed. You can remove it or try again.')
    }
  }, [CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET])

  // Uploads are kicked off directly when images are selected/dropped/pasted

  const ensureUploads = async () => {
    // Retry only images that are in error state; uploading ones are already in-flight
    const toStart = selectedImages.filter(img => img.status === 'error')
    console.log('[ChatPanel] ensureUploads', { toStart: toStart.length })
    await Promise.all(toStart.map(img => uploadOne(img)))
  }

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => {
      setEnterDisabled(false)
    }, 300)
  }

  const handleNewChat = () => {
    setMessages([])
    closeArtifact()
    router.push('/')
    clearAllSelectedImages()
  }

  const isToolInvocationInProgress = () => {
    if (!messages.length) return false

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant' || !lastMessage.parts) return false

    const parts = lastMessage.parts
    const lastPart = parts[parts.length - 1]

    return (
      lastPart?.type === 'tool-invocation' &&
      lastPart?.toolInvocation?.state === 'call'
    )
  }

  // if query is not empty, submit the query
  useEffect(() => {
    if (isFirstRender.current && query && query.trim().length > 0) {
      append({
        role: 'user',
        content: query
      })
      isFirstRender.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Scroll to the bottom of the container
  const handleScrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // UI-only handlers for new controls
  const handleSelectImage = () => {
    if (isLoading || isToolInvocationInProgress()) return
    imageInputRef.current?.click()
  }

  const handleSelectPdf = () => {
    if (isLoading || isToolInvocationInProgress()) return
    pdfInputRef.current?.click()
  }

  const handleImageChosen: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('[ChatPanel] images:selected', { count: files.length })
      const now = Date.now()
      const newItems: SelectedImage[] = Array.from(files).map((file, idx) => ({
        id: `${now}-${idx}-${Math.random().toString(36).slice(2,8)}`,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'uploading'
      }))
      setSelectedImages(prev => [...prev, ...newItems])
      toast.info(`Selected ${files.length} image${files.length > 1 ? 's' : ''}`)
      // Focus the textarea for caption typing
      requestAnimationFrame(() => inputRef.current?.focus())
      // Kick off uploads
      console.log('[ChatPanel] uploads:trigger', { count: newItems.length, ids: newItems.map(i => i.id) })
      try {
        const promises = newItems.map(it => {
          console.log('[ChatPanel] upload:invoke', { id: it.id, name: it.name })
          return uploadOne(it)
        })
        await Promise.all(promises)
      } catch (batchErr) {
        console.error('[ChatPanel] uploads:batch-error', batchErr)
      }
    }
    // Allow selecting the same files again
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // Handle drag & drop of images
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = e => {
    if (isLoading || isToolInvocationInProgress()) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDragEnter: React.DragEventHandler<HTMLDivElement> = e => {
    if (isLoading || isToolInvocationInProgress()) return
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = e => {
    e.preventDefault()
    // Only reset when leaving the container (not when entering children)
    if (e.currentTarget === e.target) setIsDragging(false)
  }

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async e => {
    if (isLoading || isToolInvocationInProgress()) return
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    const supported = files.filter(isSupportedFile)
    if (supported.length === 0) return
    const now = Date.now()
    const newItems: SelectedImage[] = supported.map((file, idx) => ({
      id: `${now}-${idx}-${Math.random().toString(36).slice(2,8)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      status: 'uploading'
    }))
    setSelectedImages(prev => [...prev, ...newItems])
    toast.info(`Added ${supported.length} file${supported.length > 1 ? 's' : ''}`)
    console.log('[ChatPanel] images:dropped', { count: supported.length })
    console.log('[ChatPanel] uploads:trigger', { count: newItems.length, ids: newItems.map(i => i.id) })
    try {
      const promises = newItems.map(it => {
        console.log('[ChatPanel] upload:invoke', { id: it.id, name: it.name })
        return uploadOne(it)
      })
      await Promise.all(promises)
    } catch (batchErr) {
      console.error('[ChatPanel] uploads:batch-error', batchErr)
    }
  }

  const handlePdfChosen: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const files = Array.from(e.target.files || [])
    const supported = files.filter(isSupportedFile)
    if (supported.length > 0) {
      const now = Date.now()
      const newItems: SelectedImage[] = supported.map((file, idx) => ({
        id: `${now}-${idx}-${Math.random().toString(36).slice(2,8)}`,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'uploading'
      }))
      setSelectedImages(prev => [...prev, ...newItems])
      toast.info(`Selected ${supported.length} file${supported.length > 1 ? 's' : ''}`)
      console.log('[ChatPanel] uploads:trigger', { count: newItems.length, ids: newItems.map(i => i.id) })
      try {
        const promises = newItems.map(it => {
          console.log('[ChatPanel] upload:invoke', { id: it.id, name: it.name })
          return uploadOne(it)
        })
        await Promise.all(promises)
      } catch (batchErr) {
        console.error('[ChatPanel] uploads:batch-error', batchErr)
      }
    }
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  const handleRecordAudio = () => {
    if (isLoading || isToolInvocationInProgress()) return
    // Save current typed content to merge with transcript
    preVoiceInputRef.current = inputRef.current?.value ?? ''
    setVoiceActive(true)
  }

  // Streaming voice transcription handlers
  const handleVoiceText = (text: string) => {
    // Update the input value live
    const base = preVoiceInputRef.current
    const merged = (base ? base + ' ' : '') + text
    handleInputChange({ target: { value: merged } } as any)
    setShowEmptyScreen(text.length === 0)
  }

  const handleVoiceCancel = () => {
    setVoiceActive(false)
    // Restore the text that existed before starting voice input
    const base = preVoiceInputRef.current
    handleInputChange({ target: { value: base } } as any)
    setShowEmptyScreen(base.length === 0)
  }

  const handleVoiceConfirm = () => {
    setVoiceActive(false)
    // Auto submit if there's content
    const text = inputRef.current?.value || ''
    if (text.trim().length > 0) {
      inputRef.current?.form?.requestSubmit()
    }
  }

  // Voice chat placeholder (button only for now)
  const handleVoiceChat = () => {
    if (isLoading || isToolInvocationInProgress()) return
    setVoiceOverlayOpen(true)
  }

  // Remove demo loop; handled by Hume hook

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      for (const img of selectedImages) {
        URL.revokeObjectURL(img.url)
      }
    }
  }, [selectedImages])

  const removeImageAt = (index: number) => {
    setSelectedImages(prev => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return copy
    })
  }

  const clearAllSelectedImages = () => {
    for (const img of selectedImages) URL.revokeObjectURL(img.url)
    setSelectedImages([])
  }

  // Prefill input from animated intro choices
  const handleIntroSelect = (action: 'search' | 'summarize' | 'chat') => {
    const preset =
      action === 'search'
        ? 'Search: '
        : action === 'summarize'
          ? 'Summarize: '
          : ''

    handleInputChange({
      target: { value: preset }
    } as React.ChangeEvent<HTMLTextAreaElement>)

    // Focus the input for immediate typing
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full bg-background group/form-container shrink-0',
        messages.length > 0
          ? 'sticky bottom-0 px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]'
          : 'px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+56px)] pb-[calc(env(safe-area-inset-bottom)+2rem)]'
      )}
    >
      {messages.length === 0 && (
        <div className="mb-10 flex flex-col items-center gap-8">
          <IntroBubbles onSelect={handleIntroSelect} />
          <AnimatedIconLogo className="size-12 text-muted-foreground" containerRef={containerRef} />
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (selectedImages.length > 0) {
            try {
              // Ensure all uploads complete
              await ensureUploads()
              const attachments = selectedImages
                .filter(img => img.status === 'done' && img.remoteUrl)
                .map(img => ({ contentType: img.type, url: img.remoteUrl as string }))

              if (attachments.length === 0) {
                toast.error('No images are ready to send. Please try again.')
                return
              }

              append({
                role: 'user',
                content: input,
                experimental_attachments: attachments as any
              })

              handleInputChange({ target: { value: '' } } as any)
              clearAllSelectedImages()
            } catch (err) {
              console.error('Failed to attach images:', err)
              toast.error('Failed to attach images')
            }
          } else {
            handleSubmit(e)
          }
        }}
        className={cn('max-w-3xl w-full mx-auto relative')}
      >
        {/* Scroll to bottom button - only shown when showScrollToBottomButton is true */}
        {showScrollToBottomButton && messages.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -top-10 right-4 z-20 size-8 rounded-full shadow-md"
            onClick={handleScrollToBottom}
            title="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </Button>
        )}

        <div
          className={cn(
            'relative flex flex-col w-full gap-2 bg-muted rounded-3xl border border-input overflow-hidden',
            isDragging && 'ring-2 ring-primary/40'
          )}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedImages.length > 0 && (
            <div className="flex flex-col gap-2 p-3 border-b border-input bg-background/60">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {selectedImages.map((img, i) => (
                  <div key={`${img.url}-${i}`} className="group relative h-20 w-full overflow-hidden rounded-lg ring-1 ring-border">
                    {img.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-muted/30 text-xs p-2 text-center">
                        <div className="truncate max-w-full">{img.name}</div>
                      </div>
                    )}
                    {(img.status === 'uploading') && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      className="absolute top-1 right-1 inline-flex items-center justify-center h-6 w-6 rounded-full bg-background/80 text-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">Add a caption below</div>
                <Button type="button" variant="ghost" size="sm" onClick={clearAllSelectedImages}>
                  Clear all
                </Button>
              </div>
            </div>
          )}
          {voiceActive && (
            <div className="p-3 border-b border-input bg-background/60">
              <VoiceInputBar
                onText={handleVoiceText}
                onCancel={handleVoiceCancel}
                onConfirm={handleVoiceConfirm}
              />
            </div>
          )}
          <Textarea
            ref={inputRef}
            name="input"
            rows={2}
            maxRows={5}
            tabIndex={0}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={selectedImages.length > 0 ? 'Add a caption…' : 'Ask a question...'}
            spellCheck={false}
            value={input}
            disabled={isLoading || isUploading || isToolInvocationInProgress()}
            className="resize-none w-full max-w-full min-w-0 min-h-12 max-h-[40dvh] overflow-y-auto bg-transparent border-0 p-4 text-base sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 break-words whitespace-pre-wrap leading-relaxed"
            onChange={e => {
              handleInputChange(e)
              setShowEmptyScreen(e.target.value.length === 0)
            }}
            onKeyDown={e => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !isComposing &&
                !enterDisabled
              ) {
                if (input.trim().length === 0 && selectedImages.length === 0) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                const textarea = e.target as HTMLTextAreaElement
                textarea.form?.requestSubmit()
              }
            }}
            onPaste={async e => {
              if (isLoading || isToolInvocationInProgress()) return
              const items = e.clipboardData?.items
              if (!items) return
              const images: File[] = []
              for (const item of Array.from(items)) {
                if (item.kind === 'file') {
                  const file = item.getAsFile()
                  if (file && file.type.startsWith('image/')) {
                    images.push(file)
                  }
                }
              }
              if (images.length > 0) {
                console.log('[ChatPanel] images:pasted', { count: images.length })
                const now = Date.now()
                const newItems: SelectedImage[] = images.map((file, idx) => ({
                  id: `${now}-${idx}-${Math.random().toString(36).slice(2,8)}`,
                  url: URL.createObjectURL(file),
                  name: file.name || 'pasted-image',
                  size: file.size,
                  type: file.type,
                  file,
                  status: 'uploading'
                }))
                setSelectedImages(prev => [...prev, ...newItems])
                console.log('[ChatPanel] uploads:trigger', { count: newItems.length, ids: newItems.map(i => i.id) })
                try {
                  const promises = newItems.map(it => {
                    console.log('[ChatPanel] upload:invoke', { id: it.id, name: it.name })
                    return uploadOne(it)
                  })
                  await Promise.all(promises)
                } catch (batchErr) {
                  console.error('[ChatPanel] uploads:batch-error', batchErr)
                }
                toast.info(`Pasted ${images.length} image${images.length > 1 ? 's' : ''}`)
              }
            }}
            onFocus={() => setShowEmptyScreen(true)}
            onBlur={() => setShowEmptyScreen(false)}
          />

          {/* Bottom menu area */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Compact media actions dropdown */}
              <MediaActions
                onSelectImage={handleSelectImage}
                onRecordAudio={handleRecordAudio}
                onSelectPdf={handleSelectPdf}
                disabled={isLoading || isToolInvocationInProgress()}
              />
              <ModelSelector models={models || []} />
              <SearchModeToggle />
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNewChat}
                  className="shrink-0 rounded-full group"
                  type="button"
                  disabled={isLoading || isToolInvocationInProgress()}
                >
                  <MessageCirclePlus className="size-4 group-hover:rotate-12 transition-all" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handleVoiceChat}
                title="Voice chat"
                disabled={isToolInvocationInProgress()}
              >
                <Mic size={18} />
              </Button>
              <Button
                type={isLoading ? 'button' : 'submit'}
                size={'icon'}
                variant={'outline'}
                className={cn(isLoading && 'animate-pulse', 'rounded-full')}
                disabled={
                  ((input.length === 0 && selectedImages.length === 0 && !isLoading) ||
                  isUploading ||
                  isToolInvocationInProgress())
                }
                onClick={isLoading ? stop : undefined}
              >
                {isLoading ? <Square size={20} /> : <ArrowUp size={20} />}
              </Button>
              {isUploading && (
                <div className="flex items-center gap-2">
                  {selectedImages.map((img, i) => (
                    <div key={`${img.url}-${i}`} className="flex items-center gap-1">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-xs text-muted-foreground">{img.name}</span>
                    </div>
                  ))}
                </div>
              )}
          
  </div>
          </div>
        </div>

        {/* Hidden inputs for file selection (UI-only) */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageChosen}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/json,application/zip"
          multiple
          className="hidden"
          onChange={handlePdfChosen}
        />

        {messages.length === 0 && (
          <EmptyScreen
            submitMessage={message => {
              handleInputChange({
                target: { value: message }
              } as React.ChangeEvent<HTMLTextAreaElement>)
            }}
            className={cn(showEmptyScreen ? 'visible' : 'invisible')}
          />
        )}
      </form>
      <VoiceChatOverlay
        open={voiceOverlayOpen}
        onOpenChange={setVoiceOverlayOpen}
        onClose={() => setVoiceOverlayOpen(false)}
        onMicClick={() => {}}
        onTranscript={(msgs) => {
          if (!msgs || msgs.length === 0) return
          console.log('[ChatPanel] streaming voice transcript', msgs)
          const appended = msgs.map((m, idx) => ({
            id: `voice-${Date.now()}-${idx}`,
            role: m.role,
            content: m.text
          }))
          setMessages([...messages, ...appended])
        }}
      />
    </div>
  )
}
