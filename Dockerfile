# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN chmod -R +x node_modules/.bin
RUN npm run build

# ==========================================
# Stage 2: Build Go Backend (with OpenDAL)
# ==========================================
FROM golang:1.25-bookworm AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
COPY migrations/ migrations/
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ekokan-server ./cmd/server

# ==========================================
# Stage 3: Final Production Runner Image
# ==========================================
FROM ubuntu:24.04 AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy backend binary, migrations, and static frontend dist
COPY --from=backend-builder /app/ekokan-server ./
COPY --from=backend-builder /app/migrations ./migrations
COPY --from=frontend-builder /app/web/dist ./web/dist

# Default environment
ENV PORT=8080
ENV STATIC_DIR=./web/dist
ENV STORAGE_FS_ROOT=/app/data/media

EXPOSE 8080

CMD ["./ekokan-server"]
