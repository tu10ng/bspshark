# --- Build backend ---
FROM rust:1.87-bookworm AS backend-builder
WORKDIR /app/backend
COPY backend/ .
RUN cargo build -j 6 --release

# --- Build frontend ---
FROM node:22-bookworm AS frontend-builder
RUN npm install -g pnpm@10
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ .
ENV BACKEND_URL=http://localhost:8080
RUN pnpm build

# --- Runtime ---
FROM node:22-bookworm-slim
WORKDIR /app

COPY --from=backend-builder /app/backend/target/release/backend ./backend
COPY backend/migrations ./migrations/
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

COPY deploy/start-docker.sh ./start.sh
RUN chmod +x ./start.sh backend

EXPOSE 3000 8080
CMD ["./start.sh"]
