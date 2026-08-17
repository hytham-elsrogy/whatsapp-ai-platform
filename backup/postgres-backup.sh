#!/bin/sh
set -eu

mkdir -p /backups

while true; do
  ts=$(date +%Y%m%d_%H%M%S)
  file="/backups/whatsapp_platform_${ts}.sql.gz"
  tmp="${file}.tmp"

  echo "[postgres-backup] starting dump -> $file"
  if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" | gzip > "$tmp"; then
    mv "$tmp" "$file"
    echo "[postgres-backup] done: $(ls -lh "$file")"
  else
    echo "[postgres-backup] pg_dump failed, discarding partial file" >&2
    rm -f "$tmp"
  fi

  # Retention: delete dumps older than N days so this volume doesn't grow
  # unbounded. A failed dump above never produces a file, so retention only
  # ever prunes real, previously-successful backups.
  find /backups -name "*.sql.gz" -mtime "+${BACKUP_RETENTION_DAYS:-7}" -delete

  sleep "${BACKUP_INTERVAL_SECONDS:-86400}"
done
