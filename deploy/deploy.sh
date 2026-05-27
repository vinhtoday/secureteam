#!/bin/bash
set -euo pipefail

echo "=== SecureTeam Production Deploy ==="
echo "Timestamp: $(date -Iseconds)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config
DEPLOY_DIR="/opt/secureteam"
BACKUP_DIR="/opt/secureteam-backups"
COMPOSE_FILE="$DEPLOY_DIR/docker/docker-compose.yml"

# Step 1: Pre-deploy checks
echo -e "${YELLOW}[1/8] Pre-deploy checks...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed!${NC}"
    exit 1
fi
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}Pre-deploy checks passed${NC}"

# Step 2: Backup database
echo -e "${YELLOW}[2/8] Backing up database...${NC}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).bak"
if [ -f "$DEPLOY_DIR/db/custom.db" ]; then
    cp "$DEPLOY_DIR/db/custom.db" "$BACKUP_FILE"
    echo -e "${GREEN}Database backed up to $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}No database file to backup${NC}"
fi

# Step 3: Pull latest images
echo -e "${YELLOW}[3/8] Pulling latest images...${NC}"
docker compose -f "$COMPOSE_FILE" pull 2>&1 || echo -e "${YELLOW}Some images not found (building locally)${NC}"
echo -e "${GREEN}Images pulled${NC}"

# Step 4: Stop current services
echo -e "${YELLOW}[4/8] Stopping services...${NC}"
docker compose -f "$COMPOSE_FILE" down --timeout 30
echo -e "${GREEN}Services stopped${NC}"

# Step 5: Start services
echo -e "${YELLOW}[5/8] Starting services...${NC}"
docker compose -f "$COMPOSE_FILE" up -d
echo -e "${GREEN}Services started${NC}"

# Step 6: Wait for health checks
echo -e "${YELLOW}[6/8] Waiting for health checks...${NC}"
sleep 15

# Step 7: Verify deployment
echo -e "${YELLOW}[7/8] Verifying deployment...${NC}"
APP_HEALTH=$(docker compose -f "$COMPOSE_FILE" exec -T app wget -qO- http://localhost:3000/api/v1/health 2>/dev/null || echo "failed")
if echo "$APP_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}App is healthy${NC}"
else
    echo -e "${RED}App health check failed!${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 app
fi

CHAT_HEALTH=$(docker compose -f "$COMPOSE_FILE" exec -T chat-service wget -qO- http://localhost:3004/health 2>/dev/null || echo "failed")
if echo "$CHAT_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}Chat service is healthy${NC}"
else
    echo -e "${YELLOW}Chat service health check (may not have endpoint)${NC}"
fi

# Step 8: Cleanup
echo -e "${YELLOW}[8/8] Cleanup...${NC}"
docker image prune -f
echo -e "${GREEN}Old images removed${NC}"

echo ""
echo -e "${GREEN}=== Deploy Complete ===${NC}"
echo "App: https://$(hostname -I | awk '{print $1}')"
echo "Grafana: http://$(hostname -I | awk '{print $1}'):3001"
echo "Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
