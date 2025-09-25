'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

function IconLogo({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 256 256"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4', className)}
      {...props}
    >
      <circle cx="128" cy="128" r="128" fill="black"></circle>
      <circle cx="102" cy="128" r="18" fill="white"></circle>
      <circle cx="154" cy="128" r="18" fill="white"></circle>
    </svg>
  )
}

interface AnimatedIconLogoProps extends React.ComponentProps<'svg'> {
  containerRef?: React.RefObject<HTMLElement>
}

function AnimatedIconLogo({ className, containerRef, ...props }: AnimatedIconLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isBlinking, setIsBlinking] = useState(false)
  const [headRotation, setHeadRotation] = useState({ x: 0, y: 0 })
  const [eyePositions, setEyePositions] = useState({
    leftEye: { x: 122, y: 160 },  // Centered in new 320x320 viewBox
    rightEye: { x: 198, y: 160 }
  })

  // Human-like blinking animation
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout

    const scheduleNextBlink = () => {
      // Human blink patterns: 1.5-4 seconds, with most blinks happening in 2-3 second range
      const baseInterval = 1500 + Math.random() * 2500 // 1.5-4 seconds
      const nextBlinkDelay = baseInterval

      blinkTimeout = setTimeout(() => {
        // Occasionally do a double blink (like humans do)
        const isDoubleBlink = Math.random() < 0.45 // 15% chance of double blink

        // First blink
        setIsBlinking(true)
        setTimeout(() => {
          setIsBlinking(false)
          
          // If double blink, do second blink after short pause
          if (isDoubleBlink) {
            setTimeout(() => {
              setIsBlinking(true)
              setTimeout(() => {
                setIsBlinking(false)
                scheduleNextBlink() // Schedule next blink cycle
              }, 120) // Slightly shorter second blink
            }, 200) // Short pause between blinks
          } else {
            scheduleNextBlink() // Schedule next blink cycle
          }
        }, 140 + Math.random() * 40) // Blink duration: 140-180ms (human-like)
      }, nextBlinkDelay)
    }

    // Start the blinking cycle
    scheduleNextBlink()

    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout)
    }
  }, [])

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent
      const container = containerRef?.current || document.body
      const rect = container.getBoundingClientRect()
      setMousePos({
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top
      })
    }

    const container = containerRef?.current || document
    container.addEventListener('mousemove', handleMouseMove)
    return () => container.removeEventListener('mousemove', handleMouseMove)
  }, [containerRef])

  // Calculate head rotation and eye positions based on mouse position
  useEffect(() => {
    if (!svgRef.current) return

    const svgRect = svgRef.current.getBoundingClientRect()
    const svgCenterX = svgRect.left + svgRect.width / 2
    const svgCenterY = svgRect.top + svgRect.height / 2

    // Calculate angle from center of logo to mouse
    const deltaX = mousePos.x - (svgCenterX - (containerRef?.current?.getBoundingClientRect().left || 0))
    const deltaY = mousePos.y - (svgCenterY - (containerRef?.current?.getBoundingClientRect().top || 0))
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Head rotation - more free movement
    const maxHeadRotation = 15 // degrees
    const headRotationX = distance > 0 ? (deltaX / distance) * Math.min(distance / 30, 1) * maxHeadRotation : 0
    const headRotationY = distance > 0 ? (deltaY / distance) * Math.min(distance / 30, 1) * maxHeadRotation : 0
    
    setHeadRotation({ x: headRotationX, y: headRotationY })
    
    // Eye movement - much more freedom
    const maxEyeMovement = 15 // Increased from 8
    const eyeNormalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance / 40, 1) * maxEyeMovement : 0
    const eyeNormalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance / 40, 1) * maxEyeMovement : 0

    setEyePositions({
      leftEye: {
        x: 122 + eyeNormalizedX,  // Centered in new viewBox
        y: 160 + eyeNormalizedY
      },
      rightEye: {
        x: 198 + eyeNormalizedX,
        y: 160 + eyeNormalizedY
      }
    })
  }, [mousePos, containerRef])

  return (
    <svg
      ref={svgRef}
      fill="currentColor"
      viewBox="0 0 320 320"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4 transition-all duration-100', className)}
      {...props}
    >
      <defs>
        {/* Gradient for iris */}
        <radialGradient id="irisGradient" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#4A90E2" />
          <stop offset="30%" stopColor="#357ABD" />
          <stop offset="70%" stopColor="#2E5984" />
          <stop offset="100%" stopColor="#1A365D" />
        </radialGradient>
        
        {/* Gradient for eye white with subtle shading */}
        <radialGradient id="eyeWhiteGradient" cx="0.3" cy="0.3" r="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F8F9FA" />
          <stop offset="100%" stopColor="#E9ECEF" />
        </radialGradient>
        
        {/* Shadow filter */}
        <filter id="eyeShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      
      {/* Head with rotation */}
      <g transform={`rotate(${headRotation.x * 0.3} 160 160) translate(${headRotation.x * 0.5} ${headRotation.y * 0.5})`}>
        <circle cx="160" cy="160" r="128" fill="black" className="transition-all duration-200 ease-out"></circle>
      
        {/* Left eye - Much Bigger */}
        {isBlinking ? (
          <ellipse 
            cx={eyePositions.leftEye.x} 
            cy={eyePositions.leftEye.y} 
            rx="32" 
            ry="4" 
            fill="url(#eyeWhiteGradient)"
            className="transition-all duration-150"
            filter="url(#eyeShadow)"
          />
        ) : (
          <>
            {/* Eye socket shadow */}
            <ellipse 
              cx={eyePositions.leftEye.x} 
              cy={eyePositions.leftEye.y + 2} 
              rx="34" 
              ry="26" 
              fill="rgba(0,0,0,0.2)"
              className="transition-all duration-200 ease-out"
            />
            {/* Eye white - much bigger oval shape */}
            <ellipse 
              cx={eyePositions.leftEye.x} 
              cy={eyePositions.leftEye.y} 
              rx="32" 
              ry="24" 
              fill="url(#eyeWhiteGradient)"
              className="transition-all duration-200 ease-out"
            />
          </>
        )}
        
        {/* Right eye - Much Bigger */}
        {isBlinking ? (
          <ellipse 
            cx={eyePositions.rightEye.x} 
            cy={eyePositions.rightEye.y} 
            rx="32" 
            ry="4" 
            fill="url(#eyeWhiteGradient)"
            className="transition-all duration-150"
            filter="url(#eyeShadow)"
          />
        ) : (
          <>
            {/* Eye socket shadow */}
            <ellipse 
              cx={eyePositions.rightEye.x} 
              cy={eyePositions.rightEye.y + 2} 
              rx="34" 
              ry="26" 
              fill="rgba(0,0,0,0.2)"
              className="transition-all duration-200 ease-out"
            />
            {/* Eye white - much bigger oval shape */}
            <ellipse 
              cx={eyePositions.rightEye.x} 
              cy={eyePositions.rightEye.y} 
              rx="32" 
              ry="24" 
              fill="url(#eyeWhiteGradient)"
              className="transition-all duration-200 ease-out"
            />
          </>
        )}
      
        {/* Iris and pupils - Bigger for bigger eyes */}
        {!isBlinking && (
          <>
            {/* Left iris - Much bigger */}
            <circle 
              cx={eyePositions.leftEye.x} 
              cy={eyePositions.leftEye.y} 
              r="14" 
              fill="url(#irisGradient)"
              className="transition-all duration-200 ease-out"
            />
            {/* Left pupil */}
            <circle 
              cx={eyePositions.leftEye.x} 
              cy={eyePositions.leftEye.y} 
              r="6" 
              fill="#000000"
              className="transition-all duration-200 ease-out"
            />
            {/* Left eye highlight */}
            <circle 
              cx={eyePositions.leftEye.x - 3} 
              cy={eyePositions.leftEye.y - 3} 
              r="3" 
              fill="#FFFFFF"
              opacity="0.8"
              className="transition-all duration-200 ease-out"
            />
            <circle 
              cx={eyePositions.leftEye.x + 4} 
              cy={eyePositions.leftEye.y - 2} 
              r="1.5" 
              fill="#FFFFFF"
              opacity="0.6"
              className="transition-all duration-200 ease-out"
            />
            
            {/* Right iris - Much bigger */}
            <circle 
              cx={eyePositions.rightEye.x} 
              cy={eyePositions.rightEye.y} 
              r="14" 
              fill="url(#irisGradient)"
              className="transition-all duration-200 ease-out"
            />
            {/* Right pupil */}
            <circle 
              cx={eyePositions.rightEye.x} 
              cy={eyePositions.rightEye.y} 
              r="6" 
              fill="#000000"
              className="transition-all duration-200 ease-out"
            />
            {/* Right eye highlight */}
            <circle 
              cx={eyePositions.rightEye.x - 3} 
              cy={eyePositions.rightEye.y - 3} 
              r="3" 
              fill="#FFFFFF"
              opacity="0.8"
              className="transition-all duration-200 ease-out"
            />
            <circle 
              cx={eyePositions.rightEye.x + 4} 
              cy={eyePositions.rightEye.y - 2} 
              r="1.5" 
              fill="#FFFFFF"
              opacity="0.6"
              className="transition-all duration-200 ease-out"
            />
          </>
        )}
      </g>
    </svg>
  )
}

export { AnimatedIconLogo, IconLogo }

