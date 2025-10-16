'use client'

import { Github, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { Button } from '@/components/ui/button'

export function NavActions() {
  const { setTheme, theme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-pointer"
        onClick={() => window.open('https://github.com/acakluqman/nextjs-imdb', '_blank')}
      >
        <Github className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={toggleTheme}>
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}
