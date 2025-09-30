'use client'

import { useChat } from '@ai-sdk/react'
import { ToolInvocation } from 'ai'

import { useArtifact } from '@/components/artifact/artifact-context'

import { CollapsibleMessage } from './collapsible-message'
import { DefaultSkeleton } from './default-skeleton'
import { Section, ToolArgsSection } from './section'

interface WebSectionProps {
  tool: ToolInvocation
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
}

export function WebSection({ tool, isOpen, onOpenChange, chatId }: WebSectionProps) {
  const { status } = useChat({ id: chatId })
  const isLoading = status === 'submitted' || status === 'streaming'

  const isToolLoading = tool.state === 'call'
  const result = tool.state === 'result' ? (tool.result as any) : undefined
  const title = result?.title || 'Website'
  const files: Array<{ path: string }> = result?.files || []

  const { open } = useArtifact()
  const header = (
    <button
      type="button"
      onClick={() => open({ type: 'tool-invocation', toolInvocation: tool })}
      className="flex items-center justify-between w-full text-left rounded-md p-1 -ml-1"
      title="Open editor"
    >
      <ToolArgsSection tool="web">{title}</ToolArgsSection>
    </button>
  )

  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={true}
      header={header}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showIcon={false}
    >
      {isLoading && isToolLoading ? (
        <DefaultSkeleton />
      ) : files?.length ? (
        <Section title="Files">
          <ul className="text-xs text-muted-foreground space-y-1">
            {files.map((f, i) => (
              <li key={`${f.path}-${i}`}>• {f.path}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </CollapsibleMessage>
  )
}
