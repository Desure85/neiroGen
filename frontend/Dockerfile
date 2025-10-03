FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

COPY package*.json ./

FROM base AS prod-deps
RUN npm ci --omit=dev

FROM base AS dev-deps
ENV NODE_ENV=development
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/postcss.config.js ./postcss.config.js
COPY --from=builder /app/tailwind.config.js ./tailwind.config.js

USER node
EXPOSE 3000
CMD ["npm", "start"]

FROM mcr.microsoft.com/playwright:v1.47.2-jammy AS dev
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps

COPY . .

USER pwuser
EXPOSE 3000
CMD ["npm", "run", "dev"]
