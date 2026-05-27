#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/secureteam-backups"
DB_PATH="/opt/secureteam/db/custom.db"
UPLOAD_DIR="/opt/secureteam/public/uploads"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup database
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/db-${DATE}.bak"
    gzip "$BACKUP_DIR/db-${DATE}.bak"
    echo "Database backed up: db-${DATE}.bak.gz"
fi

# Backup uploads
if [ -d "$UPLOAD_DIR" ]; then
    tar -czf "$BACKUP_DIR/uploads-${DATE}.tar.gz" -C "$(dirname $UPLOAD_DIR)" "$(basename $UPLOAD_DIR)"
    echo "Uploads backed up: uploads-${DATE}.tar.gz"
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"

echo "Backup complete: $DATE"
