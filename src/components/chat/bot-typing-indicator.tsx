'use client'

import { cn } from '@/lib/utils'
import { Bot } from 'lucide-react'

interface BotTypingIndicatorProps {
  className?: string
}

export function BotTypingIndicator({ className }: BotTypingIndicatorProps) {
  return (
    <div className={cn('px-4 py-2', className)}>
      <div className="flex items-center gap-2.5 max-w-[200px]">
        {/* Bot avatar */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>

        {/* Typing bubble */}
        <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted dark:bg-muted/80 px-3.5 py-2.5 shadow-sm">
          <div className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs text-muted-foreground ml-1.5">
            SecureBot đang suy nghĩ...
          </span>
        </div>
      </div>
    </div>
  )
}
