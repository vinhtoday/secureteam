#!/bin/bash
cd /home/z/my-project

# Start Next.js with dual-stack on port 3000
HOSTNAME=:: PORT=3000 bun .next/standalone/server.js &>/home/z/my-project/srv.log &
NEXT_PID=$!
echo "Next.js started: PID=$NEXT_PID"

sleep 2
if kill -0 $NEXT_PID 2>/dev/null; then
    echo "Next.js is running on port 3000 (dual-stack)"
else
    echo "Next.js failed to start"
    cat /home/z/my-project/srv.log
fi

# Start chat service
cd /home/z/my-project/mini-services/chat-service
HOSTNAME=:: PORT=3004 bun run index.ts &>/home/z/my-project/chat-svc.log &
CHAT_PID=$!
echo "Chat started: PID=$CHAT_PID"

sleep 2
if kill -0 $CHAT_PID 2>/dev/null; then
    echo "Chat service is running on port 3004"
else
    echo "Chat service failed to start"
    cat /home/z/my-project/chat-svc.log
fi

# Write PID file for monitoring
echo "$NEXT_PID" > /home/z/my-project/.zscripts/dev.pid

# Keep alive - wait for all children
echo "All services running. Waiting..."
wait
