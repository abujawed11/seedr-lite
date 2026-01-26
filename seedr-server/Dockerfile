# Seedr Server Dockerfile
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies for native modules (sqlite3, etc.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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

# Health check (busybox wget flags differ on Alpine; use Node instead)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.PORT||5000;const req=http.get({host:'127.0.0.1',port,path:'/health',timeout:5000},(res)=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

# Start the server
CMD ["node", "src/index.js"]
