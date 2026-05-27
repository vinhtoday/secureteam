---
Task ID: 1
Agent: Super Z (Main)
Task: Restart dev server + Fix ALL WebRTC call features (voice, video, screen share)

Work Log:
- Checked server status: port 3000 was down
- Restarted dev server, verified 200 OK
- Read full codebase: webrtc.ts, call-manager.tsx, use-socket.ts, call-screen.tsx, call-controls.tsx
- Investigated server-side signal handling in mini-services/chat-service/index.ts
- Confirmed server uses unicast for call:signal (correct) and broadcast with socket.to() for call:accept (correct, excludes sender)
- Identified 3 root causes:
  1. `call:accept` handler in use-socket.ts did NOT check `data.userId !== user.id` — callee could create offer to self
  2. `call:signal` handler did NOT check `data.fromUserId !== user.id` — any self-signal would be processed
  3. `replaceTrackOnAllPeers()` method was MISSING from webrtc.ts — screen share would crash
- Applied fixes to 4 files:
  - webrtc.ts: Added negotiationRole tracking, localUserId self-check, replaceTrackOnAllPeers(), robust handleAnswer with state checking
  - use-socket.ts: Added self-signaling guards in call:accept and call:signal handlers, set localUserId
  - call-manager.tsx: Added setLocalUserId for callee flow
  - call-controls.tsx: Added setLocalUserId for caller flow
- Clean rebuild: deleted .next, restarted dev server, verified 200 OK

Stage Summary:
- Fixed 3 critical bugs that caused ALL call features to break
- Added negotiation role tracking (caller/callee) to prevent signaling state confusion
- Added self-signaling prevention via localUserId checks at all entry points
- Added missing replaceTrackOnAllPeers() for screen share support
- Added robust state checking in handleAnswer to gracefully handle wrong signaling states
- Server running at localhost:3000 (200 OK)
