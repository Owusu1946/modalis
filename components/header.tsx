'use client'

// import Link from 'next/link' // No longer needed directly here for Sign In button
import React from 'react'

import { User } from '@supabase/supabase-js'

import { cn } from '@/lib/utils'

import { useSidebar } from '@/components/ui/sidebar'

// import { Button } from './ui/button' // No longer needed directly here for Sign In button
import GuestMenu from './guest-menu' // Import the new GuestMenu component
import UserMenu from './user-menu'

interface HeaderProps {
  user: User | null
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  const { open } = useSidebar()
  return (
    <header
      className={cn(
        'fixed top-0 right-0 px-2 py-2 sm:p-2 flex justify-between items-center z-20 backdrop-blur lg:backdrop-blur-none bg-background/80 lg:bg-transparent transition-[width] duration-200 ease-linear',
        open ? 'md:w-[calc(100%-var(--sidebar-width))]' : 'md:w-full',
        'w-full'
      )}
    >
      {/* This div can be used for a logo or title on the left if needed */}
      <div className="pl-[env(safe-area-inset-left)]"></div>

      <div className="flex items-center gap-2 pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
        {user ? <UserMenu user={user} /> : <GuestMenu />}
      </div>
    </header>
  )
}

export default Header
