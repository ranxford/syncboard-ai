# SyncBoard AI+ API server.
# Build context must be the REPO ROOT:
#   docker build -f apps/server/Dockerfile -t syncboard-api .
#
# By default it runs against SQLite (mount a volume at
# /app/apps/server/prisma to persist). For PostgreSQL, set DATABASE_URL to a
# postgres:// URL and change the datasource provider in schema.prisma to
# "postgresql" before building.

FROM node:20-alpine
WORKDIR /app

# Install workspace dependencies (manifests first for layer caching).
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
# Prisma schema is needed for the @prisma/client postinstall step.
COPY apps/server/prisma apps/server/prisma
RUN npm ci

# Build the server.
COPY apps/server ./apps/server
RUN npx prisma generate --schema apps/server/prisma/schema.prisma \
  && npm run build --workspace apps/server

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Sync the schema on boot (creates tables for a fresh DB), then start.
CMD ["sh", "-c", "npx prisma db push --schema apps/server/prisma/schema.prisma --skip-generate && node apps/server/dist/index.js"]
