#!/bin/sh
set -e

cd /var/www

echo "[start] Container init..."

# Install dependencies if vendor is missing (volume mounts may hide built vendor)
if [ ! -f "vendor/autoload.php" ]; then
  echo "[start] Installing composer dependencies..."
  composer install --no-dev --prefer-dist --no-interaction --no-progress
fi

# Always refresh optimized autoloader in case new classes were added
echo "[start] Dumping optimized autoloader..."
composer dump-autoload -o --no-interaction

# Ensure writable directories exist and are writable (early)
echo "[start] Ensuring writable directories (early)..."
mkdir -p bootstrap/cache \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs
chmod -R 777 bootstrap/cache storage || true

# Prepare local bin for non-root installs and extend PATH
RR_BIN="/var/www/bin/rr"
mkdir -p /var/www/bin
export PATH="/var/www/bin:$PATH"

# Installer for RoadRunner at runtime (non-root). Pinned by RR_VERSION if provided; checksum verified when available.
install_rr() {
  # If rr already available in PATH or at RR_BIN, skip
  if command -v rr >/dev/null 2>&1; then
    echo "[start] rr already available: $(rr --version 2>/dev/null || echo present)"
    return 0
  fi
  if [ -x "$RR_BIN" ]; then
    echo "[start] rr already installed at $RR_BIN"
    return 0
  fi

  echo "[start] Installing roadRunner binary..."
  # Prefer composer roadrunner-cli to download the binary first
  if [ -f "vendor/bin/rr" ]; then
    echo "[start] Trying vendor/bin/rr to download RR..."
    if php vendor/bin/rr get -n >/dev/null 2>&1 && [ -f "rr" ]; then
      mv rr "$RR_BIN" && chmod +x "$RR_BIN" && echo "[start] RR installed via vendor/bin/rr."
      return 0
    fi
  fi

  # Try pinned version (main repo with checksums)
  if [ -n "${RR_VERSION:-}" ]; then
    RR_FILE="roadrunner-${RR_VERSION}-linux-amd64"
    RR_URL="https://github.com/roadrunner-server/roadrunner/releases/download/v${RR_VERSION}/${RR_FILE}"
    SUM_URL="https://github.com/roadrunner-server/roadrunner/releases/download/v${RR_VERSION}/checksums.txt"
    if curl -fsSL -o "/tmp/${RR_FILE}" "$RR_URL" \
      && curl -fsSL -o "/tmp/rr_checksums.txt" "$SUM_URL" \
      && (cd /tmp && grep " ${RR_FILE}$" rr_checksums.txt | sha256sum -c -); then
      cp "/tmp/${RR_FILE}" "$RR_BIN" && chmod +x "$RR_BIN" && echo "[start] RR installed (pinned v${RR_VERSION})."
      return 0
    else
      echo "[start] Pinned RR download/verify failed, trying latest binary release..."
    fi
  fi

  # Fallback: latest binary repo (no checksum)
  if curl -fsSL -o "$RR_BIN" "https://github.com/roadrunner-server/roadrunner-binary/releases/latest/download/rr-linux-amd64"; then
    chmod +x "$RR_BIN" && echo "[start] RR installed from binary repo (latest)."
    return 0
  fi

  # Final fallback already attempted above

  echo "[start] Failed to install RR; will fallback to artisan serve."
  return 1
}

# Ensure APP_KEY exists
APP_KEY_VAL=$(grep '^APP_KEY=' .env 2>/dev/null | cut -d '=' -f2)
if [ -z "$APP_KEY_VAL" ]; then
  echo "[start] Generating APP_KEY..."
  php artisan key:generate --force
fi

# Run migrations with retries until DB is ready
echo "[start] Running migrations (with retries)..."
ATTEMPTS=0
MAX_ATTEMPTS=20
until php artisan migrate --force; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    echo "[start] Migrations failed after $ATTEMPTS attempts, continuing without fatal exit."
    break
  fi
  echo "[start] DB not ready yet, retrying in 3s ($ATTEMPTS/$MAX_ATTEMPTS)..."
  sleep 3
done

# Ensure writable directories exist and are writable
echo "[start] Ensuring writable directories..."
mkdir -p bootstrap/cache \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs
chmod -R 777 bootstrap/cache storage || true

# Ensure storage symlink exists for public disk
if [ ! -L "public/storage" ]; then
  echo "[start] Creating storage symlink..."
  php artisan storage:link || true
fi

# Try to ensure RR is installed (non-fatal if fails)
install_rr || true

# Start server
# Only start Octane if RR binary exists AND is valid (prints version) and sockets ext is loaded
if { command -v rr >/dev/null 2>&1 || [ -x "$RR_BIN" ]; } \
   && (rr --version >/dev/null 2>&1 || "$RR_BIN" --version >/dev/null 2>&1) \
   && php -m | grep -qi sockets; then
  which rr >/dev/null 2>&1 && echo "[start] rr found at: $(which rr)" || echo "[start] rr found at: $RR_BIN"
  echo "[start] Starting Laravel Octane (RoadRunner) on 0.0.0.0:8000"
  exec php artisan octane:start --server=roadrunner --host=0.0.0.0 --port=8000 --no-interaction
else
  echo "[start] Octane prerequisites not satisfied (rr/sockets). Starting Laravel development server (artisan serve) on 0.0.0.0:8000"
  exec php artisan serve --host=0.0.0.0 --port=8000
fi
