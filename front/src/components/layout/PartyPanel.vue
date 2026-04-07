<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { usePartyStore } from '@/stores/party'
import { Button } from '@/components/ui/button'

const party = usePartyStore()

const members = computed(() => party.state?.members ?? [])
const everyoneCanPlay = computed(() => party.state?.queuePolicy === 'EVERYONE')

async function onKick(userId: string) {
  try {
    await party.kick(userId)
    toast.success('Member kicked')
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to kick member')
  }
}

async function onToggleDj(userId: string, dj: boolean) {
  try {
    await party.setDj(userId, dj)
    toast.success(dj ? 'DJ enabled' : 'DJ removed')
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to update DJ')
  }
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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to update party state')
  }
}
</script>

<template>
  <div class="p-4">
    <div v-if="!party.state" class="text-[13px] text-dimmed text-center py-8">No active party</div>
    <div v-else class="flex flex-col gap-4">
      <div class="rounded-lg border border-border p-3 bg-muted/20">
        <div class="text-[11px] uppercase tracking-wider text-dimmed">Invite Code</div>
        <div class="text-[20px] font-black tracking-[0.12em]">{{ party.state.inviteCode }}</div>
        <div class="text-[12px] text-dimmed mt-1">{{ party.state.name }}</div>
      </div>

      <div>
        <div class="text-[12px] uppercase tracking-wider text-dimmed mb-2">Connected users</div>
        <div class="flex flex-col gap-2">
          <div v-for="member in members" :key="member.userId" class="rounded border border-border px-3 py-2">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[13px] font-semibold truncate">{{ member.username }}</div>
                <div v-if="!everyoneCanPlay" class="text-[11px] text-dimmed">
                  {{ member.host ? 'Host' : member.dj ? 'DJ' : 'Member' }}
                </div>
              </div>
              <div v-if="party.isHost && !member.host" class="flex items-center gap-1">
                <Button
                  v-if="!everyoneCanPlay"
                  size="sm"
                  variant="outline"
                  @click="onToggleDj(member.userId, !member.dj)"
                >
                  {{ member.dj ? 'Remove DJ' : 'Make DJ' }}
                </Button>
                <Button size="sm" variant="destructive" @click="onKick(member.userId)">Kick</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button
        :variant="party.isHost ? 'destructive' : 'outline'"
        class="mt-2"
        @click="onLeaveOrEnd"
      >
        {{ party.isHost ? 'End Party' : 'Leave Party' }}
      </Button>
    </div>
  </div>
</template>
