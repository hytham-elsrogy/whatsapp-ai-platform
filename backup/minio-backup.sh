#!/bin/sh
set -eu

mc alias set localminio "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

while true; do
  ts=$(date +%Y%m%d_%H%M%S)
  dest="/backups/${ts}"

  echo "[minio-backup] mirroring bucket '$MINIO_BUCKET' -> $dest"
  # No file-count summary here beyond mc's own transfer table above — this
  # image has neither `find` nor `grep` to count recursively (a stripped
  # UBI-minimal base, confirmed by actually running it), and getting clever
  # with `ls -1R` parsing isn't worth it for a log line.
  if mc mirror --quiet "localminio/${MINIO_BUCKET}" "$dest"; then
    echo "[minio-backup] snapshot complete: $dest"
  else
    echo "[minio-backup] mirror failed (bucket may not exist yet, or nothing to copy) — removing empty snapshot" >&2
    rm -rf "$dest"
  fi

  # Retention: keep only the last N snapshot directories. Written without
  # find/xargs — the minio/mc image is a stripped-down UBI-minimal base
  # that has neither (discovered by actually running this, not assumed).
  keep="${BACKUP_RETENTION_COUNT:-7}"
  count=$(ls -1 /backups | wc -l)
  if [ "$count" -gt "$keep" ]; then
    for old in $(ls -1 /backups | sort | head -n $((count - keep))); do
      rm -rf "/backups/$old"
    done
  fi

  sleep "${BACKUP_INTERVAL_SECONDS:-86400}"
done
