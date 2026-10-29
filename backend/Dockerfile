# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json tsconfig*.json ./
RUN npm ci

# Copy source code and prompt assets
COPY src ./src
COPY prompts ./prompts

# Compile TypeScript
RUN npm run build

# --- Production Image ---
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled files and prompts from builder
COPY --from=builder /app/dist ./dist
COPY prompts ./prompts

# Create directory for persistent SQLite database
RUN mkdir -p /app/data

EXPOSE 5000

CMD ["node", "dist/main.js"]
