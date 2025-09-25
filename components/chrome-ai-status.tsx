'use client'

import { useEffect, useState } from 'react'

import { AlertCircle, CheckCircle, Download, XCircle } from 'lucide-react'

import { getChromeAIStatus } from '@/lib/providers/chrome-ai'

import { Alert, AlertDescription } from './ui/alert'

interface ChromeAIStatusProps {
  onStatusChange?: (available: boolean) => void
}

export function ChromeAIStatus({ onStatusChange }: ChromeAIStatusProps) {
  const [status, setStatus] = useState<{
    available: boolean
    status: string
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const aiStatus = await getChromeAIStatus()
        setStatus(aiStatus)
        onStatusChange?.(aiStatus.available)
      } catch (error) {
        setStatus({
          available: false,
          status: 'error',
          message: 'Failed to check Chrome AI status'
        })
        onStatusChange?.(false)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [onStatusChange])

  if (loading) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Checking Chrome AI availability...</AlertDescription>
      </Alert>
    )
  }

  if (!status) return null

  const getIcon = () => {
    switch (status.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-500" />
      case 'not-supported':
      case 'unavailable':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getVariant = () => {
    switch (status.status) {
      case 'ready':
        return 'default'
      case 'downloading':
        return 'default'
      default:
        return 'destructive'
    }
  }

  return (
    <Alert variant={getVariant()}>
      {getIcon()}
      <AlertDescription>{status.message}</AlertDescription>
    </Alert>
  )
}
