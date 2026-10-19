# Choons Agent Map

Purpose: fast orientation map for future tasks in this repo.

## 1) Project Snapshot

- Monorepo with two apps:
  - `back/` -> Go API (Gin, GORM, Postgres, minio-go for R2/S3). Spring Boot backend removed 2026-10-18 (same HTTP contract kept)
  - `front/` -> Vue 3 app (Vite, TypeScript, Pinia, Vue Query)
- Primary domain: private/self-hosted music streaming with RBAC (`ADMIN`, `LISTENER`), playlists, album requests, parties, streaming.

## 2) Run/Test Commands

- Root:
  - `make test` -> run backend + frontend tests
  - `make test-back`
  - `make test-front`
  - `make test-watch-front`
  - `make test-verbose`
- Backend (`back/`):
  - `go test ./...` (needs Docker for testcontainers, or set `TEST_DATABASE_URL`; `SKIP_S3_TESTS=1` skips SeaweedFS test)
  - `go run -tags nomsgpack ./cmd/choons` (reads `.env` if present; see `.env.example`)
  - `choons migrate` | `choons create-admin <user> <pass>` | `choons health`
- Frontend (`front/`):
  - `bun install`
  - `bun run dev`
  - `bun run build`
  - `bun run test`

## 3) Repo Layout (High Value)

- `back/`
  - `cmd/choons/main.go` wiring, subcommands, graceful shutdown
  - `internal/config` env parsing (Spring env names kept)
  - `internal/db` GORM open + goose migrations (`migrations/*.sql`); `testdata/hibernate_schema.sql` = pg_dump of legacy schema
  - `internal/model` GORM models (exact legacy tables/columns, e.g. `tracks.r2_key`)
  - `internal/service` business logic (catalog, users, library=requests+favorites, playlists, parties, lyrics)
  - `internal/handler` Gin routes (`router.go`) + contract tests
  - `internal/auth` JWT (jjwt-compatible HS256/384/512), bcrypt, cookie, middleware
  - `internal/httpx` error mapping `{"error":msg}`, Spring-style validation messages, CORS, rate limit
  - `internal/storage` S3 interface, presign, magic-byte checks, `Fake` for tests
  - `internal/party/hub.go` in-memory SSE hub (single instance only)


- `front/src/`
  - `views/` route pages
  - `components/` UI/layout/music/admin components
  - `stores/` Pinia stores (`auth`, `player`, `playlists`, `party`, etc.)
  - `api/` axios modules per domain
  - `router/index.ts` route map + auth guards
  - `main.ts` app bootstrap + session restore
- `front/src/**/*.test.ts` frontend unit/component tests

- `docs/closed-system-hardening-plan.md` security/product hardening plan and known risks
- `TESTS.md` full testing plan (backend + frontend + E2E checklist)

## 4) Backend Endpoint Map (`back/internal/handler/router.go`)

- `/auth` (`/login`, `/logout`, `/register` admin, `/me`) -> `handler/catalog.go` + `service/users.go`
- `/music` (artists, albums (`sort=recent`), tracks, most-played) -> `handler/catalog.go` + `service/catalog.go`; unpaged lists default `size=100` (max 200) — admin UIs use unpaged `/admin/artists|albums|tracks`
- `/stream/:id` (302 to presigned R2 URL), `/stream/:id/played` -> `handler/catalog.go`
- `/media/images/{albums,artists}/:id` (302 presigned), `/public/covers` -> `handler/catalog.go`
- `/playlists` (CRUD + tracks + reorder + visibility; duplicate track add -> 409) -> `handler/library.go` + `service/playlists.go`
- `/favorites` -> `handler/library.go` + `service/library.go`
- `/album-requests` (LISTENER only) + `/admin/album-requests` -> `handler/library.go` + `service/library.go`
- `/admin` listeners/artists/albums/tracks (multipart uploads) -> `handler/catalog.go`, `handler/library.go`
- `/parties` (lifecycle, queue, playback, members, SSE `/:code/events`) -> `handler/party.go` + `service/parties.go` + `party/hub.go`; state carries `revision` (clients drop older) and `playback.queueItemId`; `play` takes optional `queueItemId`, `next` optional `expectedQueueItemId` (no-op if stale)

## 5) Security/Auth Hotspots

- `back/internal/handler/router.go` route groups: public / `RequireUser` / `RequireRole(ADMIN|LISTENER)`; middleware order Recovery -> CORS -> Authenticate (rate limiters per route after CORS)
- `back/internal/auth/middleware.go` token from `Authorization: Bearer` then `CHOONS_AUTH` cookie; user reloaded from DB each request; no query-param tokens
- `back/internal/auth/jwt.go` HS256/384/512 chosen by secret length (jjwt-compatible), 3-day expiry
- `back/internal/httpx/cors.go`, `back/internal/httpx/ratelimit.go` (login 10/min, stream 60/min per IP, TTL eviction)
- `front/src/stores/auth.ts` login/session/user state
- `front/src/api/client.ts` axios base URL, `withCredentials`, global `401` handling

## 6) Frontend Feature Map

- Library/music:
  - Views: `LibraryView.vue`, `ArtistView.vue`, `AlbumView.vue`, `AllAlbumsView.vue`
  - Components: `MusicPlayer.vue`, `TrackRow.vue`
  - Stores/APIs: `stores/player.ts`, `api/artists.ts`, `api/albums.ts`, `api/tracks.ts`
- Playlists:
  - Views: `PlaylistsView.vue`, `PlaylistDetailView.vue`
  - Store/API: `stores/playlists.ts`, `api/playlists.ts`
- Parties:
  - View: `PartiesView.vue`
  - Components: `PartyPanel.vue`, `QueuePanel.vue`, `RightDrawer.vue`
  - Store/API: `stores/party.ts`, `api/parties.ts`
- Admin:
  - Views under `views/admin/` (listeners/artists/albums/album requests/editors)

## 7) Environment + Deployment Notes

- Frontend expects `VITE_API_URL` in `front/.env` (user confirmed; file intentionally not inspected).
- Backend env: see `back/.env.example` (loaded from `back/.env` if present; real env wins). Required:
  - `POSTGRES_URI` (jdbc form accepted) + `POSTGRES_USER`/`POSTGRES_PASS`, or `DATABASE_URL`
  - `JWT_SECRET` (>= 32 bytes, no fallback), `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`
  - optional: `CORS_ALLOWED_ORIGINS`, `AUTH_COOKIE_SECURE`, `R2_BUCKET`, TTLs, rate limits, `ADMIN_USERNAME`/`ADMIN_PASSWORD`
  - optional telemetry: `POSTHOG_KEY` (empty = disabled), `POSTHOG_HOST`, `APP_ENV`, `SLOW_REQUEST_THRESHOLD` (default `1s`)
- Telemetry (PostHog US Cloud): `back/internal/telemetry` middleware (first in chain, replaces `gin.Recovery`) sets `X-Request-ID`, sends 5xx/panics as `$exception`, 4xx (not 401, matched routes only) as `api_request_failed`, slow as `api_request_slow` (SSE/uploads/healthz exempt). Frontend `src/lib/telemetry.ts` (posthog-js, `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST`) captures JS/Vue/router exceptions, network errors, client-side slow requests, audio errors, session replay; sends `X-POSTHOG-SESSION-ID`/`X-POSTHOG-DISTINCT-ID` so backend events link to replays. Netlify proxies `/ingest/*` to PostHog (`front/public/_redirects`).
- Production DB is Supabase (Postgres 17); its schema predates Hibernate (prototype tables `artist_albums`, `artist_tracks`, `schema_migrations` are unused). Backups: `~/Backups/choons/`.
- `netlify.toml` deploys frontend from `front/` with `bun run build-only` and publishes `front/dist`.
- `back/Dockerfile` multi-stage → distroless static (~26MB image, ~10MB RSS idle), healthcheck via `choons health`.
- Streaming/images: backend authorizes then 302s to R2 presigned URL (`STREAM_URL_TTL`, `IMAGE_URL_TTL`); R2 serves Range. Frontend `useAudioEngine` re-requests `/stream/{id}` on media error (expired URL).
- Migrations: goose (`goose_db_version`); `00001` baseline (IF NOT EXISTS), `00002` ON DELETE CASCADE FKs + FK indexes, `00003` normalizes prototype quirks in prod (`playlist_tracks` PK -> `id`, `UNIQUE(artists.name)`).

## 8) Where To Edit By Request Type

- Auth/login/me/roles issues:
  - `back/internal/auth/*`, `back/internal/service/users.go`, `back/internal/handler/router.go`
  - `front/src/stores/auth.ts`, `front/src/api/auth.ts`, `front/src/router/index.ts`
- Streaming/audio playback:
  - `back/internal/handler/catalog.go` (`stream`), `back/internal/storage/storage.go` (presign)
  - `front/src/composables/useAudioEngine.ts` (expired-URL recovery), `front/src/components/layout/MusicPlayer.vue`
  - `front/src/stores/player.ts`, `front/src/api/tracks.ts`
- Uploads/catalog admin:
  - `back/internal/service/catalog.go`, `back/internal/service/upload.go`, `back/internal/storage/media.go` (magic bytes)
  - `front/src/views/admin/*.vue`
- Playlist behavior/reorder/visibility:
  - `back/internal/service/playlists.go`
  - `front/src/views/PlaylistDetailView.vue`, `front/src/stores/playlists.ts`
- Party synchronization/queue/playback:
  - `back/internal/service/parties.go`, `back/internal/party/hub.go`, `back/internal/handler/party.go`
  - `front/src/stores/party.ts`, `front/src/components/layout/PartyPanel.vue`
- Schema changes:
  - add `back/internal/db/migrations/0000N_*.sql` (goose); never AutoMigrate; update `back/internal/model/model.go`

## 9) Test Pointers

- Backend contract tests (real router + Postgres + fake S3): `back/internal/handler/*_test.go`
- Backend service tests: `back/internal/service/*_test.go`
- Migrations vs legacy schemas: `back/internal/db/db_test.go` (`testdata/hibernate_schema.sql`, `testdata/prod_schema.sql`)
- S3 presign/range integration (SeaweedFS testcontainer): `back/internal/storage/s3_test.go`
- Run any suite on clones of a schema-only DB: `TEST_DATABASE_URL=... TEST_DATABASE_TEMPLATE=<db>`
- Frontend store tests: `front/src/stores/__tests__/`
- Frontend component/view tests:
  - `front/src/components/**/__tests__/`
  - `front/src/views/**/__tests__/`
  - `front/src/composables/__tests__/`

## 10) Known Context To Remember

- This repo already contains policy guidance for closed/private deployment in `docs/closed-system-hardening-plan.md`.
- Security-sensitive future changes should check:
  - public route exposure (`/public/**`, media routes)
  - token transport method for streaming
  - JWT secret handling
  - RBAC consistency across backend + router guards
