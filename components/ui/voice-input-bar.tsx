'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Check, Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'

// Minimal TS declarations for Web Speech API in Chrome
declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}

interface VoiceInputBarProps {
  onText: (text: string) => void
  onCancel: () => void
  onConfirm: () => void
  className?: string
}

export const VoiceInputBar: React.FC<VoiceInputBarProps> = ({ onText, onCancel, onConfirm, className }) => {
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(true)
  const finalRef = useRef('')
  const interimRef = useRef('')

  // Mic visualization
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef = useRef<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const startVis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyserRef.current = analyser
      dataRef.current = new Uint8Array(analyser.frequencyBinCount)
      source.connect(analyser)

      const canvas = canvasRef.current
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const heightCss = 36
        canvas.width = Math.floor(600 * dpr)
        canvas.height = Math.floor(heightCss * dpr)
        canvas.style.width = '100%'
        canvas.style.height = `${heightCss}px`
      }

      const render = () => {
        rafRef.current = requestAnimationFrame(render)
        const analyser = analyserRef.current
        const data = dataRef.current
        const canvas = canvasRef.current
        if (!analyser || !data || !canvas) return
        const ctx = canvas.getContext('2d')!
        const { width, height } = canvas
        analyser.getByteTimeDomainData(data)

        ctx.clearRect(0, 0, width, height)
        // baseline dots
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.moveTo(0, height / 2)
        ctx.lineTo(width, height / 2)
        ctx.stroke()
        ctx.setLineDash([])

        // waveform
        ctx.strokeStyle = 'rgba(0,0,0,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        const sliceWidth = width / data.length
        let x = 0
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0
          const y = (v * height) / 2
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += sliceWidth
        }
        ctx.stroke()
      }
      render()
    } catch (err: any) {
      setError(err?.message || 'Microphone permission denied')
    }
  }, [])

  const stopVis = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const tracks = streamRef.current?.getTracks() || []
    tracks.forEach(t => t.stop())
    streamRef.current = null
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
  }, [])

  // SpeechRecognition
  const startSR = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not supported in this browser.')
      return
    }
    const rec = new SR()
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = true
    rec.continuous = true

    rec.onresult = (event: any) => {
      let interim = ''
      let final = finalRef.current
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i]
        if (res.isFinal) final += res[0].transcript
        else interim += res[0].transcript
      }
      finalRef.current = final
      interimRef.current = interim
      onText((final + ' ' + interim).trim())
    }
    rec.onerror = (e: any) => {
      setError(e?.error || 'Speech recognition error')
    }
    rec.onend = () => {
      // Keep active state until user confirms/cancels, but stop visualization
      setActive(false)
      stopVis()
    }

    try {
      rec.start()
    } catch (e) {
      // ignore start errors when already started
    }

    return () => {
      try { rec.stop() } catch {}
    }
  }, [onText, stopVis])

  useEffect(() => {
    startVis()
    const stopSR = startSR()
    return () => {
      stopSR && stopSR()
      stopVis()
    }
  }, [startSR, startVis, stopVis])

  const handleCancel = () => {
    onCancel()
  }
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-3xl border border-input bg-background px-3 py-2', className)}>
      <div className="shrink-0 rounded-full bg-muted size-8 flex items-center justify-center">
        <Plus className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <canvas ref={canvasRef} className="w-full" />
        {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
      </div>
      <button type="button" onClick={handleCancel} className="text-sm text-muted-foreground hover:text-foreground">
        <X className="h-5 w-5" />
      </button>
      <button type="button" onClick={handleConfirm} className="text-sm text-muted-foreground hover:text-foreground">
        <Check className="h-5 w-5" />
      </button>
    </div>
  )
}
