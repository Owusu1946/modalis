import { useEffect, useRef, useState } from 'react'

// Lightweight client without SDK dependency to keep things simple.
// If you add @humeai/voice SDK, you can replace this WebSocket logic with their client.

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking'
export type VoiceMsg = { id: string; role: 'user' | 'assistant'; text: string }

export function useHumeEVI(open: boolean) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [messages, setMessages] = useState<VoiceMsg[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!open) return

    let closed = false
    async function start() {
      try {
        setStatus('connecting')

        // 1) Short-lived token
        const tokenRes = await fetch('/api/hume/token')
        if (!tokenRes.ok) throw new Error('Failed to get token')
        const { access_token } = await tokenRes.json()

        // 2) Mic
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        // 3) Connect WS (public EVI endpoint)
        const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID
        const url = `wss://api.hume.ai/v0/evi/chat?config_id=${encodeURIComponent(configId || '')}&access_token=${encodeURIComponent(access_token)}`
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.addEventListener('open', () => {
          setStatus('listening')
          // Tell server we will stream audio (op code depends on Hume protocol)
          ws.send(JSON.stringify({ type: 'start', format: 'webm/opus' }))
          // Start sending audio chunks via MediaRecorder
          const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
          rec.ondataavailable = ev => {
            if (ev.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ev.data.arrayBuffer().then(buf => {
                ws.send(buf)
              })
            }
          }
          rec.start(250)
          ;(ws as any)._rec = rec
        })

        ws.addEventListener('message', async ev => {
          // NOTE: This handler depends on Hume message schema. Here we sketch common events.
          const contentType = (ev as any).data?.type ? 'json' : typeof ev.data === 'string' ? 'text' : 'binary'
          if (contentType === 'text') {
            // Some servers send JSON as text as well
            try {
              const msg = JSON.parse(ev.data as string)
              handleServerMessage(msg)
            } catch {
              // ignore
            }
          } else if (contentType === 'json') {
            handleServerMessage((ev as any).data)
          } else {
            // Binary likely audio chunk (e.g., Opus/PCM). Naively play via blob URL if supported.
            const blob = new Blob([ev.data], { type: 'audio/webm' })
            if (!audioRef.current) audioRef.current = new Audio()
            const url = URL.createObjectURL(blob)
            audioRef.current.src = url
            audioRef.current.play().catch(() => {})
          }
        })

        ws.addEventListener('close', () => {
          setStatus('idle')
        })

        function handleServerMessage(msg: any) {
          // Example schema mapping; adapt to Hume EVI events
          if (msg.type === 'assistant_text') {
            setStatus('speaking')
            setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: msg.text }])
          } else if (msg.type === 'user_text') {
            setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text: msg.text }])
          } else if (msg.type === 'status' && msg.status) {
            setStatus(msg.status)
          }
        }
      } catch (e) {
        setStatus('idle')
      }
    }

    start()

    return () => {
      if (closed) return
      closed = true
      try { if (wsRef.current && (wsRef.current as any)._rec) (wsRef.current as any)._rec.stop() } catch {}
      try { wsRef.current?.close() } catch {}
      wsRef.current = null
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
      streamRef.current = null
      try { audioRef.current?.pause() } catch {}
    }
  }, [open])

  return { status, messages }
}
