#!/usr/bin/env bash
# MediaSave – Unix/Mac launcher shortcut
# Usage: ./start.sh [flags]
# Flags: same as start.py (--backend-only, --frontend-only, --no-browser, etc.)

cd "$(dirname "$0")"
python3 start.py "$@"
