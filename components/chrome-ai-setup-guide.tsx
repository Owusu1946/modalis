'use client'

import { useState } from 'react'

import { AlertCircle, CheckCircle, Download, ExternalLink, X } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface ChromeAISetupGuideProps {
  error?: string
  onClose?: () => void
}

export function ChromeAISetupGuide({ error, onClose }: ChromeAISetupGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const setupSteps = [
    {
      title: 'Install Chrome Dev/Canary',
      description: 'Download Chrome Dev or Canary version 127+',
      action: 'Download Chrome Canary',
      url: 'https://www.google.com/chrome/canary/',
      icon: <Download className="h-4 w-4" />
    },
    {
      title: 'Enable Prompt API Flag',
      description: 'Enable the Gemini Nano prompt API',
      action: 'Open chrome://flags/#prompt-api-for-gemini-nano',
      url: 'chrome://flags/#prompt-api-for-gemini-nano',
      icon: <ExternalLink className="h-4 w-4" />,
      instruction: 'Set to "Enabled"'
    },
    {
      title: 'Enable Model Download Flag',
      description: 'Allow on-device model downloads',
      action: 'Open chrome://flags/#optimization-guide-on-device-model',
      url: 'chrome://flags/#optimization-guide-on-device-model',
      icon: <ExternalLink className="h-4 w-4" />,
      instruction: 'Set to "Enabled BypassPrefRequirement"'
    },
    {
      title: 'Download Gemini Nano',
      description: 'Download the on-device model',
      action: 'Open chrome://components',
      url: 'chrome://components',
      icon: <ExternalLink className="h-4 w-4" />,
      instruction: 'Find "Optimization Guide On Device Model" and click "Check for Update"'
    },
    {
      title: 'Restart Chrome',
      description: 'Restart Chrome to apply changes',
      instruction: 'Close and reopen Chrome completely'
    }
  ]

  const requirements = [
    { label: 'Storage', value: '22GB+ free space', met: null },
    { label: 'GPU', value: '4GB+ VRAM', met: null },
    { label: 'OS', value: 'Windows 10/11, macOS 13+, Linux, ChromeOS', met: null },
    { label: 'Network', value: 'Unmetered connection', met: null }
  ]

  const getErrorType = () => {
    if (!error) return 'setup'
    if (error.includes('server')) return 'server-limitation'
    if (error.includes('Chrome Dev/Canary')) return 'browser'
    if (error.includes('downloading')) return 'downloading'
    if (error.includes('Requirements')) return 'hardware'
    return 'setup'
  }

  const errorType = getErrorType()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Chrome AI Setup Required
          </CardTitle>
          <CardDescription>
            Gemini Nano requires Chrome Dev/Canary with specific configuration
          </CardDescription>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Issue</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {errorType === 'server-limitation' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chrome AI Limitation</AlertTitle>
            <AlertDescription>
              Chrome AI models can only run directly in the browser, not on the server. 
              This is a current limitation of the Chrome built-in AI APIs. 
              Please select a different model for now, or wait for client-side Chrome AI support to be implemented.
            </AlertDescription>
          </Alert>
        )}

        {errorType === 'downloading' && (
          <Alert>
            <Download className="h-4 w-4" />
            <AlertTitle>Download in Progress</AlertTitle>
            <AlertDescription>
              Gemini Nano is downloading. This may take several minutes depending on your connection.
              You can monitor progress at{' '}
              <a 
                href="chrome://on-device-internals" 
                className="underline text-blue-600 hover:text-blue-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                chrome://on-device-internals
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-3">Setup Steps</h3>
          <div className="space-y-3">
            {setupSteps.map((step, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  index === currentStep ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {step.icon || <CheckCircle className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-gray-600 mb-2">{step.description}</div>
                  {step.instruction && (
                    <Badge variant="outline" className="text-xs">
                      {step.instruction}
                    </Badge>
                  )}
                </div>
                {step.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (step.url.startsWith('chrome://')) {
                        window.location.href = step.url
                      } else {
                        window.open(step.url, '_blank')
                      }
                    }}
                  >
                    {step.action}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Hardware Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{req.label}:</span>
                <span className="text-sm text-gray-600">{req.value}</span>
              </div>
            ))}
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Chrome AI features are experimental and may not work on all devices. 
            If you encounter issues, you can use other models in the meantime.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
