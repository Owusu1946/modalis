"use client"

import React, { useEffect, useMemo, useRef } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  duotoneLight
} from 'react-syntax-highlighter/dist/cjs/styles/prism'

type SimpleCodeEditorProps = {
  value: string
  onChange: (value: string) => void
  language: 'html' | 'css' | 'javascript'
  className?: string
  placeholder?: string
}

export function SimpleCodeEditor({
  value,
  onChange,
  language,
  className,
  placeholder
}: SimpleCodeEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync scroll positions between overlay and textarea
  useEffect(() => {
    const ta = textareaRef.current
    const sc = scrollRef.current
    if (!ta || !sc) return
    const onScroll = () => {
      sc.scrollTop = ta.scrollTop
      sc.scrollLeft = ta.scrollLeft
    }
    ta.addEventListener('scroll', onScroll)
    return () => ta.removeEventListener('scroll', onScroll)
  }, [])

  const highlighted = useMemo(() => value, [value])

  return (
    <div
      className={
        'relative w-full rounded-md border border-input bg-background overflow-hidden ' +
        (className || '')
      }
    >
      {/* Highlight layer */}
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto pointer-events-none"
        aria-hidden
      >
        <SyntaxHighlighter
          language={language}
          style={duotoneLight}
          PreTag="div"
          showLineNumbers
          customStyle={{
            margin: 0,
            width: '100%',
            background: 'transparent',
            padding: '0.75rem 0.75rem',
            minHeight: '100%'
          }}
          lineNumberStyle={{ userSelect: 'none' }}
          codeTagProps={{
            style: {
              fontSize: '0.9rem',
              fontFamily: 'var(--font-mono)'
            }
          }}
        >
          {highlighted || ' '}
        </SyntaxHighlighter>
      </div>

      {/* Editing layer */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="relative z-10 block w-full h-full min-h-[180px] bg-transparent resize-none px-3 py-3 font-mono text-[0.9rem] leading-5 text-transparent caret-foreground focus:outline-none"
        style={{
          // Keep line heights and padding in sync with SyntaxHighlighter
          lineHeight: '1.25rem'
        }}
      />
    </div>
  )
}
