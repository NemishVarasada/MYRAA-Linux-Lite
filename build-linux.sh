#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname -m)" != "x86_64" ]]; then echo "This build targets x86_64."; exit 1; fi
sudo apt-get update
sudo apt-get install -y python3-venv python3-dev build-essential libgtk-3-0 libnss3 libasound2 wl-clipboard xclip xdotool wmctrl brightnessctl gnome-screenshot tesseract-ocr
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-linux.txt pyinstaller
rm -rf agent_build agent_dist
pyinstaller --clean --noconfirm --workpath agent_build --distpath agent_dist desktop_agent_linux.spec
npm install
npm run dist:linux
printf '\nBuild complete. Packages are in: %s/release\n' "$PWD"
