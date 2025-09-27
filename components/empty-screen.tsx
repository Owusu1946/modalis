import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

const exampleMessages = [
  {
    heading: 'What is DeepSeek R1?',
    message: 'What is DeepSeek R1?'
  },
  {
    heading: 'Why is Nvidia growing rapidly?',
    message: 'Why is Nvidia growing rapidly?'
  },
  {
    heading: 'Tesla vs Rivian',
    message: 'Tesla vs Rivian'
  },
  {
    heading: 'Summary: https://arxiv.org/pdf/2501.05707',
    message: 'Summary: https://arxiv.org/pdf/2501.05707'
  }
]
export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all duration-500 ease-out ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-2 flex flex-col items-start space-y-3 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="group h-auto p-0 text-base text-left justify-start hover:translate-x-1 transition-all duration-300 ease-out animate-in fade-in slide-in-from-left-4"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards'
              }}
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight 
                size={16} 
                className="mr-2 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-300" 
              />
              <span className="group-hover:text-foreground transition-colors duration-300">
                {message.heading}
              </span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
