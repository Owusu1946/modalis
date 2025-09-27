'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

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
  const lastMouseTimeRef = useRef<number>(performance.now())
  const [isIdle, setIsIdle] = useState<boolean>(true)
  const idleRAFRef = useRef<number | null>(null)
  const [eyePositions, setEyePositions] = useState({
    leftEye: { x: 122, y: 160 },  // Centered in new 320x320 viewBox
    rightEye: { x: 198, y: 160 }
  })
  const [pupilRadius, setPupilRadius] = useState(6)
  const [headScale, setHeadScale] = useState(1)
  const [winkEye, setWinkEye] = useState<null | 'left' | 'right'>(null)
  const winkUntilRef = useRef<number>(0)

  // Human-like blinking animation
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout

    const scheduleNextBlink = () => {
      // Human blink patterns: 1.5-4 seconds, with most blinks happening in 2-3 second range
      const baseInterval = 1500 + Math.random() * 2500 // 1.5-4 seconds
      const nextBlinkDelay = baseInterval

      blinkTimeout = setTimeout(() => {
        // Occasionally do a double blink (like humans do)
        const isDoubleBlink = Math.random() < 0.45 // 45% chance of double blink

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
            }, 100) // Short pause between blinks
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
      lastMouseTimeRef.current = performance.now()
      setIsIdle(false)
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

    // If recently active, follow mouse; otherwise let idle loop handle motion
    const now = performance.now()
    const idleThreshold = 4000 // ms
    const isRecentlyActive = now - lastMouseTimeRef.current < idleThreshold
    setIsIdle(!isRecentlyActive)

    if (!isRecentlyActive) return

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

  // Idle animation loop: gentle autonomous head/eye movement with personality
  useEffect(() => {
    let startTime = performance.now()

    const animate = () => {
      const t = (performance.now() - startTime) / 1000 // seconds

      // If idle, animate; else let mouse effect take precedence
      const now = performance.now()
      const idleThreshold = 4000
      const currentlyIdle = now - lastMouseTimeRef.current >= idleThreshold
      setIsIdle(currentlyIdle)

      if (currentlyIdle) {
        // Smooth organic motion using layered sines
        const headAmp = 12 // degrees (more energetic)
        const eyeAmp = 14

        // Occasional curious head tilts (slow nods)
        let hx = Math.sin(t * 0.8) * headAmp + Math.sin(t * 0.17 + 1.2) * 2
        let hy = Math.sin(t * 0.6 + 0.3) * headAmp * 0.6 + Math.sin(t * 0.11 + 2.1) * 1.4

        // Playful bursty head bob (short energetic accents)
        const burst = Math.max(0, Math.sin(t * 1.1 + 2.4)) ** 3
        hx += burst * 3
        hy += burst * -2

        setHeadRotation({ x: hx, y: hy })

        // Saccade-like gaze: add small sudden offsets at irregular intervals
        const saccadePulse = (Math.sin(t * 3.0) + Math.sin(t * 3.6 + 1.3)) * 0.6
        const saccadeGate = Math.max(0, Math.sin(t * 0.35 + 0.7)) // opens/closes slowly
        const saccade = saccadePulse * saccadeGate

        const ex = Math.sin(t * 1.35 + 0.6) * eyeAmp + Math.sin(t * 0.27) * 2.4 + saccade * 6
        const ey = Math.sin(t * 1.1 + 1.4) * eyeAmp * 0.7 + Math.sin(t * 0.22 + 0.4) * 1.8 + saccade * -3

        setEyePositions({
          leftEye: { x: 122 + ex, y: 160 + ey },
          rightEye: { x: 198 + ex, y: 160 + ey }
        })

        // Pupil dilation a bit larger and more active
        const dilation = 6.5 + Math.sin(t * 0.95 + 0.2) * 1.1 + Math.sin(t * 0.2) * 0.35
        setPupilRadius(dilation)

        // Breathing scale (slightly more visible)
        const scale = 1 + Math.sin(t * 0.6) * 0.018 + Math.sin(t * 0.17 + 1.1) * 0.008
        setHeadScale(scale)

        // Occasional playful wink while idle
        const nowMs = performance.now()
        if (!winkEye && nowMs > winkUntilRef.current) {
          // ~ once every few seconds on average
          if (Math.random() < 0.007) {
            const eye: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
            setWinkEye(eye)
            winkUntilRef.current = nowMs + 200 // wink duration
          }
        } else if (winkEye && nowMs > winkUntilRef.current) {
          setWinkEye(null)
        }
      } else {
        // When active, reset scale and a neutral dilation
        setHeadScale(1)
        setPupilRadius(6)
        setWinkEye(null)
      }

      idleRAFRef.current = requestAnimationFrame(animate)
    }

    idleRAFRef.current = requestAnimationFrame(animate)
    return () => {
      if (idleRAFRef.current) cancelAnimationFrame(idleRAFRef.current)
    }
  }, [])

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
      <g transform={`translate(160 160) scale(${headScale}) translate(-160 -160) rotate(${headRotation.x * 0.3} 160 160) translate(${headRotation.x * 0.5} ${headRotation.y * 0.5})`}>
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
              r={pupilRadius + 8}
              fill="url(#irisGradient)"
              className="transition-all duration-200 ease-out"
            />
            {/* Left pupil */}
            <circle 
              cx={eyePositions.leftEye.x} 
              cy={eyePositions.leftEye.y} 
              r={pupilRadius}
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
              r={pupilRadius + 8}
              fill="url(#irisGradient)"
              className="transition-all duration-200 ease-out"
            />
            {/* Right pupil */}
            <circle 
              cx={eyePositions.rightEye.x} 
              cy={eyePositions.rightEye.y} 
              r={pupilRadius}
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

