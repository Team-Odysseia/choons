# Choons Closed-System Product + Hardening Plan

_Last updated: 2026-04-06_

## Context (Authoritative)

- Choons is a **closed** self-hosted streaming platform.
- Songs/catalog must **not** be publicly accessible.
- Access is only for authenticated accounts.
- **Only ADMIN** can create accounts.

This plan prioritizes security, governance, and internal-user experience over public/social growth features.

---

## Goals

1. Enforce strict private access on all media and metadata routes.
2. Remove any public/external sharing patterns that conflict with closed deployment.
3. Reduce token/secrets exposure risk.
4. Improve maintainability and scale readiness (especially parties + playback sync).
5. Add high-value internal features for admins/listeners.

---

## Current-State Snapshot (What already exists)

- Backend: Spring Boot API with auth, admin CRUD, streaming, playlists, album requests, parties, lyrics, rate-limiting.
- Frontend: Vue 3 + Pinia + Vue Query player app with admin views, queues, lyrics, party panel.
- Strong base capabilities already present: RBAC (`ADMIN`/`LISTENER`), streaming with range support, admin library tools, request workflow, party queue/playback controls.

---

## P0 - Immediate Security + Policy Alignment

### 1) Remove public content exposure

- Tighten access rules in `back/src/main/java/dev/odysseia/choons/config/SecurityConfig.java`.
- Remove public access to `"/public/**"` and media image routes unless explicitly required.
- Ensure album/artist images are authenticated-only in a closed deployment.
- Reassess `PublicController` (`/public/covers`) used by login page background.

### 2) Remove public/share semantics from playlists

- UI currently generates a share link (`/p/:id`) in `front/src/views/PlaylistDetailView.vue`, but no route exists.
- Remove share-link UX and wording that implies internet/public exposure.
- Decide one consistent model:
  - **Private-only**: playlist visible to owner (and optionally admins).
  - **Internal shared**: visible to authenticated users only, renamed to avoid “public” confusion.

### 3) Remove JWT in query string for streaming

- Frontend uses URL token query for `/stream`.
- Backend accepts token query fallback.
- Replace with safer auth transport (header/cookie-compatible strategy) to prevent leakage in logs/history/referrers.

### 4) Enforce required JWT secret

- Remove default fallback secret from backend config.
- Fail startup when `JWT_SECRET` is missing/weak.
- Rotate secrets in deployed environments as needed.

### 5) Harden error handling output

- Generic exception responses should not expose exception class/messages.
- Return stable error envelope (safe message + code), keep detail in server logs.

---

## P1 - Governance + Reliability

### 6) Replace schema drift with migrations

- Migrate from `ddl-auto=update` + runtime patch runner to Flyway/Liquibase.
- Create baseline and versioned migrations for repeatable deployments.

### 7) Strengthen admin-only account lifecycle

- Keep admin-only registration and add:
  - password policy checks,
  - account disable/enable,
  - forced password reset,
  - token/session revocation.
- Add audit events for account CRUD and credential changes.

### 8) Standardize request validation

- Apply validation annotations consistently across DTOs.
- Use `@Valid` consistently in controllers.
- Return structured field-level validation errors.

### 9) Fix playlist and queue integrity edge cases

- Enforce full ID set validation on playlist reorder.
- Validate duplicates/omissions explicitly before saving positions.
- Add transactional safety and guard rails around ordering updates.

### 10) Track upload transaction safety

- Prevent orphaned DB rows with `pending` keys when object storage upload fails.
- Use atomic flow/rollback strategy and clear failure handling.

---

## P2 - Scale + Maintainability

### 11) Move party sync off 1s polling

- Current party state polling every second is expensive at scale.
- Introduce WebSocket/SSE for party state, queue, playback, and member updates.
- Keep polling as fallback only.

### 12) Split oversized party domain service

- Refactor `PartyService` into focused services:
  - membership/lifecycle,
  - queue,
  - playback state,
  - response assembly.
- Improves testability and reduces regression risk.

### 13) Improve observability and auditability

- Add structured logs + correlation IDs.
- Add admin audit trail views for sensitive actions.
- Add operational dashboards (failed logins, stream errors, queue failures, upload failures).

### 14) Add pagination + filtering before data growth hurts

- Paginate artists/albums/tracks/playlists in API and UI.
- Add indexed search endpoints for internal library navigation.

---

## P3 - Internal Product Features (Closed-System Friendly)

### Listener experience

- Global search (artist/album/track/playlist) with keyboard shortcuts.
- Queue persistence across refresh/session.
- Crossfade/gapless/replay-gain options.
- Better recommendation surfaces from internal stream data.

### Party experience

- Bulk add to party queue (single API call) instead of N sequential calls.
- Party history and recovery if host reconnects.
- Better party permission UX (DJ-only cues, disabled-state explanations).

### Admin experience

- Internal analytics dashboard (top tracks, listener activity, request throughput).
- Library duplicate detection and metadata quality checks.
- Import pipeline (folder scan/tag parse/manual reconciliation).

---

## Features To Deprioritize (Given Closed Policy)

- Public profile pages.
- Internet share links.
- Anonymous/public catalog browsing.
- Public playlist routes and SEO/public landing behavior.

---

## Concrete Problems/Risks Identified During Review

1. Public routes in security config conflict with closed-system requirement.
2. Share URL path generated in UI does not exist in router and conflicts with policy.
3. Token-in-query approach for streaming is high-risk for leakage.
4. Default JWT fallback secret is unsafe for production.
5. Generic exception handler leaks implementation details.
6. Runtime schema patch + `ddl-auto=update` increases migration drift risk.
7. 1-second party polling can become expensive quickly.
8. Party service is monolithic and difficult to maintain.
9. Party queue drag is disabled broadly in current panel behavior.
10. Album-to-party queue adds tracks sequentially (performance and reliability issue).
11. Track upload flow can leave partial/orphaned persisted state on storage failure.
12. Playlist reorder path needs stricter input completeness validation.
13. `.gitignore` is minimal and `front/.env` is tracked (secret hygiene concern).
14. Party backend/frontend test coverage appears incomplete relative to feature complexity.

---

## Refactor Themes (Cross-Cutting)

- Constructor injection instead of field injection for services/controllers.
- Unified error model and shared response envelope.
- Domain service boundaries over god-service growth.
- Migration-first DB evolution strategy.
- Centralized auth/session/security utilities.
- Consistent query/state strategy in frontend (Pinia + Vue Query boundaries).

---

## Suggested Delivery Order

1. **Sprint 1 (P0)**: strict access hardening + token/secrets cleanup.
2. **Sprint 2 (P1)**: migrations, validation standardization, account governance.
3. **Sprint 3 (P2)**: party sync architecture + service decomposition.
4. **Sprint 4 (P3)**: closed-system product enhancements.

---

## Definition of Done for Closed-System Compliance

- No audio/media/catalog route is accessible without valid authentication.
- No external/public sharing path is exposed in UI or API.
- Account creation remains admin-only, with audit logs.
- Secrets are mandatory and never default insecurely.
- Authentication tokens are not transported in URL query params.
- Error responses reveal no sensitive internals.
