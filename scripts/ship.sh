#!/bin/sh
# Allinea il repository: controlli pre-rilascio, poi commit e push su GitHub SOLO se tutto è verde. Non tocca Vercel (deploy automatici spenti).
set -e
cd "$(dirname "$0")/.."
LOG="${TMPDIR:-/tmp}/aster-ship.log"
if npm run release:check > "$LOG" 2>&1; then
  tail -3 "$LOG"
  git add src tests e2e scripts README.md
  git -c user.name="Vincenzo Giuva" -c user.email="info@vincenzogiuva.it" commit -qm "$1"
  git push origin main 2>&1 | tail -1
else
  echo "CONTROLLI FALLITI: niente commit, niente push."; grep -E "✘|Error|rilasciare" "$LOG" | head -12; exit 1
fi
