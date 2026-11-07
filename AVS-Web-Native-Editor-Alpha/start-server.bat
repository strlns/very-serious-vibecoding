@echo off
cd /d "%~dp0"
if exist package.json (
  if not exist dist\index.html (
    echo Run npm run build first, or npm run dev for development.
    exit /b 1
  )
  cd dist
)
py -3 -m http.server 8080 --bind 127.0.0.1
