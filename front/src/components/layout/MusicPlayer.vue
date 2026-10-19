<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { usePlayerStore } from '@/stores/player'
import { useDrawerStore } from '@/stores/drawer'
import { usePartyStore } from '@/stores/party'
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Volume2, ListMusic, MicVocal, Menu, Users } from 'lucide-vue-next'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { useMediaQuery } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { CoverArt, IconKey, LedBar, Marquee, Readout, Spectrum, VolumeKnob } from '@/components/vfd'
import { albumImageUrl } from '@/api/albums'
import { formatDuration } from '@/lib/format'
import { volumeToDb } from '@/lib/level'
import { prefersReducedMotion } from '@/lib/motion'
import HeadUnitFlags from './HeadUnitFlags.vue'

const player = usePlayerStore()
const drawer = useDrawerStore()
const party = usePartyStore()

const progressPercent = computed(() =>
  player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0,
)
const desktop = useMediaQuery('(min-width: 768px)')
const keySize = computed(() =>
  desktop.value ? { side: 34, skip: 40, play: 60, panel: 32 } : { side: 30, skip: 34, play: 48, panel: 28 },
)
const track = computed(() => player.currentTrack)
const cover = computed(() => (track.value?.album.coverUrl ? albumImageUrl(track.value.album.id) : null))
const marqueeText = computed(() =>
  track.value ? `${track.value.title} · ${track.value.artist.name} · ${track.value.album.title}` : '',
)
const trackBlank = ref(false)
const trackNumber = computed(() => {
  if (!track.value || player.currentIndex < 0) return '--'
  return trackBlank.value ? '88' : String(player.currentIndex + 1).padStart(2, '0')
})
const level = computed(() => volumeToDb(player.volume))
const playDisabled = computed(() => !player.currentTrack || (party.inParty && !party.canControl))
const seekDisabled = computed(() => party.inParty && !party.canControl)
const loopLabel = computed(() =>
  player.loopMode === 'none' ? 'Loop off' : player.loopMode === 'queue' ? 'Loop queue' : 'Loop track',
)

let blankTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => player.currentTrack?.id,
  (id, previous) => {
    if (!id || !previous || prefersReducedMotion.value) return
    trackBlank.value = true
    clearTimeout(blankTimer)
    blankTimer = setTimeout(() => {
      trackBlank.value = false
    }, 90)
  },
)

onBeforeUnmount(() => clearTimeout(blankTimer))

const prevDisabled = computed(() =>
  party.inParty ? !party.canControl || !party.state?.playback.track : !player.hasPrev,
)
const nextDisabled = computed(() =>
  party.inParty ? !party.canControl || !party.state?.playback.track : !player.hasNext,
)

function onSeek(val: number) {
  const nextPos = (val / 100) * player.duration
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    void party.seek(nextPos)
    return
  }
  player.seek(nextPos)
}

function onVolume(value: number) {
  player.setVolume(value)
}

function openPanel(panel: 'queue' | 'lyrics' | 'party') {
  drawer.toggle(panel)
}

function onPrev() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    void party.prev()
    return
  }
  player.playPrev()
}

function onNext() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    void party.next()
    return
  }
  player.playNext()
}

function onTogglePlay() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    const playback = party.state?.playback
    if (!playback?.track) return
    if (player.isPlaying) {
      void party.pause(player.currentTime)
    } else {
      void party.play(playback.track.id, player.currentTime, playback.queueItemId)
    }
    return
  }
  player.togglePlay()
}
</script>

<template>
  <footer
    class="faceplate relative col-[1/2] row-start-2 overflow-hidden shadow-[0_-8px_24px_#000000cc] md:col-[1/3]"
    style="padding-bottom: var(--safe-area-bottom); min-height: var(--player-h)"
  >
    <div class="flex h-full flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2.5 md:flex-nowrap md:gap-[22px] md:px-6 md:py-3.5">
      <IconKey
        data-testid="menu-btn"
        :icon="Menu"
        label="Open menu"
        bare
        :size="32"
        class="order-1 md:hidden"
        @click="drawer.toggleSidebar()"
      />

      <div class="order-3 flex w-full items-center gap-1 md:order-1 md:w-auto md:gap-2.5">
        <IconKey
          data-testid="shuffle-btn"
          :icon="Shuffle"
          label="Shuffle"
          :lit="player.isShuffled"
          :size="keySize.side"
          @click="player.toggleShuffle()"
        />
        <IconKey data-testid="prev-btn" :icon="SkipBack" label="Previous track" :size="keySize.skip" :disabled="prevDisabled" @click="onPrev" />
        <IconKey
          data-testid="play-btn"
          :icon="player.isPlaying ? Pause : Play"
          :label="player.isPlaying ? 'Pause' : 'Play'"
          lit
          round
          :size="keySize.play"
          class="play-key"
          :disabled="playDisabled"
          @click="onTogglePlay"
        />
        <IconKey data-testid="next-btn" :icon="SkipForward" label="Next track" :size="keySize.skip" :disabled="nextDisabled" @click="onNext" />
        <IconKey
          data-testid="loop-btn"
          :icon="player.loopMode === 'track' ? Repeat1 : Repeat"
          :label="loopLabel"
          :lit="player.loopMode !== 'none'"
          :size="keySize.side"
          @click="player.cycleLoop()"
        />

        <div class="ml-auto flex items-center gap-1 md:hidden">
          <IconKey :icon="ListMusic" label="Queue" bare :size="keySize.panel" :lit="drawer.activePanel === 'queue'" @click="openPanel('queue')" />
          <IconKey :icon="MicVocal" label="Lyrics" bare :size="keySize.panel" :lit="drawer.activePanel === 'lyrics'" @click="openPanel('lyrics')" />
          <IconKey v-if="party.inParty" :icon="Users" label="Party" bare :size="keySize.panel" :lit="drawer.activePanel === 'party'" @click="openPanel('party')" />
          <PopoverRoot>
            <PopoverTrigger as-child>
              <IconKey :icon="Volume2" label="Volume" bare :size="keySize.panel" />
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent
                side="top"
                :side-offset="10"
                class="vfd-well z-50 flex h-44 w-14 flex-col items-center gap-2 rounded-md px-3 py-3"
              >
                <LedBar
                  :value="player.volume"
                  :segments="20"
                  interactive
                  orientation="vertical"
                  label="Volume"
                  :step="0.01"
                  @update:value="onVolume"
                />
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
        </div>
      </div>

      <div
        class="vfd-well vfd-scanlines order-2 flex h-[72px] min-w-0 flex-1 items-center gap-3 rounded-md py-1.5 pl-1.5 pr-3 md:h-full md:gap-4 md:py-2 md:pl-2 md:pr-3.5"
      >
        <CoverArt :src="cover" :alt="track?.album.title ?? 'No track'" class="size-14 md:size-[84px]" />

        <div class="flex min-w-0 flex-1 flex-col justify-center gap-1 md:gap-1.5">
          <HeadUnitFlags
            class="hidden md:flex"
            :hifi="!!track?.hifi"
            :shuffle="player.isShuffled"
            :repeat="player.loopMode !== 'none'"
            :party="party.inParty"
            :has-track="!!track"
          />
          <Marquee
            v-if="track"
            :text="marqueeText"
            class="font-display text-lg font-extrabold uppercase leading-tight text-cyan glow-lg md:text-[26px]"
          />
          <template v-else>
            <span data-testid="no-disc" aria-hidden="true" class="font-display text-lg font-extrabold leading-tight text-cyan-dim md:text-[26px]">NO DISC</span>
            <span class="sr-only">No track selected</span>
          </template>
          <div class="flex items-center gap-2.5">
            <span data-testid="elapsed" class="min-w-9 font-seg text-[11px] text-cyan glow-sm">{{ formatDuration(player.currentTime) }}</span>
            <LedBar
              data-testid="progress-range"
              :value="progressPercent"
              :max="100"
              :step="1"
              :segments="64"
              interactive
              label="Progress"
              :disabled="seekDisabled"
              class="flex-1"
              @update:value="onSeek"
            />
            <span data-testid="total" class="min-w-9 text-right font-seg text-[11px] text-faint">{{ formatDuration(player.duration) }}</span>
          </div>
        </div>

        <div class="hidden flex-col items-end gap-2 lg:flex">
          <Readout data-testid="track-readout" caption="Track" :value="trackNumber" seg size="sm" align="end" :tone="track ? 'cyan' : 'dim'" class="[&_[data-value]]:text-2xl" />
          <Readout data-testid="level-readout" caption="Level" :value="level" size="sm" tone="dim" align="end" class="[&_[data-value]]:text-cyan-dim" />
        </div>

        <div class="hidden h-[72px] w-[220px] shrink-0 xl:block">
          <Spectrum :active="player.isPlaying" />
        </div>
      </div>

      <div class="order-4 hidden w-28 flex-col gap-1.5 md:flex">
        <Button size="sm" :variant="drawer.activePanel === 'queue' ? 'default' : 'outline'" class="w-full justify-start" @click="openPanel('queue')">
          <template #icon><ListMusic :size="12" aria-hidden="true" /></template>
          Queue
        </Button>
        <Button size="sm" :variant="drawer.activePanel === 'lyrics' ? 'default' : 'outline'" class="w-full justify-start" @click="openPanel('lyrics')">
          <template #icon><MicVocal :size="12" aria-hidden="true" /></template>
          Lyrics
        </Button>
        <Button
          v-if="party.inParty"
          size="sm"
          :variant="drawer.activePanel === 'party' ? 'default' : 'outline'"
          class="w-full justify-start"
          @click="openPanel('party')"
        >
          <template #icon><Users :size="12" aria-hidden="true" /></template>
          Party
        </Button>
      </div>

      <VolumeKnob
        data-testid="volume-range"
        :model-value="player.volume"
        class="order-5 hidden md:flex"
        @update:model-value="onVolume"
      />
    </div>
  </footer>
</template>

<style scoped>
.play-key {
  background: radial-gradient(circle, #2b3339, #0d1114);
  box-shadow: 0 3px 6px #000000b3, 0 0 18px #5cf6e840;
}
</style>
