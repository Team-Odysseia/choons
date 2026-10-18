# Favorites Feature Plan

## Overview

Add a song favorites system with a dedicated backend entity, a heart toggle on TrackRow, and a sidebar link to a dedicated Favorites view.

## Architecture Decision

**Dedicated entity** (not auto-created playlist). Separate `favorites` join table with `user_id` + `track_id`. Cleaner API, faster toggling, no playlist overhead.

## Backend (Spring Boot / Java 25)

### 1. Entity: `Favorite.java`

Many-to-many join table `favorites` with `user_id` + `track_id`, composite unique constraint, `@CreationTimestamp`.

### 2. Repository: `FavoriteRepository.java`

Methods: `findByUserId`, `existsByUserIdAndTrackId`, `deleteByUserIdAndTrackId`, `countByUserId`.

### 3. DTO: `FavoriteTrackResponse.java`

Wraps `TrackResponse` with `favoritedAt` timestamp.

### 4. Service: `FavoriteService.java`

Toggle (add/remove), list user favorites, check if favorited.

### 5. Controller: `FavoriteController.java` at `/favorites`

- `GET /favorites` — list all favorited tracks for current user
- `POST /favorites/{trackId}` — add to favorites
- `DELETE /favorites/{trackId}` — remove from favorites
- `GET /favorites/check?trackIds=...` — batch check which tracks are favorited (for TrackRow rendering)

### 6. SecurityConfig

Add `/favorites/**` to authenticated rules.

## Frontend (Vue 3 / Pinia / Tailwind v4)

### 7. API layer: `front/src/api/favorites.ts`

`getFavorites()`, `addFavorite(trackId)`, `removeFavorite(trackId)`, `checkFavorites(trackIds)`.

### 8. Types

Add `FavoriteTrackResponse` to `types.ts`.

### 9. Pinia store: `front/src/stores/favorites.ts`

Holds `Set<string>` of favorited track IDs + `TrackResponse[]` list, `isFavorited(id)`, `toggle(id)`, `fetchFavorites()`, `fetchStatus(trackIds)`.

### 10. Sidebar

Add "Favorites" link with Heart icon in `AppSidebar.vue` below Library, pointing to `/favorites`.

### 11. Route

Add `/favorites` → `FavoritesView.vue` under AppLayout, `shell: 'wide'`.

### 12. View: `FavoritesView.vue`

Lists favorited tracks using `TrackRow` with `showAddToQueue` + `showAddToPlaylist`. Sort by `favoritedAt` desc (newest first).

### 13. TrackRow

Add Heart icon button in the hover action bar (between Play and ListPlus). Filled Heart when favorited (`text-primary`), outline when not. Calls `favorites.toggle()` on click.

### 14. Optimistic UI

Toggle immediately in store, rollback on API failure (toast error).

### 15. Batch status loading

On pages showing multiple tracks (Library, Album, Search, Playlist), call `checkFavorites(trackIds)` to populate the set so hearts render correctly on mount.

## Files to Create

- `back/.../model/music/Favorite.java`
- `back/.../repository/FavoriteRepository.java`
- `back/.../dto/FavoriteTrackResponse.java`
- `back/.../service/FavoriteService.java`
- `back/.../controller/FavoriteController.java`
- `front/src/api/favorites.ts`
- `front/src/stores/favorites.ts`
- `front/src/views/FavoritesView.vue`

## Files to Modify

- `SecurityConfig.java` — add `/favorites/**` rule
- `AppSidebar.vue` — add Favorites nav link
- `router/index.ts` — add `/favorites` route
- `TrackRow.vue` — add Heart toggle button
- `types.ts` — add `FavoriteTrackResponse`
- Views with track lists (Library, Album, Search, Playlist, FavoritesView) — call `fetchStatus` on mount