# Multi-stage build for React + Vite application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy static assets from builder stage
COPY --from=builder /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create a script to replace environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/30-env-replace.sh && \
    echo 'if [ -n "$VITE_SUPABASE_URL" ]; then' >> /docker-entrypoint.d/30-env-replace.sh && \
    echo '  sed -i "s|https://placeholder.supabase.co|$VITE_SUPABASE_URL|g" /usr/share/nginx/html/assets/*.js' >> /docker-entrypoint.d/30-env-replace.sh && \
    echo 'fi' >> /docker-entrypoint.d/30-env-replace.sh && \
    echo 'if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then' >> /docker-entrypoint.d/30-env-replace.sh && \
    echo '  sed -i "s|placeholder-key|$VITE_SUPABASE_ANON_KEY|g" /usr/share/nginx/html/assets/*.js' >> /docker-entrypoint.d/30-env-replace.sh && \
    echo 'fi' >> /docker-entrypoint.d/30-env-replace.sh && \
    chmod +x /docker-entrypoint.d/30-env-replace.sh

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 