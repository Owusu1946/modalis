"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

interface IntroBubblesProps {
  onSelect?: (action: "search" | "summarize" | "chat") => void
}

const script = [
  { text: "Hey, I'm Modalis.", typingMs: 600, displayMs: 1200 },
  { text: "What do you want to do?", typingMs: 500, displayMs: 1400 },
  { text: "I can search, summarize, or chat.", typingMs: 500, displayMs: 1600 }
]

export function IntroBubbles({ onSelect }: IntroBubblesProps) {
  const [visible, setVisible] = useState(false)
  const [typing, setTyping] = useState(true)
  const [currentText, setCurrentText] = useState("")
  const [showChoices, setShowChoices] = useState(false)

  useEffect(() => {
    const timers: number[] = []

    const run = (i: number) => {
      setTyping(true)
      setCurrentText("")
      setVisible(true)

      timers.push(
        window.setTimeout(() => {
          setTyping(false)
          setCurrentText(script[i].text)

          timers.push(
            window.setTimeout(() => {
              setVisible(false)
              timers.push(
                window.setTimeout(() => {
                  if (i + 1 < script.length) {
                    run(i + 1)
                  } else {
                    setShowChoices(true)
                  }
                }, 220)
              )
            }, script[i].displayMs)
          )
        }, script[i].typingMs)
      )
    }

    run(0)

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          "relative inline-block transition-all duration-300",
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
        aria-live="polite"
      >
        <div className="bg-white border border-gray-200 rounded-[16px] px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          {typing ? (
            <div className="flex items-center justify-center gap-1 h-4" aria-label="Typing">
              <span className="inline-block w-1 h-1 rounded-full bg-gray-300" style={{ animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: '0ms' }} />
              <span className="inline-block w-1 h-1 rounded-full bg-gray-300" style={{ animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: '140ms' }} />
              <span className="inline-block w-1 h-1 rounded-full bg-gray-300" style={{ animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: '280ms' }} />
            </div>
          ) : (
            <p className="text-gray-600 text-sm font-medium whitespace-nowrap leading-tight min-h-[1rem]">
              {currentText}
            </p>
          )}
        </div>
        {/* Tail */}
        <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-[6px]">
          <div className="w-3 h-3 rotate-45 bg-white border border-gray-200" />
        </div>
      </div>

      {showChoices && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { key: 'search', label: 'Search' },
            { key: 'summarize', label: 'Summarize' },
            { key: 'chat', label: 'Ask anything' }
          ].map((item, idx) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect?.(item.key as any)}
              className={
                "px-4 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-300"
              }
              style={{ animation: 'fadeInUp 320ms ease both', animationDelay: `${idx * 80}ms` }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Local keyframes for smooth animations */}
      <style jsx>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
