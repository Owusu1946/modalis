"use client"

import React from 'react'
import dynamic from 'next/dynamic'

import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { vscodeLight } from '@uiw/codemirror-theme-vscode'

// Dynamic import to ensure client-side only rendering
const ReactCodeMirror = dynamic(
  () => import('@uiw/react-codemirror').then(m => m.default),
  { ssr: false }
)

export type EditorLanguage = 'html' | 'css' | 'javascript'

function getExtensions(lang: EditorLanguage) {
  switch (lang) {
    case 'html':
      return [html()]
    case 'css':
      return [css()]
    case 'javascript':
      return [javascript({ jsx: true, typescript: false })]
    default:
      return []
  }
}

export function CodeEditor({
  value,
  onChange,
  language,
  className,
  minHeight = '50vh'
}: {
  value: string
  onChange: (val: string) => void
  language: EditorLanguage
  className?: string
  minHeight?: string
}) {
  return (
    <div className={className}>
      <ReactCodeMirror
        value={value}
        height={minHeight}
        theme={vscodeLight}
        extensions={getExtensions(language)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true
        }}
        onChange={onChange}
      />
    </div>
  )
}
