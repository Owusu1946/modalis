'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Check, Mic, Pause, Play, RotateCcw,Square } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog'

interface AudioRecorderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (file: File) => void
}

// Choose the best available MIME type for MediaRecorder and provide an extension
function pickMime(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
    { mimeType: 'audio/mp4', ext: 'm4a' },
    { mimeType: 'audio/webm', ext: 'webm' }
  ]
  for (const c of candidates) {
    if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  // Fallback: let the browser pick, but default to webm
  return { mimeType: '', ext: 'webm' }
}

export const AudioRecorderDialog: React.FC<AudioRecorderDialogProps> = ({ open, onOpenChange, onSave }) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const { mimeType, ext } = useMemo(pickMime, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setElapsed(0)
    chunksRef.current = []
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewUrl])

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null

    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    analyserRef.current = null
    dataArrayRef.current = null

    const tracks = streamRef.current?.getTracks() || []
    tracks.forEach(t => t.stop())
    streamRef.current = null

    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try { rec.stop() } catch {}
    }
    mediaRecorderRef.current = null
  }, [])

  // Draw animated waveform
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current
    if (!canvas || !analyser || !dataArray) return

    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas

    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      analyser.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, width, height)
      // Gradient background for a sleek look
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, 'rgba(99,102,241,0.15)') // indigo-500/15
      gradient.addColorStop(1, 'rgba(99,102,241,0.02)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Draw center line
      ctx.strokeStyle = 'rgba(99,102,241,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()

      // Wave line
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(99,102,241,0.9)'
      ctx.beginPath()
      const sliceWidth = width / dataArray.length
      let x = 0
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0 // 0..255 -> around 1 at silence
        const y = (v * height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.stroke()

      // Glow overlay
      ctx.shadowColor = 'rgba(99,102,241,0.8)'
      ctx.shadowBlur = 12
      ctx.globalCompositeOperation = 'lighter'
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    render()
  }, [])

  const start = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Audio graph
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserRef.current = analyser
      dataArrayRef.current = dataArray
      source.connect(analyser)

      // Canvas size
      const canvas = canvasRef.current
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(560 * dpr)
        canvas.height = Math.floor(140 * dpr)
        canvas.style.width = '560px'
        canvas.style.height = '140px'
      }
      draw()

      // MediaRecorder
      const opts: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const rec = new MediaRecorder(stream, opts)
      mediaRecorderRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      }

      rec.start(250)
      setStatus('recording')
      startTimeRef.current = Date.now()
      setElapsed(0)
      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current != null && status === 'recording') {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }
      }, 250)
    } catch (err: any) {
      setError(err?.message || 'Failed to start recording')
      cleanup()
    }
  }, [cleanup, draw, mimeType, status])

  const pause = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state === 'recording') {
      rec.pause()
      setStatus('paused')
    }
  }, [])

  const resume = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state === 'paused') {
      rec.resume()
      setStatus('recording')
      startTimeRef.current = Date.now() - elapsed * 1000
    }
  }, [elapsed])

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
      setStatus('stopped')
    }
  }, [])

  const save = useCallback(() => {
    if (!chunksRef.current.length) return
    const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
    const filename = `recording-${Date.now()}.${ext}`
    const file = new File([blob], filename, { type: blob.type })
    onSave(file)
    // Close dialog after save
    onOpenChange(false)
    // Reset and cleanup
    reset()
    cleanup()
  }, [cleanup, ext, mimeType, onOpenChange, onSave, reset])

  const retake = useCallback(() => {
    chunksRef.current = []
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setElapsed(0)
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!open) {
      cleanup()
      reset()
    }
  }, [open, cleanup, reset])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record audio</DialogTitle>
          <DialogDescription>Speak and watch the waves respond in real-time.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className={cn('rounded-xl border border-input bg-muted/30 p-4 flex flex-col items-center gap-3')}>
            <canvas ref={canvasRef} className="w-full rounded-md bg-background" />
            <div className="text-sm text-muted-foreground">{mm}:{ss}</div>
            {error && <div className="text-xs text-destructive">{error}</div>}
          </div>

          {previewUrl && (
            <audio controls src={previewUrl} className="w-full" />
          )}

          <div className="flex items-center justify-center gap-2">
            {status === 'idle' && (
              <Button onClick={start} className="rounded-full" size="lg">
                <Mic className="h-4 w-4 mr-2" /> Start
              </Button>
            )}
            {status === 'recording' && (
              <>
                <Button variant="secondary" onClick={pause} className="rounded-full" size="lg">
                  <Pause className="h-4 w-4 mr-2" /> Pause
                </Button>
                <Button variant="destructive" onClick={stop} className="rounded-full" size="lg">
                  <Square className="h-4 w-4 mr-2" /> Stop
                </Button>
              </>
            )}
            {status === 'paused' && (
              <>
                <Button onClick={resume} className="rounded-full" size="lg">
                  <Play className="h-4 w-4 mr-2" /> Resume
                </Button>
                <Button variant="destructive" onClick={stop} className="rounded-full" size="lg">
                  <Square className="h-4 w-4 mr-2" /> Stop
                </Button>
              </>
            )}
            {status === 'stopped' && (
              <>
                <Button onClick={retake} variant="secondary" className="rounded-full" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" /> Retake
                </Button>
                <Button onClick={save} className="rounded-full" size="lg">
                  <Check className="h-4 w-4 mr-2" /> Save
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
