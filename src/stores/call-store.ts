'use client'

import { create } from 'zustand'
import type { CallRoom, CallParticipant } from '@/hooks/use-calls'

export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'active' | 'ended'

interface IncomingCall {
  callId: string
  callerId: string
  callerName: string
  callerAvatar?: string | null
  callType: 'voice' | 'video' | 'group_voice' | 'group_video'
  timestamp: string
}

interface CallState {
  currentCall: CallRoom | null
  callStatus: CallStatus
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  isHandRaised: boolean
  incomingCall: IncomingCall | null
  participants: CallParticipant[]
  isRecording: boolean
  recordingId: string | null
  callDuration: number
  showCallUI: boolean
  isMinimized: boolean
  showParticipants: boolean
  showCallChat: boolean
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>

  setCurrentCall: (call: CallRoom | null) => void
  setCallStatus: (status: CallStatus) => void
  setIncomingCall: (call: IncomingCall | null) => void
  toggleMute: () => void
  toggleCamera: () => void
  toggleScreenShare: () => void
  toggleHandRaise: () => void
  setParticipants: (participants: CallParticipant[]) => void
  updateParticipant: (userId: string, updates: Partial<CallParticipant>) => void
  addParticipant: (participant: CallParticipant) => void
  removeParticipant: (userId: string) => void
  setIsRecording: (recording: boolean) => void
  setRecordingId: (id: string | null) => void
  setShowCallUI: (show: boolean) => void
  setIsMinimized: (minimized: boolean) => void
  setLocalStream: (stream: MediaStream | null) => void
  addRemoteStream: (userId: string, stream: MediaStream) => void
  removeRemoteStream: (userId: string) => void
  endCall: () => void
  setShowParticipants: (show: boolean) => void
  setShowCallChat: (show: boolean) => void
  resetCall: () => void
}

const initialState = {
  currentCall: null,
  callStatus: 'idle' as CallStatus,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isHandRaised: false,
  incomingCall: null,
  participants: [],
  isRecording: false,
  recordingId: null,
  callDuration: 0,
  showCallUI: false,
  isMinimized: false,
  showParticipants: false,
  showCallChat: false,
  localStream: null,
  remoteStreams: new Map<string, MediaStream>(),
}

export const useCallStore = create<CallState>((set) => ({
  ...initialState,

  setCurrentCall: (call) => set({ currentCall: call, showCallUI: !!call }),
  setCallStatus: (status) => set({ callStatus: status }),
  setIncomingCall: (call) => set({ incomingCall: call }),

  toggleMute: () =>
    set((state) => ({ isMuted: !state.isMuted })),

  toggleCamera: () =>
    set((state) => ({ isCameraOff: !state.isCameraOff })),

  toggleScreenShare: () =>
    set((state) => ({ isScreenSharing: !state.isScreenSharing })),

  toggleHandRaise: () =>
    set((state) => ({ isHandRaised: !state.isHandRaised })),

  setParticipants: (participants) => set({ participants }),

  updateParticipant: (userId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.userId === userId ? { ...p, ...updates } : p
      ),
    })),

  addParticipant: (participant) =>
    set((state) => ({ participants: [...state.participants, participant] })),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),

  setIsRecording: (recording) => set({ isRecording: recording }),
  setRecordingId: (id) => set({ recordingId: id }),
  setShowCallUI: (show) => set({ showCallUI: show }),
  setIsMinimized: (minimized) => set({ isMinimized: minimized }),

  setLocalStream: (stream) => set({ localStream: stream }),

  addRemoteStream: (userId, stream) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams)
      newStreams.set(userId, stream)
      return { remoteStreams: newStreams }
    }),

  removeRemoteStream: (userId) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams)
      newStreams.delete(userId)
      return { remoteStreams: newStreams }
    }),

  setShowParticipants: (show) => set({ showParticipants: show, showCallChat: false }),
  setShowCallChat: (show) => set({ showCallChat: show, showParticipants: false }),

  endCall: () => {
    try {
      // Dynamic import to avoid circular dependency
      import('@/lib/webrtc').then(({ webrtcManager }) => {
        webrtcManager.cleanup()
      })
    } catch {
      // Ignore cleanup errors
    }
    set({
      ...initialState,
      remoteStreams: new Map<string, MediaStream>(),
    })
  },

  resetCall: () => {
    try {
      import('@/lib/webrtc').then(({ webrtcManager }) => {
        webrtcManager.cleanup()
      })
    } catch {
      // Ignore cleanup errors
    }
    set({
      ...initialState,
      remoteStreams: new Map<string, MediaStream>(),
    })
  },
}))
