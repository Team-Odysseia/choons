# Choons

A self-hosted music streaming service.

## Structure

- `back/` — Go backend (Gin, GORM, PostgreSQL, Cloudflare R2 / any S3-compatible storage)
- `front/` — Vue 3 + TypeScript frontend (Vite)

## Quick Start

### Backend

```bash
cd back
cp .env.example .env   # fill in database, JWT and R2 values
make -C .. run-back    # or: go run -tags nomsgpack ./cmd/choons
```

Requires:
- Go 1.26+
- PostgreSQL (migrations run automatically on startup)
- An S3-compatible bucket (Cloudflare R2 in production)

Subcommands:

```bash
choons                                   # serve (default)
choons migrate                           # apply migrations and exit
choons create-admin <username> <password>
choons health                            # used by the Docker healthcheck
```

Audio and images are served by redirecting to short-lived presigned R2 URLs, so the backend never proxies media bytes.

### Frontend

```bash
cd front
bun install
bun run dev
```

Requires:
- Bun
- Backend running on `http://localhost:8080`

## Testing

```bash
# Backend (needs Docker for Postgres/S3 testcontainers, or set TEST_DATABASE_URL; SKIP_S3_TESTS=1 skips the S3 test)
cd back && go test ./...

# Frontend
cd front && bun run test

# Both
make test
```

## Deployment

- **Frontend**: Netlify (`netlify.toml`)
- **Backend**: `back/Dockerfile` builds a ~26 MB distroless image (~10 MB RAM idle). Run a single instance: party live updates (SSE) are held in memory.
