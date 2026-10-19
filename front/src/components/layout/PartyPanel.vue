<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { usePartyStore } from '@/stores/party'
import { Button } from '@/components/ui/button'
import { Readout, StatePlate, VfdBadge } from '@/components/vfd'
import { apiErrorMessage } from '@/lib/errors'

const party = usePartyStore()

const members = computed(() => party.state?.members ?? [])
const everyoneCanPlay = computed(() => party.state?.queuePolicy === 'EVERYONE')

async function onKick(userId: string) {
  if (await party.kick(userId)) toast.success('Member kicked')
}

async function onToggleDj(userId: string, dj: boolean) {
  if (await party.setDj(userId, dj)) toast.success(dj ? 'DJ enabled' : 'DJ removed')
}

async function onLeaveOrEnd() {
  try {
    if (party.isHost) {
      await party.end()
      toast.success('Party ended')
    } else {
      await party.leave()
      toast.success('Left party')
    }
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to update party state'))
  }
}
</script>

<template>
  <div class="px-3.5 py-4">
    <StatePlate v-if="!party.state" code="NO PARTY" message="No active party" />
    <div v-else class="flex h-full flex-col gap-3.5">
      <div class="vfd-well vfd-scanlines flex flex-col gap-2 rounded-md px-[18px] py-4">
        <Readout caption="Invite Code" :value="party.state.inviteCode" tone="amber" />
        <div class="text-[13px] text-soft">{{ party.state.name }}</div>
      </div>

      <div class="font-label text-[9px] uppercase tracking-[0.2em] text-faint">Connected users · {{ members.length }}</div>
      <div class="flex flex-col gap-2">
        <div
          v-for="member in members"
          :key="member.userId"
          class="flex flex-col gap-2.5 rounded border border-line bg-panel p-3"
        >
          <div class="flex items-center gap-2.5">
            <span aria-hidden="true" :class="['led', member.connected && 'led-on']" />
            <span class="min-w-0 flex-1 truncate text-sm text-fg">{{ member.username }}</span>
            <VfdBadge
              v-if="!everyoneCanPlay"
              :tone="member.host ? 'amber' : member.dj ? 'cyan' : 'mute'"
              :label="member.host ? 'Host' : member.dj ? 'DJ' : 'Member'"
            />
          </div>
          <div v-if="party.isHost && !member.host" class="flex items-center gap-2">
            <Button
              v-if="!everyoneCanPlay"
              size="sm"
              variant="outline"
              class="flex-1"
              @click="onToggleDj(member.userId, !member.dj)"
            >{{ member.dj ? 'Remove DJ' : 'Make DJ' }}</Button>
            <Button size="sm" variant="destructive" @click="onKick(member.userId)">Kick</Button>
          </div>
        </div>
      </div>

      <Button
        :variant="party.isHost ? 'destructive' : 'outline'"
        class="mt-2 w-full"
        @click="onLeaveOrEnd"
      >{{ party.isHost ? 'End Party' : 'Leave Party' }}</Button>
    </div>
  </div>
</template>
