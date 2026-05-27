#!/bin/bash
# Keepalive script - ensures Next.js + Chat Service stay running

cd /home/z/my-project

LOG="/home/z/my-project/keepalive.log"
CHAT_LOG="/home/z/my-project/chat-service.log"
SRV_LOG="/home/z/my-project/server.log"

echo "$(date) [KEEPALIVE] Starting..." >> $LOG

# Start chat service if not running
ensure_chat_service() {
  if ! pgrep -f "bun.*chat-service" > /dev/null 2>&1; then
    echo "$(date) [KEEPALIVE] Starting chat-service..." >> $LOG
    cd /home/z/my-project/mini-services/chat-service
    ( bun index.ts >> $CHAT_LOG 2>&1 ) &
    echo "$(date) [KEEPALIVE] chat-service PID: $!" >> $LOG
    cd /home/z/my-project
  fi
}

# Start Next.js if not running
ensure_server() {
  if ! pgrep -f "bun.*server.js" > /dev/null 2>&1; then
    echo "$(date) [KEEPALIVE] Starting Next.js server..." >> $LOG
    cd /home/z/my-project
    ( HOSTNAME="::" PORT="3000" bun .next/standalone/server.js >> $SRV_LOG 2>&1 ) &
    echo "$(date) [KEEPALIVE] Server PID: $!" >> $LOG
  fi
}

# Main loop - check every 5 seconds
while true; do
  ensure_chat_service
  ensure_server
  sleep 5
done
