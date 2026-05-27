// SecureTeam - WebRTC Manager
import type { Socket } from 'socket.io-client'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'e2daa6e6b42c37e1bf43a34f',
      credential: 'dQRmFNHvT1F0iI8A',
    },
    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'e2daa6e6b42c37e1bf43a34f',
      credential: 'dQRmFNHvT1F0iI8A',
    },
    {
      urls: 'turn:a.relay.metered.ca:443?transport=tcp',
      username: 'e2daa6e6b42c37e1bf43a34f',
      credential: 'dQRmFNHvT1F0iI8A',
    },
  ],
  iceCandidatePoolSize: 10,
}

interface SignalMessage {
  callId: string
  fromUserId: string
  signal: {
    type: 'offer' | 'answer' | 'ice-candidate'
    sdp?: string
    candidate?: RTCIceCandidateInit
  }
}

type RemoteStreamCallback = (userId: string, stream: MediaStream) => void
type RemoteStreamRemoveCallback = (userId: string) => void

class WebRTCManager {
  private peerConnections = new Map<string, RTCPeerConnection>()
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private socket: Socket | null = null
  private currentCallId: string = ''
  private onRemoteStreamCallback: RemoteStreamCallback | null = null
  private onRemoteStreamRemoveCallback: RemoteStreamRemoveCallback | null = null
  private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()
  // Accumulate remote tracks per user into a single MediaStream
  private remoteStreamsMap = new Map<string, MediaStream>()

  initSocket(socket: Socket) {
    this.socket = socket
  }

  setCallId(callId: string) {
    this.currentCallId = callId
  }

  onRemoteStream(cb: RemoteStreamCallback) {
    this.onRemoteStreamCallback = cb
  }

  onRemoteStreamRemove(cb: RemoteStreamRemoveCallback) {
    this.onRemoteStreamRemoveCallback = cb
  }

  async createLocalStream(isVideo: boolean): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: isVideo
          ? {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 360 },
              facingMode: 'user',
              frameRate: { ideal: 30, min: 15 },
            }
          : false,
      }
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log(
        `[WebRTC] Local stream created (video=${isVideo}), tracks:`,
        this.localStream.getTracks().map((t) => `${t.kind}:${t.enabled}`)
      )
      return this.localStream
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string }
      console.error('[WebRTC] Failed to get local stream:', err?.name, err?.message)
      if (isVideo) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          return this.localStream
        } catch {
          throw new Error('Không thể truy cập mic/camera.')
        }
      }
      throw new Error('Không thể truy cập mic.')
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      })
      this.screenStream.getVideoTracks()[0].onended = () => this.stopScreenShare()
      return this.screenStream
    } catch {
      throw new Error('Không thể chia sẻ màn hình.')
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop())
      this.screenStream = null
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream
  }

  getActiveVideoStream(): MediaStream | null {
    return this.screenStream || this.localStream
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peerConnections.keys()).filter((userId) => {
      const pc = this.peerConnections.get(userId)
      return pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed'
    })
  }

  createPeerConnection(userId: string): RTCPeerConnection | null {
    if (this.peerConnections.has(userId)) {
      const existing = this.peerConnections.get(userId)!
      if (existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
        return existing
      }
      existing.close()
      this.peerConnections.delete(userId)
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks — this is the critical part:
    // localStream must be ready BEFORE this is called
    const activeStream = this.getActiveVideoStream()
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        console.log(`[WebRTC] Adding local ${track.kind} track to peer ${userId}`)
        pc.addTrack(track, activeStream)
      })
    } else {
      console.warn(`[WebRTC] No local stream when creating peer connection for ${userId}`)
    }

    // Handle remote stream — accumulate ALL tracks into a single MediaStream per user
    pc.ontrack = (event) => {
      console.log(
        `[WebRTC] Remote track from ${userId}: ${event.track.kind}, streams: ${event.streams?.length || 0}`
      )
      // Always use a persistent MediaStream to accumulate all tracks (audio + video)
      if (!this.remoteStreamsMap.has(userId)) {
        this.remoteStreamsMap.set(userId, new MediaStream())
      }
      const remoteStream = this.remoteStreamsMap.get(userId)!
      if (event.track) {
        // Don't add duplicate tracks
        const existing = remoteStream.getTracks().find(t => t.id === event.track.id)
        if (!existing) {
          remoteStream.addTrack(event.track)
          console.log(`[WebRTC] Added ${event.track.kind} track to remote stream for ${userId}, total tracks: ${remoteStream.getTracks().length}`)
        }
      }
      // Also sync from event.streams if available (some browsers populate this)
      if (event.streams && event.streams[0]) {
        for (const track of event.streams[0].getTracks()) {
          const exists = remoteStream.getTracks().find(t => t.id === track.id)
          if (!exists) {
            remoteStream.addTrack(track)
          }
        }
      }
      this.onRemoteStreamCallback?.(userId, remoteStream)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('call:signal', {
          callId: this.currentCallId,
          targetUserId: userId,
          signal: { type: 'ice-candidate', candidate: event.candidate.toJSON() },
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE ${userId}: ${pc.iceConnectionState}`)
      if (pc.iceConnectionState === 'failed') {
        this.restartIce(userId)
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection ${userId}: ${pc.connectionState}`)
      if (pc.connectionState === 'connected') {
        console.log(`[WebRTC] Media flowing with ${userId}!`)
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.onRemoteStreamRemoveCallback?.(userId)
      }
    }

    this.peerConnections.set(userId, pc)

    // Process buffered ICE candidates
    const buffered = this.pendingIceCandidates.get(userId) || []
    for (const candidate of buffered) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    }
    this.pendingIceCandidates.delete(userId)

    return pc
  }

  replaceVideoTrack(userId: string, newTrack: MediaStreamTrack | null) {
    const pc = this.peerConnections.get(userId)
    if (!pc) return
    const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
    if (videoSender && newTrack) {
      videoSender.replaceTrack(newTrack).catch(() => {})
    }
  }

  async replaceTrackOnAllPeers(newTrack: MediaStreamTrack): Promise<void> {
    for (const userId of this.getConnectedPeerIds()) {
      this.replaceVideoTrack(userId, newTrack)
    }
  }

  // Per-user signal lock to prevent concurrent processing for the same user
  private signalLocks = new Map<string, Promise<void>>() // unused
  private signalingUsers = new Set<string>() // users currently processing a signal

  async createOffer(userId: string): Promise<RTCSessionDescriptionInit | null> {
    let pc = this.peerConnections.get(userId)

    if (pc) {
      // If we already have a remote offer (glare), defer to it
      if (pc.signalingState === 'have-remote-offer') {
        console.warn(`[WebRTC] Glare with ${userId}: have remote offer, deferring`)
        return null
      }
      // If already have local offer, don't create another
      if (pc.signalingState === 'have-local-offer') {
        console.warn(`[WebRTC] Already have local offer for ${userId}, skipping`)
        return null
      }
      // If in unexpected state, close and recreate
      if (pc.signalingState !== 'stable') {
        console.warn(`[WebRTC] PC in unexpected state ${pc.signalingState} for ${userId}, recreating`)
        pc.close()
        this.peerConnections.delete(userId)
        this.remoteStreamsMap.delete(userId)
        pc = null
      }
    }

    if (!pc) {
      pc = this.createPeerConnection(userId)
    }
    if (!pc) return null

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await pc.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('[WebRTC] Failed to create offer:', error)
      return null
    }
  }

  async createAnswer(
    userId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> {
    let pc = this.peerConnections.get(userId)

    if (pc) {
      // Handle glare: if we have a local offer, rollback to accept remote offer
      if (pc.signalingState === 'have-local-offer') {
        console.warn(`[WebRTC] Glare with ${userId}: rolling back local offer to accept remote`)
        try {
          await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit)
        } catch {
          // Rollback failed, close and recreate
          pc.close()
          this.peerConnections.delete(userId)
          this.remoteStreamsMap.delete(userId)
          pc = null
        }
      }
      // Already processing a remote offer — skip duplicate
      else if (pc.signalingState === 'have-remote-offer') {
        console.warn(`[WebRTC] Already have remote offer from ${userId}, ignoring duplicate`)
        return null
      }
      // Unexpected state — close and recreate
      else if (pc.signalingState !== 'stable') {
        console.warn(`[WebRTC] PC in unexpected state ${pc.signalingState} for ${userId}, recreating`)
        pc.close()
        this.peerConnections.delete(userId)
        this.remoteStreamsMap.delete(userId)
        pc = null
      }
    }

    if (!pc) {
      pc = this.createPeerConnection(userId)
    }
    if (!pc) return null

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error('[WebRTC] Failed to create answer:', error)
      // If anything goes wrong, close and cleanup so next attempt starts fresh
      pc.close()
      this.peerConnections.delete(userId)
      this.remoteStreamsMap.delete(userId)
      return null
    }
  }

  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(userId)
    if (!pc) return
    // Only set remote answer if we have a pending local offer
    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`[WebRTC] Ignoring answer from ${userId}: signalingState=${pc.signalingState}, expected 'have-local-offer'`)
      return
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error('[WebRTC] Failed to set answer:', error)
    }
  }

  async addIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate?.candidate) return
    const pc = this.peerConnections.get(userId)
    if (!pc) {
      // Buffer the candidate until peer connection is created
      if (!this.pendingIceCandidates.has(userId)) {
        this.pendingIceCandidates.set(userId, [])
      }
      this.pendingIceCandidates.get(userId)!.push(candidate)
      return
    }
    try {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        // Buffer until remote description is set
        if (!this.pendingIceCandidates.has(userId)) {
          this.pendingIceCandidates.set(userId, [])
        }
        this.pendingIceCandidates.get(userId)!.push(candidate)
      }
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error)
    }
  }

  async restartIce(userId: string) {
    const pc = this.peerConnections.get(userId)
    if (!pc) return
    try {
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      if (this.socket) {
        this.socket.emit('call:signal', {
          callId: this.currentCallId,
          targetUserId: userId,
          signal: { type: 'offer', sdp: offer.sdp },
        })
      }
    } catch (error) {
      console.error('[WebRTC] ICE restart failed:', error)
    }
  }

  sendSignal(callId: string, targetUserId: string, signal: SignalMessage['signal']) {
    if (!this.socket) return
    this.socket.emit('call:signal', { callId, targetUserId, signal })
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted
    })
  }

  setCameraOff(cameraOff: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !cameraOff
    })
  }

  stopLocalStream() {
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.localStream = null
  }

  closePeerConnection(userId: string) {
    const pc = this.peerConnections.get(userId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(userId)
    }
  }

  cleanup() {
    this.stopLocalStream()
    this.stopScreenShare()
    this.peerConnections.forEach((pc) => pc.close())
    this.peerConnections.clear()
    this.pendingIceCandidates.clear()
    this.remoteStreamsMap.clear()
    this.socket = null
    this.currentCallId = ''
    this.onRemoteStreamCallback = null
    this.onRemoteStreamRemoveCallback = null
  }
}

export const webrtcManager = new WebRTCManager()

// Handler functions for use-socket.ts
export async function handleOffer(
  userId: string,
  offer: RTCSessionDescriptionInit
) {
  console.log(`[WebRTC] handleOffer from ${userId}`)
  const answer = await webrtcManager.createAnswer(userId, offer)
  if (answer) {
    const { useCallStore } = await import('@/stores/call-store')
    const callStore = useCallStore.getState()
    const callId = callStore.currentCall?.id || webrtcManager['currentCallId'] || ''
    webrtcManager.sendSignal(callId, userId, { type: 'answer', sdp: answer.sdp })
  }
}

export async function handleAnswer(
  userId: string,
  answer: RTCSessionDescriptionInit
) {
  await webrtcManager.handleAnswer(userId, answer)
}

export async function handleIceCandidate(
  userId: string,
  candidate: RTCIceCandidateInit
) {
  await webrtcManager.addIceCandidate(userId, candidate)
}
