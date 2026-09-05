# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package management files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Generate Prisma client
RUN cd apps/backend && pnpm prisma generate

# Build the application
RUN cd apps/backend && pnpm build

# Stage 2: Production Image
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy necessary files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=builder /usr/src/app/apps/backend/package.json ./apps/backend/
COPY --from=builder /usr/src/app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /usr/src/app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /usr/src/app/packages/shared-types ./packages/shared-types

# Switch to non-root user
USER node

# Expose API port
EXPOSE 4000

# Start command
CMD ["node", "apps/backend/dist/main"]
