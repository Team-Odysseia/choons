# Choons VFD Frontend Revamp: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> On approval, copy this file to `docs/superpowers/plans/2026-10-19-front-vfd-revamp.md` and commit it on the feature branch.

**Goal:** Restyle the whole Vue frontend (`front/`) into the 90s VFD car-head-unit look designed in pen.dev, without changing behaviour, stores, API calls or routes.

**Architecture:**
- Stay on Vue 3 + Vite + Tailwind v4. Nuxt was rejected:
  - the app is a login-only SPA deployed as static files on Netlify, so SSR/SEO buys nothing;
  - SSR would need cookie forwarding for the JWT;
  - migrating would mean rewriting the router guards, `main.ts` bootstrap and 42 test files.
- Build a small VFD component kit in `src/components/vfd/` on top of Reka UI primitives.
- Remap the existing CSS tokens so untouched markup inherits the palette immediately.
- Then rebuild the shell (sidebar, head unit, drawer, dialogs) and each view against the pen.dev frames.
- Logic stays in the existing stores and composables; tasks only change templates and styles, and add presentational components.

**Tech Stack:**
- Vue 3.5, Vite 7, Tailwind 4, Pinia, Vue Query, vue-sonner, lucide-vue-next, Vitest + @vue/test-utils, bun
- New (approved by user):
  - `reka-ui@^2.11`
  - `@fontsource/doto@^5.3`, `@fontsource/michroma@^5.3`, `@fontsource/share-tech-mono@^5.3`
  - `dseg@^0.46`
  - `@vueuse/motion@^3.0`

**Spec:**
- The pen.dev document currently open at `~/.pencil/documents/021401cc-67ba-4702-b681-3c6fa0f278c3/untitled.pen`. Read it only through the pencil MCP tools; `.pen` files are encrypted.
- Boards:
  - `01 Foundations`, `02 Components · Controls`, `03 Components · Display`, `04 Components · Content`, `05 Components · Shell`, `06 Motion`
  - Pages `P01 Login` … `P19 Admin · Album Requests`, `P13 Dialogs`, `P20 States`
- Before Task 1, ask the user to "Save As" the document to `choons/design/choons-vfd.pen`, together with `scanlines.glsl`, `dotgrid.glsl`, `spectrum.js`, `ledbar.js` and `images/`, then commit them.

**Execution:** Native (superpowers:executing-plans) is recommended.
- Tasks 5–9 all consume the Task 2–4 kit, and visual fidelity needs one consistent eye on the pen.dev frames.
- A shipped mistake is cosmetic and reversible, so one whole-branch review at the end is enough.
- The user may pick subagent-driven instead.

## Global Constraints

- Work on branch `feat/front-vfd-redesign`, cut from `dev`. Use bun only (`bun add`, `bun run …`), never npm.
- **Tokens** (exact values from `01 Foundations`):
  - bg `#020405` · glass `#05090B` · panel `#0A0F12` · panel-2 `#10171B` · line `#1A2429`
  - bezel-lo `#0D1114` · bezel-mid `#2B3339` · bezel-hi `#6B767E` · chrome-lo `#5E6870` · chrome-hi `#DCE3E8`
  - cyan `#5CF6E8` · cyan-dim `#2BA89E` · cyan-ghost `#5CF6E81A` · cyan-glow `#5CF6E899` · cyan-wash `#5CF6E80D`
  - amber `#FFB23F` · amber-ghost `#FFB23F1F` · red `#FF4A4A` · red-ghost `#FF4A4A1F` · magenta `#FF4FD8`
  - text `#E8FFFC` · text-muted `#86A9A5` · text-faint `#4D6662`
- **Fonts:**
  - display = Doto 700/800/900
  - label = Michroma 400 (uppercase, letter-spacing 0.15–0.3em)
  - body = Share Tech Mono 400
  - segment digits = DSEG7 Classic Bold, used for time, track number and the knob value
- **Glow:**
  - `glow-sm` = `0 0 8px cyan-glow`
  - `glow-lg` = `0 0 4px cyan-glow, 0 0 18px cyan-glow, 0 0 36px #5CF6E855`
  - Text uses `text-shadow`, boxes use `box-shadow`.
- **Layout:**
  - desktop sidebar 240px; head unit 124px tall (desktop)
  - content max widths stay 1320 (wide) / 860 (form), driven by `route.meta.shell`
- **Copy:** keep every existing user-visible string exactly as it is in the DOM. Uppercase only via CSS `uppercase`, because tests match on text. New decorative copy ("NO DISC", "READING…", flags like CD/ST/HI-FI) is `aria-hidden="true"`. The existing message stays the accessible text.
- **No behaviour changes:**
  - store/composable/API signatures stay untouched
  - existing component props/emits stay compatible
  - party permission rules, toasts and disabled logic are kept verbatim from `MusicPlayer.vue`, `QueuePanel.vue` and `PartyPanel.vue`
- **Spectrum is simulated, never real WebAudio:** no `crossOrigin` on `<audio>`, no AnalyserNode. `/stream/:id` 302-redirects to a presigned R2 URL without CORS.
- **Every animation respects `prefers-reduced-motion: reduce`:** it shows the final frame and stays static.
- **Mobile** (< 768px) adapts the same components:
  - sidebar stays off-canvas
  - head unit becomes two rows (display, then transport + panel keys); knob replaced by a volume key that opens a Reka Popover with a vertical slider
- **Code style** (user's CLAUDE.md):
  - no `as any`/`as unknown`; no `Promise.all`; no `for await`
  - no comments unless essential
  - every new component gets a `__tests__/*.test.ts` alongside it
- **Icons come only from `lucide-vue-next`** (already installed; the pen.dev design uses lucide names). Never hand-write SVG icons or paths. Non-icon visuals use CSS or canvas, never hand-drawn SVG:
  - knob arcs: `conic-gradient` + `mask`
  - CD disc: `conic-gradient`
  - spectrum: canvas
  - LED dots: `border-radius`

  Lucide names used: `shuffle`, `skip-back`, `play`, `pause`, `skip-forward`, `repeat`, `repeat-1`, `list-music`, `mic-vocal`, `users`, `library`, `search`, `heart`, `party-popper`, `send`, `inbox`, `disc-3`, `log-out`, `plus`, `list-plus`, `x`, `pencil`, `trash-2`, `grip-vertical`, `external-link`, `image-plus`, `music`, `globe`, `lock`, `share-2`, `refresh-cw`, `log-in`, `save`, `arrow-left`, `chevron-left`, `chevron-right`, `chevron-down`, `triangle-alert`, `volume-2`, `menu`.
- Commits use conventional style `feat(front): …` / `test(front): …` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Reduced motion:** with `prefers-reduced-motion: reduce`, the marquee, spectrum, boot flicker, CD spin and cover-wall drift are all static. Tests are in Tasks 3, 4 and 9 via a mocked `matchMedia`.
2. **Long titles and names** never break layout. The marquee scrolls only when the text overflows; rows/cards truncate with ellipsis. Tested by `Marquee.test.ts` "does not scroll when text fits" and `TrackRow.test.ts` "truncates long title".
3. **Party non-controller:** transport keys and seek are disabled and keep firing the existing toasts. Volume still works locally. Tested by `MusicPlayer.test.ts` cases, which are kept and extended in Task 7.
4. **Missing artwork** (image 404 or no `albumId`) falls back to the cover placeholder gradient and never shows a broken image icon. Tested by `CoverArt.test.ts` "shows placeholder on error".
5. **Keyboard access:**
   - knob, seek and volume are Reka Sliders: arrows change the value, Home/End go to the limits
   - drawer tabs work with arrow keys
   - dialogs trap focus and Escape closes them
   - focus-visible rings are cyan
   - Tested in `VolumeKnob.test.ts`, `RightDrawer.test.ts`, `BaseDialog.test.ts`.

---

### Task 1: Foundations: deps, fonts, tokens, VFD utilities

**Files:**
- Modify: `front/package.json` (via `bun add reka-ui @fontsource/doto @fontsource/michroma @fontsource/share-tech-mono dseg @vueuse/motion`)
- Modify: `front/src/main.ts`: import the font CSS and `MotionPlugin`
- Modify: `front/src/assets/main.css`: replace the `:root` palette and add `@theme` tokens and utilities
- Create: `front/src/assets/fonts.css`: `@font-face` for DSEG7 Classic Bold from `dseg/fonts/DSEG7-Classic/DSEG7Classic-Bold.woff2` (check the path with `ls node_modules/dseg/fonts` first)
- Create: `front/src/lib/motion.ts`: `export const prefersReducedMotion: Ref<boolean>`, built on `usePreferredReducedMotion` from `@vueuse/core`
- Test: `front/src/lib/__tests__/motion.test.ts`

**Interfaces:**
- **Produces Tailwind theme tokens:** `bg-bg`, `bg-glass`, `bg-panel`, `bg-panel-2`, `border-line`, `text-cyan`, `text-cyan-dim`, `text-amber`, `text-red`, `text-magenta`, `text-fg` (= text), `text-muted`, `text-faint`, `font-display`, `font-label`, `font-body`, `font-seg`.
- **Produces utility classes** in `main.css` (`@utility`):
  - `glow-sm`, `glow-lg`, `glow-amber`, `glow-red`: text-shadow
  - `box-glow`: box-shadow
  - `vfd-well`: glass bg, a `radial-gradient` dot grid at 4px pitch using cyan-ghost, an inset shadow `0 3px 10px #000e`, and a 2px chrome→black border
  - `vfd-scanlines`: `::after` `repeating-linear-gradient(transparent 0 2px, #0000004d 2px 3px)`, pointer-events none
  - `faceplate`: vertical gradient `#07090B`→`#1A2126` plus a chrome top-edge border
  - `chrome-plate`: gradient `chrome-lo`→`#AEB8BF`→`chrome-hi`
  - `led`, `led-on`, `led-amber`, `led-red`: 6px dot plus glow
- **Remapped legacy vars:** `--primary: #5CF6E8`, `--background: #020405`, `--card: #0A0F12`, `--border: #1A2429`, `--destructive: #FF4A4A`, `--ring: #5CF6E8`, `--muted-foreground: #86A9A5`; `--sidebar-w: 240px`; desktop `--player-base-h: 124px`.
- **Produces `prefersReducedMotion`** (from `lib/motion.ts`).

- [ ] **Step 1:** Write `motion.test.ts`: mock `window.matchMedia` returning `matches: true` for `(prefers-reduced-motion: reduce)`, then assert `prefersReducedMotion.value === true`. A second case returns false.
- [ ] **Step 2:** Run `bun run test src/lib/__tests__/motion.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Add the deps, `fonts.css`, the tokens/utilities and `lib/motion.ts`. Register `MotionPlugin` in `main.ts`. Set `body` to `font-body`, bg `#020405`, text `#E8FFFC`.
- [ ] **Step 4:** Run `bun run test`. Expected: all existing tests PASS, because only colours changed.
- [ ] **Step 5:** Run `bun run type-check && bun run build-only`. Expected: success, and `dist/assets` contains the woff2 files for Doto, Michroma, Share Tech Mono and DSEG7.
- [ ] **Step 6:** Commit `feat(front): add VFD tokens, fonts and motion helpers`.

### Task 2: Control primitives (keys, fields, badges, toggle)

**Files:**
- Modify: `front/src/components/ui/button/Button.vue`: keep the `variant`/`size` names. Add `led?: boolean` (default `true` for default/outline/destructive). Add `icon` slot passthrough.
- Modify: `front/src/components/ui/input/Input.vue`, `front/src/components/ui/label/Label.vue`
- Create: `front/src/components/vfd/IconKey.vue`, `VfdBadge.vue`, `CountBadge.vue`, `SegmentedToggle.vue`, `VfdSelect.vue` (Reka `SelectRoot`), `VfdTextarea.vue`, and `index.ts` barrel
- Test: `front/src/components/ui/button/__tests__/Button.test.ts`, `front/src/components/vfd/__tests__/{IconKey,VfdBadge,SegmentedToggle}.test.ts`

**Interfaces:**
- `Button` variant → design mapping:

  | Button variant | Design key (`02 Controls`) | Look |
  |---|---|---|
  | `default` | `Key / Primary` | lit cyan label, cyan LED, cyan-dim border, faint outer glow |
  | `outline` | `Key / Secondary` | muted label, ghost LED |
  | `destructive` | `Key / Danger` | red label + LED |
  | `ghost` | `Key / Ghost` | no fill |
  | `icon` | `Icon Key` | 36px square |

  - `:active` → `Key / Pressed` (translateY 1px, inset shadow, outer glow removed, 90ms)
  - `disabled` → opacity .45, no glow
- `IconKey.vue` props:
  - `{ icon: Component; label: string; lit?: boolean; size?: 28 | 32 | 36 | 40 | 52 | 60; round?: boolean; bare?: boolean; disabled?: boolean }`
  - `label` → `aria-label`; emits `click`
- `VfdBadge.vue` props: `{ tone: 'amber' | 'cyan' | 'red' | 'mute'; label: string; led?: boolean }`
- `CountBadge.vue` props: `{ count: number }`; hidden when 0
- `SegmentedToggle.vue`:
  - props `{ modelValue: string; options: { value: string; label: string; icon?: Component }[] }`
  - emits `update:modelValue`; uses Reka `ToggleGroupRoot` type single
- `Input.vue`:
  - same props/`v-model` as today; well styling: 42px tall, glass background, inset shadow
  - focus: cyan-dim border, glow, and a blinking 9×18 cyan block caret shown via `:focus-within`
  - the native caret becomes `caret-color: transparent` only when not reduced-motion
- `Label.vue`: Michroma 10px, 0.2em tracking, muted; cyan when the sibling input is focused (`:has(+ * :focus)`)

- [ ] **Step 1:** Write the tests:
  - Button: `renders LED dot for default variant`, `no LED when led=false`, `destructive has text-red`, `disabled sets disabled attr and no glow class`
  - IconKey: `uses label as aria-label`, `lit adds glow-sm`
  - VfdBadge: `tone red renders text-red and led-red`
  - SegmentedToggle: `clicking second option emits update:modelValue with its value`
- [ ] **Step 2:** Run `bun run test src/components/ui src/components/vfd`. Expected: new tests FAIL.
- [ ] **Step 3:** Implement the components to `02 Components · Controls` (read the frames with pencil `execute` → `Get(id,{depth:3})`).
- [ ] **Step 4:** Run `bun run test`. Expected: all PASS. If old view tests used Button classes, switch those selectors to `data-testid` or role in the same commit.
- [ ] **Step 5:** Commit `feat(front): VFD keys, fields, badges and toggle`.

### Task 3: Display primitives (readout, marquee, LED bar, spectrum, knob)

**Files:**
- Create in `front/src/components/vfd/`: `Readout.vue`, `Marquee.vue`, `LedBar.vue`, `Spectrum.vue`, `VolumeKnob.vue`, `StatePlate.vue`, `SectionHeader.vue`, `PageHeader.vue`, `CoverArt.vue`
- Create: `front/src/lib/spectrum.ts`
- Modify: `front/src/components/ui/sonner/Sonner.vue`: switch to unstyled toasts with VFD classes; LED colour by type (success cyan, error red, info amber)
- Test: one `__tests__/*.test.ts` per new component, plus `src/lib/__tests__/spectrum.test.ts`

**Interfaces:**
- `simulateLevels(timeMs: number, bars: number, segments: number, seed: number, energy: number): number[]` in `lib/spectrum.ts`
  - deterministic for equal inputs; each value is an integer in `[0, segments]`
  - `energy = 0` → all zeros
  - bands follow the `spectrum.js` curve `0.55 + 0.45*sin(t*1.2π + 0.4)` modulated over time
- `Spectrum.vue`:
  - props `{ active: boolean; bars?: number = 24; segments?: number = 12; mini?: boolean }`
  - draws on a `<canvas>` with `useRafFn`
  - paused when `!active`, when `document.hidden`, or when `prefersReducedMotion`; then it draws one static frame from `simulateLevels(0,…, energy 0.35)`
  - top two segments are magenta, peak caps hold 400ms then fall 1 segment / 50ms; ghost segments use cyan-ghost
  - `aria-hidden="true"`
- `LedBar.vue`:
  - props `{ value: number; segments?: number; tone?: 'cyan' | 'amber'; interactive?: boolean; max?: number; disabled?: boolean; label?: string }`
  - emits `update:value`, `commit`
  - interactive mode = Reka `SliderRoot` with the segmented track drawn behind it; head segment taller
- `Marquee.vue`:
  - props `{ text: string; sub?: string }`
  - measures with `useElementSize` / `useResizeObserver`; adds class `is-scrolling` only when `scrollWidth > clientWidth` and motion is allowed
  - CSS animation: linear at 40px/s, 1.5s initial hold, 48px gap, duplicated text for the loop, paused on hover
- `VolumeKnob.vue`:
  - props `{ modelValue: number /* 0..1 */ }`; emits `update:modelValue`
  - Reka `SliderRoot` (vertical, `step 0.01`) visually replaced by stacked divs:
    - a ghost ring and a lit ring, each a `conic-gradient` from 225° masked to a 2px ring with `radial-gradient` mask; lit sweep = `270*value` deg
    - a radial-gradient knob body
    - a pointer dot rotated with `transform: rotate()`
    - no SVG
  - wheel ±0.05; caption "VOL" plus a DSEG value 0–100
- `Readout.vue`: props `{ caption: string; value: string; tone?: 'cyan' | 'amber' | 'red'; size?: 'sm' | 'md' | 'lg'; seg?: boolean }`. `seg` uses the DSEG font.
- `StatePlate.vue`: props `{ code: string; message: string; kind?: 'empty' | 'loading' | 'error' }`. The code is `aria-hidden`; the message is a `<p>`. Loading blinks the code.
- `SectionHeader.vue`:
  - props `{ title: string; count?: number; seeAll?: boolean; arrows?: boolean; expanded?: boolean }`
  - emits `see-all`, `prev`, `next`
  - keeps existing button texts "See all" / "Show less" (uppercased via CSS)
- `PageHeader.vue`: props `{ kicker: string; title: string }`; renders an `<h1>` holding the title.
- `CoverArt.vue`: props `{ src?: string; alt: string; size?: number; round?: boolean }`. On `error`, or when there is no src, it shows the placeholder gradient `linear-gradient(200deg,#123B3A,#0A1114)`.

- [ ] **Step 1:** Write the tests:
  - spectrum: `same inputs give same output`, `energy 0 is all zeros`, `values within 0..segments`
  - Marquee: `does not scroll when text fits`, `scrolls when overflowing` (stub element sizes), `never scrolls with reduced motion`
  - VolumeKnob: `ArrowUp increases value by 0.01`, `End sets 1`, `lit arc sweep reflects value`
  - LedBar: `lit segment count = round(value*segments)`, `interactive emits commit on pointerup`
  - StatePlate: `code is aria-hidden and message is a paragraph`
  - CoverArt: `shows placeholder on error`
  - Spectrum: `does not start raf when inactive`
- [ ] **Step 2:** Run `bun run test src/components/vfd src/lib`. Expected: FAIL.
- [ ] **Step 3:** Implement against `03 Components · Display`.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): VFD display components and simulated spectrum`.

### Task 4: Content components (cards and rows)

**Files:**
- Create in `front/src/components/music/`: `AlbumCard.vue`, `PlaylistTile.vue`, `ArtistCard.vue`, `SongCard.vue`, `TrackListHeader.vue`, `PlaylistRow.vue`, `RequestCard.vue`
- Create: `front/src/components/admin/AdminRow.vue`, `front/src/components/admin/EditTrackRow.vue`
- Modify: `front/src/components/music/TrackRow.vue` (same props/emits), `front/src/components/admin/ImageUpload.vue` (same API), `front/src/components/music/AddToPlaylistDialog.vue` (template only)
- Test: `__tests__` files for every new or modified component

**Interfaces:**
- `AlbumCard`:
  - props `{ album: Album; meta?: string; isNew?: boolean }`; emits `play`; root is a `RouterLink` to `{ name: 'album', params: { id } }`
  - hover: the CD (`conic-gradient` iridescent disc with a 14% hole) translates 56px right in 220ms `cubic-bezier(.2,.8,.2,1)` and spins at 8s/rev, unless reduced motion
- `PlaylistTile`: props `{ playlist: Playlist; owner?: string }`
- `ArtistCard`: props `{ artist: Artist }`
- `SongCard`: props `{ track: Track }`; emits `play`
- `TrackRow`:
  - unchanged public API
  - the playing state swaps the index for `<Spectrum mini :active="isPlaying" bars=4 segments=5>`, gets a 2px cyan left rule and the cyan-wash background
  - title uses `truncate`
- `PlaylistRow`: props `{ playlist: Playlist; deletable: boolean }`; emits `delete`
- `RequestCard`:
  - props `{ request: AlbumRequest; requester?: string }`
  - slot `actions`; status → badge tone `PENDING` amber, `ACCEPTED` cyan, `REJECTED` red
- `AdminRow`: props `{ primary: string; secondary?: string; thumb?: string; round?: boolean; blocked?: boolean }`; emits `edit`, `delete`
- `EditTrackRow`: props `{ index: number; title: string; lyricsId?: number | null; duration?: number; showLyrics?: boolean }`; emits `update:title`, `update:lyricsId`, `remove`
- Read model types from `front/src/api/types.ts`; do not add fields.

- [ ] **Step 1:** Write the tests:
  - AlbumCard: `links to album route`, `shows NEW badge when isNew`
  - TrackRow: `playing row renders Spectrum instead of index`, `truncates long title` (has `truncate` class), `existing emits unchanged` (port the old cases)
  - RequestCard: `PENDING uses amber badge`, `renders actions slot`
  - AdminRow: `emits delete on trash key`
  - EditTrackRow: `emits update:title on input`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement against `04 Components · Content`.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): VFD cards and rows`.

### Task 5: Shell: layout, sidebar, dialogs, search dialog

**Files:**
- Modify: `front/src/components/layout/AppLayout.vue`: grid and VFD background (`bg` plus a radial cyan wash at the top)
- Modify: `front/src/components/layout/AppSidebar.vue`: chrome brand plate "CHOONS" + "VFD-1440 · DIGITAL AUDIO"; SOURCE group; ADMIN group with an amber label; footer with user LED, LOG OUT ghost key, version line
- Modify: `front/src/components/ui/dialog/BaseDialog.vue`: rebuild on Reka `DialogRoot` / `DialogPortal` / `DialogOverlay` / `DialogContent`; keep the current props/emits; faceplate frame; header LED + Doto title; ✕ IconKey
- Delete: `front/src/composables/useFocusTrap.ts` and its test, but only if nothing else imports it (check with grep first)
- Test: update `components/layout/__tests__/AppSidebar.test.ts`; add `ui/dialog/__tests__/BaseDialog.test.ts`

**Interfaces:**
- `SourceButton.vue` (new, `components/layout/`): props `{ to?: RouteLocationRaw; icon: Component; label: string; active: boolean; count?: number }`; emits `click`.
- The active route lights the LED, label and icon (cyan + glow) and gets the bezel gradient background.
- The sidebar search item keeps opening the existing search dialog, restyled as in `P06b Search Dialog`.
- The dialog API is unchanged for every caller: `AddToPlaylistDialog`, the Playlists delete dialog, and the admin dialogs.

- [ ] **Step 1:** Write the tests:
  - AppSidebar: `marks current route source as active`, `shows admin group only for admins`, `requests badge shows unseen count`
  - BaseDialog: `Escape emits close`, `focus moves into dialog on open`, `renders title in heading`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement against `05 Components · Shell` and `P06b Search Dialog`.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): VFD shell, sidebar and dialogs`.

### Task 6: Right drawer panels

**Files:**
- Modify: `front/src/components/layout/RightDrawer.vue` (Reka `TabsRoot`), `QueuePanel.vue`, `LyricsPanel.vue`, `PartyPanel.vue`
- Create: `front/src/components/layout/QueueRow.vue`
- Test: update the existing `QueuePanel` / `LyricsPanel` / `PartyPanel` tests; add `RightDrawer.test.ts`

**Interfaces:**
- **Drawer:** 340px wide; tab keys QUEUE/LYRICS/PARTY with no icons, as fixed in the design; slide in from x+340 over 260ms (`v-motion` or `<Transition>`).
- **QueuePanel:**
  - "N tracks" in Doto plus the CLEAR ghost key (solo) or a PARTY QUEUE amber badge (party)
  - non-controllers get a dimmed grip, no remove button, and an amber lock note
  - vuedraggable stays as is
- **LyricsPanel:**
  - inactive lines: Share Tech Mono 15px, faint; past lines at opacity .55
  - active line: Doto 800 22px cyan glow-lg, swapping in over 150ms
  - auto-scroll keeps the active line centred
- **PartyPanel:** invite code readout (amber, DSEG off, Doto), user cards with role badges, MAKE DJ / REMOVE DJ (secondary) and KICK (danger), full-width END PARTY / LEAVE PARTY.

- [ ] **Step 1:** Write the tests:
  - RightDrawer: `ArrowRight moves to next tab`, `party tab hidden when not in party`
  - QueuePanel: `non-controller sees lock note and no remove buttons`
  - LyricsPanel: `active line has aria-current="true"`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement against `P12a`–`P12d`.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): VFD right drawer panels`.

### Task 7: Head unit (MusicPlayer)

**Files:**
- Modify: `front/src/components/layout/MusicPlayer.vue`: template rewrite only; `<script setup>` logic, handlers and toasts kept
- Create: `front/src/components/layout/HeadUnitFlags.vue`
- Create: `front/src/lib/level.ts` with `volumeToDb(volume: number): string`
- Test: extend `components/layout/__tests__/MusicPlayer.test.ts`; add `lib/__tests__/level.test.ts`

**Interfaces:**
- **Desktop layout** (`05 Shell · Head Unit`):
  - transport: shuffle `IconKey` lit when shuffled; prev; 60px round play/pause; next; loop with icon `Repeat` / `Repeat1`, lit when not off
  - display window `vfd-well vfd-scanlines` containing:
    - `CoverArt` 84px with src `/media/images/albums/{albumId}`, built with the existing helper in `src/api/albums.ts` if there is one, otherwise `${VITE_API_URL}/media/images/albums/${id}`
    - the flags row
    - the `Marquee` text `TITLE · ARTIST · ALBUM`
    - an interactive `LedBar` for seek
    - `Readout`s for TRACK (queue index + 1, DSEG) and LEVEL (`volumeToDb`)
    - `Spectrum :active="player.isPlaying"`
  - panel keys QUEUE/LYRICS/PARTY (lit when the matching drawer tab is open; PARTY only when in a party)
  - `VolumeKnob v-model="player.volume"` wired to `player.setVolume`
- **Flags** (`HeadUnitFlags` props `{ hifi: boolean; shuffle: boolean; repeat: boolean; party: boolean; hasTrack: boolean }`): CD, ST, HI-FI (amber), SHF, RPT, PARTY (amber); unlit flags use ghost colours; `aria-hidden`.
- **No track:** marquee "NO DISC" (dim), seek empty, readouts `--`, spectrum inactive, transport opacity .4 (the visual for the existing disabled state).
- **Party non-controller:** transport opacity .35; the PARTY flag lights.
- **Track change:** the TRACK readout shows ghost `88` for 90ms when `player.currentTrack?.id` changes, then the new number (skipped with reduced motion).
- **Mobile < 768px:**
  - row 1: hamburger, cover, marquee, QUEUE/LYRICS/PARTY icon keys
  - row 2: transport, then a volume IconKey opening a Reka `PopoverRoot` with a vertical `LedBar` slider
  - row 3: LedBar seek
- **`volumeToDb`:** `0` → `"-∞dB"`; `1` → `"0dB"`; otherwise `Math.round(20*log10(v))+"dB"`.

- [ ] **Step 1:** Write the tests. Keep all existing MusicPlayer cases and update their selectors to roles/aria-labels. Add:
  - `shows NO DISC when no track`
  - `knob ArrowUp calls setVolume`
  - `party non-controller seek shows existing toast`
  - `track readout shows queue position`
  - level: `0 gives -∞dB`, `1 gives 0dB`, `0.5 gives -6dB`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): VFD head unit player`.

### Task 8: Listener views

**Files:**
- Modify: `front/src/views/LoginView.vue`, `LibraryView.vue`, `AllAlbumsView.vue`, `ArtistView.vue`, `AlbumView.vue`, `SearchView.vue`, `FavoritesView.vue`, `PlaylistsView.vue`, `PlaylistDetailView.vue`, `AlbumRequestsView.vue`, `PartiesView.vue`
- Test: update the matching `src/views/__tests__/*.test.ts`. Replace brittle class selectors (`.swiper-track`, `.row`, `.text-sm.font-medium`, `span.text-[11px]`, `form.create-layout`, `.flex.items-center.gap-2`) with `data-testid`.

**Interfaces** (pattern per view):
- Use `PageHeader` (kicker `SOURCE · X`), `SectionHeader`, the Task 4 cards/rows, and `StatePlate` for each loading/empty/error branch.
- Codes come from `P20 States`; the message is the existing string.
- Per-view specifics, matched to frames `P01`–`P11`:
  - **Login:**
    - the drifting cover wall stays (rows alternate ±18px/s; static with reduced motion) under a radial vignette and scanlines
    - centre "power unit" faceplate: chrome brand plate, POWER LED, display "SIGN IN" + "INSERT CREDENTIALS TO CONTINUE_", the fields, a full-width SIGN IN key
    - keep `#username` / `#password` ids
  - **Library:** sections in the order Your Playlists → Recently Added (carousel arrows) → Community Playlists → Most Played → Artists + LOAD MORE ARTISTS; 5 cards per row on desktop.
  - **Album:** a cover stack with the disc peeking out by 96px; Doto title; artist link plus "· year · N tracks · M min" (M = sum of track durations); PLAY ALL / SHUFFLE / ADD TO QUEUE / + keys, with party visibility rules kept.
  - **Artist:** a hero in `vfd-well` with a chrome avatar ring, ARTIST amber kicker, name, bio, and readouts ALBUMS (album count) and TRACKS only if the API already gives it, otherwise omit. No invented data.
  - **Search:** a query field plus SEARCH key plus a HITS readout (sum of section counts); 4 sections with see-all toggles.
  - **Playlists:** inline new-playlist form in a `vfd-well` with a cyan border; rows; delete via BaseDialog.
  - **PlaylistDetail:** owner controls (`SegmentedToggle` Public/Private, INTERNAL SHARED amber ghost key) in the kicker row.
  - **AlbumRequests / Parties:** form shell 860; faceplate panels.
  - **Parties:** the active party panel has an amber border, a LIVE red LED, and the invite readout.

- [ ] **Step 1:** Update each view test: new `data-testid` selectors, plus one new assertion per view that the empty branch renders a `StatePlate` with the existing message (e.g. FavoritesView `empty state shows "No favorites yet. Heart a song to add it here."`).
- [ ] **Step 2:** Run `bun run test src/views`. Expected: FAIL only on the new assertions.
- [ ] **Step 3:** Implement the views one at a time. Commit after each view or pair: `feat(front): VFD <view> view`.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.

### Task 9: Admin views

**Files:**
- Modify: `front/src/views/admin/AdminListenersView.vue`, `AdminArtistsView.vue`, `AdminArtistEditView.vue`, `AdminAlbumsView.vue`, `AdminAlbumEditView.vue`, `AdminAlbumRequestsView.vue`
- Test: update `src/views/admin/__tests__/*.test.ts` (`form.admin-form` → `data-testid="admin-form"`)

**Interfaces:**
- Header row: `PageHeader` (kicker `ADMIN · X`), a TOTAL readout (list length, 3-digit pad), and the primary add key.
- Search row: field, SEARCH secondary, CLEAR ghost.
- Lists use `AdminRow` / `RequestCard`.
- Edit pages use the faceplate form, `ImageUpload`, `EditTrackRow` tables, the audio drop zone and the amber upload `LedBar` with %.
- Add Album dialog: two columns in a 1120px-wide `BaseDialog`, as in `P17b`.

- [ ] **Step 1:** Update the tests. Add `AdminAlbumRequestsView` `blocked requester shows BLOCKED badge and UNBLOCK key`.
- [ ] **Step 2:** Run them. Expected: FAIL on the new case.
- [ ] **Step 3:** Implement against `P14`–`P19` and `P13 Dialogs`.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): VFD admin views`.

### Task 10: Motion polish and boot sequence

**Files:**
- Create: `front/src/components/layout/BootScreen.vue`; mount it in `front/src/App.vue`
- Modify: `front/src/components/ui/sonner/Sonner.vue` (toast enter); `BaseDialog.vue` (scale 0.96→1 + fade over 180ms, backdrop blur 6px)
- Test: `components/layout/__tests__/BootScreen.test.ts`

**Interfaces:**
- **BootScreen:** full-screen bg showing the sequence: ALL ON `88:88 888` (140ms) → OFF (60ms) → flicker (80ms) → types `CHOONS` at 40ms/char → READY → fades out.
- It runs once per tab session (`sessionStorage['choons:booted']`), only after login (`auth.isAuthenticated`), and is skipped entirely with reduced motion.
- Timing comes from `06 Motion`.

- [ ] **Step 1:** Write the tests: `renders nothing when already booted this session`, `renders nothing with reduced motion`, `sets session flag after finishing` (fake timers, advance 1200ms).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `bun run test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(front): boot sequence and motion polish`.

### Task 11: Verification pass

- [ ] **Step 1:** Run `bun run test && bun run type-check && bun run build-only`. Expected: all green.
- [ ] **Step 2:** Run `bun run dev` with the backend from `back/`. Note that `back/.env` targets **PROD Supabase**, so use local docker-compose Postgres, or only read data.
- [ ] **Step 3:** Load each route at 1440×1024 in the pen.dev browser tool or Chrome. Compare with the matching `P0x` frame: palette, fonts loaded (no fallback mono), glow, scanlines, marquee only on overflow, spectrum animates only while playing.
- [ ] **Step 4:** Mobile check at 390×844: off-canvas sidebar, two-row head unit, volume popover, drawer full width.
- [ ] **Step 5:** Turn on OS reduced motion and recheck: no marquee scroll, static spectrum, no boot screen, no CD spin.
- [ ] **Step 6:** Keyboard-only pass: Tab through the sidebar, the head unit (knob and seek arrows), the drawer tabs and a dialog (Escape).
- [ ] **Step 7:** Update `AGENT_MAP.md` section 6 with the new `components/vfd/` kit, and commit `docs: note VFD component kit`.
