'use client'

import { cn } from '@/lib/utils'
import { Bot } from 'lucide-react'

interface BotTypingIndicatorProps {
  className?: string
}

export function BotTypingIndicator({ className }: BotTypingIndicatorProps) {
  return (
    <div className={cn('px-4 py-2', className)}>
      <div className="flex items-center gap-2.5 max-w-[250px]">
        {/* Bot avatar */}
        <div 
          className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#111820] text-[#00d68f] border border-[#1e2d3d]"
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          <Bot className="h-3.5 w-3.5" />
        </div>

        {/* Typing bubble */}
        <div className="flex items-center gap-1.5 rounded-[8px] bg-[#111820] border border-[#1e2d3d] px-3.5 py-2 shadow-sm">
          <div className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#00d68f] animate-bounce shadow-[0_0_6px_#00d68f]"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#00d68f] animate-bounce shadow-[0_0_6px_#00d68f]"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#00d68f] animate-bounce shadow-[0_0_6px_#00d68f]"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-[11px] font-mono-jb text-[#4d6b80] ml-2">
            SecureBot đang suy nghĩ...
          </span>
        </div>
      </div>
    </div>
  )
}
