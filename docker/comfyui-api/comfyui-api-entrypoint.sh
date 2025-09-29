#!/bin/bash
set -euo pipefail

export COMFY_HOME="${COMFY_HOME:-/opt/ComfyUI}"
export MODEL_DIR="${MODEL_DIR:-/opt/ComfyUI/models}"
export INPUT_DIR="${INPUT_DIR:-/opt/ComfyUI/input}"
export OUTPUT_DIR="${OUTPUT_DIR:-/opt/ComfyUI/output}"

mkdir -p "$MODEL_DIR" "$INPUT_DIR" "$OUTPUT_DIR"

COMFY_HOST="${DIRECT_ADDRESS:-127.0.0.1}"
COMFY_PORT="${COMFYUI_PORT_HOST:-8188}"

if [[ -z "${CMD:-}" || "${CMD}" == "python3 -u main.py --listen 0.0.0.0" ]]; then
  export CMD=""
fi

if ! pgrep -f "${COMFY_HOME}/main.py" >/dev/null 2>&1; then
  echo "[entrypoint] Launching ComfyUI..." >&2
  LOG_DIR="${COMFY_HOME}/logs"
  mkdir -p "$LOG_DIR"
  LOG_FILE="${LOG_DIR}/comfyui.log"
  python3 -u "${COMFY_HOME}/main.py" \
    --listen "0.0.0.0" \
    --port "${COMFY_PORT}" \
    --output-directory "${OUTPUT_DIR}" \
    --input-directory "${INPUT_DIR}" \
    >>"$LOG_FILE" 2>&1 &

  START_TIMEOUT=60
  while ! curl -sf "http://127.0.0.1:${COMFY_PORT}" >/dev/null 2>&1; do
    sleep 1
    START_TIMEOUT=$((START_TIMEOUT - 1))
    if [[ $START_TIMEOUT -le 0 ]]; then
      echo "[entrypoint] ComfyUI failed to start within timeout. Check $LOG_FILE" >&2
      exit 1
    fi
  done
  echo "[entrypoint] ComfyUI is up." >&2
fi

exec "$@"
