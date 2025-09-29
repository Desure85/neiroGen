#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/choose-comfyui-image.sh [--cc MAJOR.MINOR]

Determines the recommended ComfyUI API Docker image based on GPU compute capability.
If --cc is not provided, the script uses `nvidia-smi --query-gpu=compute_cap --format=csv,noheader`.
USAGE
}

if [[ $# -gt 0 ]]; then
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --cc)
      shift
      if [[ $# -eq 0 ]]; then
        echo "Error: --cc requires MAJOR.MINOR value" >&2
        exit 1
      fi
      compute_capability="$1"
      shift
      ;;
    *)
      echo "Error: unknown argument $1" >&2
      usage
      exit 1
      ;;
  esac
fi

if [[ -z "${compute_capability:-}" ]]; then
  if ! command -v nvidia-smi >/dev/null 2>&1; then
    echo "Error: nvidia-smi not found and --cc not provided" >&2
    exit 1
  fi
  compute_capability=$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader | head -n 1 | tr -d ' ')
fi

if [[ -z "$compute_capability" ]]; then
  echo "Error: unable to determine compute capability" >&2
  exit 1
fi

if [[ ! "$compute_capability" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  echo "Error: unexpected compute capability format: $compute_capability" >&2
  exit 1
fi

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
major_num=$((10#$major))
minor_num=$((10#$minor))
cc_number=$((10 * major_num + minor_num))

echo "Detected compute capability: ${major}.${minor}" >&2

image=""
notes=""

if (( cc_number >= 80 )); then
  image="ghcr.io/saladtechnologies/comfyui-api:comfy0.3.59-api1.9.2-torch2.8.0-cuda12.8-runtime"
  notes="Pascal+ (>=8.0): оригинальный образ SaladTech подходит."
elif (( cc_number >= 70 )); then
  image="ghcr.io/saladtechnologies/comfyui-api:comfy0.3.59-api1.9.2-torch2.8.0-cuda12.8-runtime"
  notes="Volta/Turing (>=7.0): совместимо с CUDA 12.8, использовать стандартный образ."
elif (( cc_number >= 61 )); then
  image="neirogen/comfyui-api:cu118"
  notes="Pascal (6.x): используем кастомный образ на CUDA 11.8 / torch 2.5.1."
elif (( cc_number >= 50 )); then
  image="neirogen/comfyui-api:cu118"
  notes="Maxwell (5.x): поддержка ограничена, рекомендуется CUDA 11.8 образ или CPU fallback."
else
  notes="GPU ниже поколения Maxwell: рекомендуется CPU-режим или обновление GPU."
fi

if [[ -n "$image" ]]; then
  cat <<EOF
Recommended image: $image
Notes: $notes
EOF
else
  cat <<EOF
No compatible GPU profile found for compute capability ${major}.${minor}.
$notes
EOF
fi

exit 0
