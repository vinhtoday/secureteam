#!/bin/bash
# Start all services
cd /home/z/my-project

# Start Next.js on port 3005
PORT=3005 bun .next/standalone/server.js &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# Start chat service on port 3004
cd /home/z/my-project/mini-services/chat-service
bun run index.ts &
CHAT_PID=$!
echo "Chat Service PID: $CHAT_PID"

# Wait for either to die
wait -n $NEXT_PID $CHAT_PID 2>/dev/null
echo "A service died, exiting..."
