#!/bin/sh
# Restores a gzipped pg_dump backup into a target database.
#
# Usage (run inside a postgres:16-alpine container with network access to
# the target, or via `docker compose run`):
#   PGHOST=postgres PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres123 \
#   TARGET_DB=whatsapp_platform_restore_test \
#   sh restore-postgres.sh /backups/whatsapp_platform_20260817_120000.sql.gz
#
# Deliberately restores into $TARGET_DB, not the live $PGDATABASE — this
# script never overwrites a running database by default. To actually cut
# over, restore into a fresh DB, verify it, then repoint the app at it.
set -eu

FILE="${1:?Usage: restore-postgres.sh <path-to-backup.sql.gz>}"
: "${TARGET_DB:?Set TARGET_DB to the database name to restore into (must not already exist)}"

echo "[restore] creating database $TARGET_DB"
createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$TARGET_DB"

echo "[restore] restoring $FILE into $TARGET_DB"
gunzip -c "$FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 -q

echo "[restore] done"
