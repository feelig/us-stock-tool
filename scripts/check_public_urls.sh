#!/usr/bin/env bash
set -e
BASE="${1:-http://localhost:8888}"
paths=(
  "/data/risk_index.json"
  "/data/daily.json"
  "/data/tickers/AAPL.js"
  "/og/mri-latest.png"
)
for p in "${paths[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${p}")
  echo "${p} -> ${code}"
  if [ "${code}" != "200" ]; then
    echo "ERROR: ${p} returned ${code}" >&2
    exit 1
  fi
done
