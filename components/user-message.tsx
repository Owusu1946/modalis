'use client'

import React, { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

import { File as FileIcon, FileArchive,FileAudio, FileImage, FileText, FileVideo, Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { CollapsibleMessage } from './collapsible-message'

type UserMessageProps = {
  message: string
  messageId?: string
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  attachments?: Array<{ contentType: string; url: string }>
}

export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  messageId,
  onUpdateMessage,
  attachments
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message)

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setEditedContent(message)
    setIsEditing(true)
  }

  const handleCancelClick = () => {
    setIsEditing(false)
  }

  const handleSaveClick = async () => {
    if (!onUpdateMessage || !messageId) return

    setIsEditing(false)

    try {
      await onUpdateMessage(messageId, editedContent)
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  return (
    <CollapsibleMessage role="user">
      <div
        className="flex-1 break-words w-full group outline-none relative"
        tabIndex={0}
      >
        {attachments && attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {/* Images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {attachments
                .filter(att => att.contentType?.startsWith('image/'))
                .map((att, idx) => (
                  <div key={`${att.url}-${idx}`} className="relative w-full overflow-hidden rounded-lg ring-1 ring-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={att.url} alt={`attachment-${idx}`} className="h-40 w-full object-cover" />
                  </div>
                ))}
            </div>

            {/* Non-image files */}
            <div className="flex flex-col gap-2">
              {attachments
                .filter(att => !att.contentType?.startsWith('image/'))
                .map((att, idx) => {
                  const ct = att.contentType || ''
                  let Icon = FileIcon
                  if (ct.startsWith('video/')) Icon = FileVideo
                  else if (ct.startsWith('audio/')) Icon = FileAudio
                  else if (ct === 'application/pdf' || ct.startsWith('text/')) Icon = FileText
                  else if (ct.includes('zip')) Icon = FileArchive
                  else if (ct.includes('image')) Icon = FileImage
                  const fileName = (() => {
                    try {
                      const u = new URL(att.url)
                      const last = decodeURIComponent(u.pathname.split('/').pop() || '')
                      return last || `attachment-${idx}`
                    } catch {
                      return `attachment-${idx}`
                    }
                  })()
                  return (
                    <a
                      key={`${att.url}-${idx}`}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50"
                      title={fileName}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate" style={{ maxWidth: '22rem' }}>{fileName}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{ct || 'file'}</span>
                    </a>
                  )
                })}
            </div>
          </div>
        )}
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <TextareaAutosize
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              autoFocus
              className="resize-none flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              minRows={2}
              maxRows={10}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleCancelClick}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveClick}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div className="flex-1">{message}</div>
            <div
              className={cn(
                'absolute top-1 right-1 transition-opacity ml-2',
                'opacity-0',
                'group-focus-within:opacity-100',
                'md:opacity-0',
                'md:group-hover:opacity-100'
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-7 w-7"
                onClick={handleEditClick}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleMessage>
  )
}
