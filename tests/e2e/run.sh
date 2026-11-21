#!/usr/bin/env bash
# Lance un serveur de test neuf (donnees en memoire), joue le parcours complet, puis l'arrete.
set -euo pipefail
cd "$(dirname "$0")/../.."
PORT=3100
if curl -s -o /dev/null "http://localhost:$PORT"; then echo "Le port $PORT est deja utilise : arretez l'ancien serveur." >&2; exit 1; fi
rm -rf .billetterie-test-mails
BILLETTERIE_TEST_MODE=1 NEXT_PUBLIC_APP_URL="http://localhost:$PORT" \
NEXT_PUBLIC_SUPABASE_URL=http://localhost:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=test \
  npx next dev -p "$PORT" > /tmp/billetterie-e2e-server.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for i in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PORT/evenement/octobre-rose-2026" && break
  sleep 1
done
E2E_BASE="http://localhost:$PORT" node tests/e2e/billetterie.e2e.mjs
