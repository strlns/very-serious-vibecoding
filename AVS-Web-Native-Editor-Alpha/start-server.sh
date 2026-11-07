#!/bin/sh
cd "$(dirname "$0")" || exit 1
if [ -f package.json ]; then
  if [ ! -f dist/index.html ]; then
    echo "Run npm run build first, or npm run dev for development." >&2
    exit 1
  fi
  cd dist || exit 1
fi
python3 -m http.server 8080 --bind 127.0.0.1
