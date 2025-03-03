FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production image, copy all the files and run the server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create app directory
RUN mkdir -p /app/logs

# Copy from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Set user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
RUN chown -R appuser:nodejs /app
USER appuser

# Expose port
EXPOSE 3003

# Start server
CMD ["node", "src/server.js"]
