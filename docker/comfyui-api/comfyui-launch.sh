#!/bin/bash
set -euo pipefail

COMFY_HOME="${COMFY_HOME:-/opt/ComfyUI}"
COMFY_PORT="${COMFYUI_PORT_HOST:-8188}"
COMFY_HOST="${DIRECT_ADDRESS:-0.0.0.0}"
COMFY_ARGS=(
  "--listen" "${COMFY_HOST}"
  "--port" "${COMFY_PORT}"
)

if [[ -n "${OUTPUT_DIR:-}" ]]; then
  COMFY_ARGS+=("--output-directory" "${OUTPUT_DIR}")
fi
if [[ -n "${INPUT_DIR:-}" ]]; then
  COMFY_ARGS+=("--input-directory" "${INPUT_DIR}")
fi

if pgrep -f "${COMFY_HOME}/main.py" >/dev/null 2>&1; then
  echo "Detected existing ComfyUI process, terminating..." >&2
  pkill -f "${COMFY_HOME}/main.py"
  sleep 1
fi

exec python3 -u "${COMFY_HOME}/main.py" "${COMFY_ARGS[@]}"
