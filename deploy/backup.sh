#!/usr/bin/env bash
# nightly database backup, uploaded to /opt/ckauth by every deploy
# run by hand:  bash /opt/ckauth/backup.sh
# schedule:     crontab -e  ->  30 2 * * * bash /opt/ckauth/backup.sh >> /opt/ckauth/backups/backup.log 2>&1
set -euo pipefail

KEEP_DAYS=${KEEP_DAYS:-14}
BACKUP_DIR=/opt/ckauth/backups
FILE="$BACKUP_DIR/ckauth-$(date +%F-%H%M).sql.gz"

mkdir -p "$BACKUP_DIR"
# group-only: the deploy group (you and github actions), nobody else
chmod 2770 "$BACKUP_DIR"
cd /opt/ckauth

# write to a temp name first so a failed dump never looks like a good backup
docker compose exec -T db pg_dump -U ckauth --clean --if-exists ckauth | gzip > "$FILE.partial"
mv "$FILE.partial" "$FILE"
find "$BACKUP_DIR" -name 'ckauth-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "$(date -Is) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
