FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

# Copy package files and install dependencies with reproducible lockfile
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source code and build
COPY . .
RUN npm run build

# Drop privileges to non-root
USER node

EXPOSE 3000

# Start the application
CMD ["npm", "start"]
