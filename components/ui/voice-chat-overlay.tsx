'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useVoice, VoiceProvider, VoiceReadyState } from '@humeai/voice-react'
import { Mic, Settings, X } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from './button'
import { Dialog, DialogContent } from './dialog'

type VoiceChatMessage = { id: string; role: 'user' | 'assistant'; text: string }
interface VoiceChatOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  onMicClick?: () => void
  status?: 'idle' | 'connecting' | 'listening' | 'speaking'
  messages?: VoiceChatMessage[]
  onTranscript?: (messages: VoiceChatMessage[]) => void
}

export const VoiceChatOverlay: React.FC<VoiceChatOverlayProps> = ({
  open,
  onOpenChange,
  onClose,
  onMicClick,
  status = 'idle',
  messages = [],
  onTranscript
}) => {
  // Wrap overlay content in VoiceProvider so we can use Hume's useVoice()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label="Voice chat"
        hideClose
        className={cn(
          'w-screen h-screen max-w-none p-0 border-0 rounded-none bg-background'
        )}
      >
        <VoiceProvider
          onMessage={(msg: any) => {
            try {
              const type = (msg && (msg.type || msg.event || msg.kind)) || typeof msg
              // eslint-disable-next-line no-console
              console.log('[VoiceOverlay] provider:onMessage', { type, msg })
            } catch (e) {
              console.log('[VoiceOverlay] provider:onMessage(raw)')
            }
          }}
          onError={(err: any) => {
            console.error('[VoiceOverlay] provider:onError', err)
          }}
        >
          <SessionUI
            onClose={onClose}
            externalStatus={status}
            externalMessages={messages}
            onTranscript={onTranscript}
          />
        </VoiceProvider>
      </DialogContent>
    </Dialog>
  )
}

function SessionUI({
  onClose,
  externalStatus,
  externalMessages,
  onTranscript
}: {
  onClose: () => void
  externalStatus: 'idle' | 'connecting' | 'listening' | 'speaking'
  externalMessages: VoiceChatMessage[]
  onTranscript?: (messages: VoiceChatMessage[]) => void
}) {
  const { connect, disconnect, messages: voiceMessages, status: voiceStatus, readyState, error }: any = useVoice() as any
  const [uiStatus, setUiStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>(externalStatus)
  const transcriptRef = useRef<VoiceChatMessage[]>([...externalMessages])
  const [debug, setDebug] = useState<string>('')

  // Log hook state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[VoiceOverlay] useVoice state', { 
      voiceStatus: voiceStatus?.value || voiceStatus, 
      readyState: readyState?.value || readyState, 
      error 
    })
  }, [voiceStatus, readyState, error])

  // Derive status heuristically from incoming messages
  useEffect(() => {
    if (!voiceMessages) return
    // Map incoming SDK messages into our simplified transcript on the fly
    const mapped: VoiceChatMessage[] = []
    for (const m of (voiceMessages as any[]) || []) {
      if (m?.type === 'assistant_text' && m?.text) {
        mapped.push({ id: `a-${m?.id || Date.now()}`, role: 'assistant', text: m.text })
      } else if (m?.type === 'user_text' && m?.text) {
        mapped.push({ id: `u-${m?.id || Date.now()}`, role: 'user', text: m.text })
      }
    }
    if (mapped.length > 0) {
      transcriptRef.current = [...transcriptRef.current, ...mapped]
      // eslint-disable-next-line no-console
      console.log('[VoiceOverlay] transcript:update', transcriptRef.current)
      
      // Stream new messages to main chat panel immediately
      if (onTranscript) {
        onTranscript(mapped)
      }
    }
    if ((voiceMessages as any[]).some(v => v?.type === 'assistant_text')) setUiStatus('speaking')
    else setUiStatus('listening')
  }, [voiceMessages])

  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID

  const toggleMic = useCallback(async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('[VoiceOverlay] mic:toggle start', { 
        readyState: readyState?.value || readyState, 
        configId 
      })
      
      // If already connected, disconnect instead
      if (readyState === VoiceReadyState.OPEN || (readyState?.value === 'open')) {
        // eslint-disable-next-line no-console
        console.log('[VoiceOverlay] disconnecting...')
        await (disconnect as any)()
        setUiStatus('idle')
        return
      }
      
      setUiStatus('connecting')
      const res = await fetch('/api/hume/token')
      // eslint-disable-next-line no-console
      console.log('[VoiceOverlay] token:response status', res.status)
      const { access_token } = await res.json()
      // eslint-disable-next-line no-console
      console.log('[VoiceOverlay] token:received', access_token ? `${access_token.slice(0, 6)}…` : 'missing')
      
      if (!access_token) {
        throw new Error('No access token received')
      }
      
      console.log('[VoiceOverlay] connecting with config', { configId })
      await (connect as any)({ 
        auth: { type: 'accessToken', value: access_token },
        configId 
      })
      // eslint-disable-next-line no-console
      console.log('[VoiceOverlay] connect:called')
      setUiStatus('listening')
    } catch (e) {
      console.error('[VoiceOverlay] connect:error', e)
      // On failure, try to disconnect in case there is an open session
      try { await (disconnect as any)() } catch {}
      setUiStatus('idle')
    }
  }, [connect, disconnect, configId, readyState])

  const handleClose = useCallback(() => {
    try { (disconnect as any)() } catch {}
    if (onTranscript) onTranscript(transcriptRef.current || [])
    onClose()
  }, [disconnect, onClose, onTranscript])

  const statusMeta = useMemo(() => {
    switch (uiStatus) {
      case 'connecting':
        return { label: 'Connecting…', dot: 'bg-amber-500 animate-pulse' }
      case 'listening':
        return { label: 'Listening…', dot: 'bg-emerald-500' }
      case 'speaking':
        return { label: 'Speaking…', dot: 'bg-sky-500' }
      default:
        return { label: 'Ready', dot: 'bg-muted-foreground' }
    }
  }, [uiStatus])

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-sm rounded-full border bg-background/70 px-3 py-1.5 shadow-sm">
        <span className={cn('inline-block size-2 rounded-full', statusMeta.dot)} />
        <span className="text-muted-foreground">Voice chat</span>
        <span className="text-foreground">{statusMeta.label}</span>
      </div>
      
      <div className="absolute top-4 right-4">
        <button
          type="button"
          className="rounded-full size-9 inline-flex items-center justify-center border bg-background/70 hover:bg-muted text-foreground shadow"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Center bubble */}
      <div className="relative">
        {(uiStatus === 'listening' || uiStatus === 'speaking') && (
          <div className="absolute inset-0 -m-6 rounded-full bg-indigo-300/30 animate-ping" />
        )}
        <div className="size-56 sm:size-64 rounded-full bg-gradient-to-br from-indigo-300/70 via-sky-200 to-indigo-400/60 shadow-2xl" />
      </div>

      {/* Live transcript panel
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl">
        <div className="h-40 sm:h-48 rounded-2xl border bg-background/70 backdrop-blur supports-backdrop-blur:bg-background/50 overflow-y-auto p-3 space-y-2 shadow">
          {transcriptRef.current.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Say something to start…
            </div>
          ) : (
            transcriptRef.current.map((msg, idx) => (
              <div
                key={`${msg.id}-${idx}`}
                className={cn(
                  'max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm',
                  msg.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted'
                )}
              >
                {msg.text}
              </div>
            ))
          )}
        </div>
      </div> */}

      {/* Bottom controls */}
      <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6">
            <Button
          type="button"
          size="icon"
          className={cn('rounded-full size-12 shadow-md', uiStatus === 'listening' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '')}
          onClick={toggleMic}
          title="Toggle microphone"
        >
          <Mic className="h-6 w-6" />
        </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="rounded-full size-12 shadow-md"
              onClick={handleClose}
              title="Close"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
  )
}
