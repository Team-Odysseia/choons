<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import { useAuthStore } from '@/stores/auth'
import TrackRow from '@/components/music/TrackRow.vue'
import { Button } from '@/components/ui/button'
import { X, Play, Shuffle, ListPlus, Globe, Lock, Link } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const route = useRoute()
const playlists = usePlaylistsStore()
const player = usePlayerStore()
const party = usePartyStore()
const auth = useAuthStore()

const togglingVisibility = ref(false)

const isOwner = computed(
  () => !!auth.user && playlists.current?.ownerId === auth.user.id,
)

const publicUrl = computed(() => {
  const id = playlists.current?.id
  return id ? `${window.location.origin}/p/${id}` : ''
})

onMounted(() => playlists.fetchPlaylist(route.params.id as string))

async function removeTrack(trackId: string) {
  await playlists.removeTrack(playlists.current!.id, trackId)
}

async function toggleVisibility() {
  if (!playlists.current) return
  togglingVisibility.value = true
  try {
    await playlists.setVisibility(playlists.current.id, !playlists.current.isPublic)
  } finally {
    togglingVisibility.value = false
  }
}

function copyLink() {
  navigator.clipboard.writeText(publicUrl.value)
  toast.success('Link copied!')
}

function addAllToQueue() {
  if (!playlists.current) return
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can add tracks to party queue')
      return
    }
    void party.addTracks(playlists.current.tracks)
    return
  }
  player.addTracksToQueue(playlists.current.tracks)
}
</script>

<template>
  <div v-if="!playlists.loading && playlists.current">
    <div class="flex items-end gap-6 mb-8">
      <div
        class="size-[160px] bg-muted rounded-lg flex items-center justify-center text-[64px] shrink-0"
      >
        ♫
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Playlist</div>
        <h1 class="text-[28px] font-extrabold mb-2">{{ playlists.current.name }}</h1>
        <div class="flex items-center gap-2">
          <span class="text-[13px] text-dimmed">{{ playlists.current.tracks.length }} tracks</span>
          <span
            v-if="playlists.current.isPublic"
            class="flex items-center gap-1 text-[12px] text-primary font-medium"
          >
            <Globe :size="12" />
            Public
          </span>
          <span v-else class="flex items-center gap-1 text-[12px] text-dimmed">
            <Lock :size="12" />
            Private
          </span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-6 flex-wrap">
      <Button
        v-if="!party.inParty"
        :disabled="playlists.current.tracks.length === 0"
        @click="player.playQueue(playlists.current!.tracks)"
      >
        <Play :size="16" />
        Play all
      </Button>
      <Button
        v-if="!party.inParty"
        variant="outline"
        :disabled="playlists.current.tracks.length === 0"
        @click="player.playQueueShuffled(playlists.current!.tracks)"
      >
        <Shuffle :size="16" />
        Shuffle
      </Button>
      <Button
        variant="outline"
        :disabled="playlists.current.tracks.length === 0 || (party.inParty && !party.canControl)"
        @click="addAllToQueue"
      >
        <ListPlus :size="16" />
        {{ party.inParty ? 'Add to party queue' : 'Add to queue' }}
      </Button>
      <template v-if="isOwner">
        <Button
          variant="outline"
          :disabled="togglingVisibility"
          @click="toggleVisibility"
        >
          <Globe v-if="!playlists.current.isPublic" :size="16" />
          <Lock v-else :size="16" />
          {{ playlists.current.isPublic ? 'Make private' : 'Make public' }}
        </Button>
        <Button
          v-if="playlists.current.isPublic"
          variant="outline"
          @click="copyLink"
        >
          <Link :size="16" />
          Copy link
        </Button>
      </template>
    </div>

    <div v-if="playlists.current.tracks.length === 0" class="text-[13px] text-dimmed">
      No tracks yet. Add some from an album.
    </div>

    <div v-else class="mt-2">
      <div
        v-for="(track, i) in playlists.current.tracks"
        :key="track.id"
        class="flex items-center group/row"
      >
        <TrackRow
          class="flex-1"
          :track="track"
          :queue="playlists.current.tracks"
          :index="i"
        />
        <button
          v-if="isOwner"
          class="size-8 rounded-full flex items-center justify-center text-dimmed opacity-0 group-hover/row:opacity-100 hover:text-destructive transition-all shrink-0"
          title="Remove"
          @click="removeTrack(track.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>
</template>
