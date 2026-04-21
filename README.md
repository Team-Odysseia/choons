# Choons

A self-hosted music streaming service.

## Structure

- `back/` — Java Spring Boot backend (Gradle)
- `front/` — Vue 3 + TypeScript frontend (Vite)

## Quick Start

### Backend

```bash
cd back
./gradlew bootRun
```

Requires:
- Java 21+
- PostgreSQL running locally
- Environment variables (see `back/.env.example`)

### Frontend

```bash
cd front
bun install
bun run dev
```

Requires:
- Node 20+ or Bun
- Backend running on `http://localhost:8080`

## Testing

```bash
# Backend
cd back && ./gradlew test

# Frontend
cd front && bun run test
```

## Deployment

- **Frontend**: Configured for Netlify (`netlify.toml`)
- **Backend**: Docker build available (`back/Dockerfile`)
