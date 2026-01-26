# Seedr Server Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules (sqlite3, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p src/storage/library src/storage/cache src/storage/hls src/storage/thumbs data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "src/index.js"]
