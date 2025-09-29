# Multi-stage build for Laravel
FROM php:8.3-cli-alpine

# Install dependencies for PHP
RUN apk add --no-cache \
    $PHPIZE_DEPS \
    linux-headers \
    postgresql-dev \
    redis \
    libzip-dev \
    libxml2-dev \
    curl-dev \
    oniguruma-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    && docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd zip sockets \
    && apk del --no-cache $PHPIZE_DEPS || true

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# (Optional) RoadRunner could be vendored into the image later. Offline-safe build.
# start.sh will detect rr binary if present and run it, otherwise fallback to PHP built-in server.

# Set working directory
WORKDIR /var/www

# Copy entire application (including vendor) to avoid network install during build
COPY app/ .
# Copy env (for key generation on start)
COPY app/.env .env

# Add start script
COPY scripts/start.sh /usr/local/bin/start.sh
RUN set -eux; \
    chmod +x /usr/local/bin/start.sh && chmod +x artisan; \
    apk add --no-cache curl

# Create non-root user and set ownership
RUN set -eux; \
    addgroup -g 1000 www; \
    adduser -D -G www -u 1000 www; \
    chown -R www:www /var/www

USER www

EXPOSE 8000

# Run init and start via bash script (composer scripts + artisan run here)
CMD ["sh", "/usr/local/bin/start.sh"]
