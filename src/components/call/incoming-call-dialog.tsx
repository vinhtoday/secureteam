'use client'

import { Phone, Video, PhoneOff } from 'lucide-react'

interface IncomingCallDialogProps {
  callerName: string
  callerAvatar?: string | null
  callType: 'voice' | 'video' | 'group_voice' | 'group_video'
  callId: string
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallDialog({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  const isVideo = callType.includes('video')

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-gray-900 rounded-2xl p-6 text-center text-white shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="mb-4 flex justify-center">
          <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            {isVideo ? (
              <Video className="h-8 w-8" />
            ) : (
              <Phone className="h-8 w-8" />
            )}
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-gray-900 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold">{callerName}</h3>
        <p className="text-white/60 text-sm mt-1">
          Cuộc gọi {isVideo ? 'video' : 'thoại'} đến...
        </p>

        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={onReject}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-transform active:scale-95 shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="h-6 w-6 rotate-[135deg]" />
          </button>
          <button
            onClick={onAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 transition-transform active:scale-95 shadow-lg shadow-emerald-500/30"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
        <p className="text-white/40 text-xs mt-3">Trượt để trả lời</p>
      </div>
    </div>
  )
}
