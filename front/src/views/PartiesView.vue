<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { usePartyStore } from '@/stores/party'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader, Readout, VfdSelect } from '@/components/vfd'
import { LogIn, PartyPopper, RefreshCw } from 'lucide-vue-next'

const party = usePartyStore()

const createName = ref('')
const queuePolicy = ref<'DJ_ONLY' | 'EVERYONE'>('DJ_ONLY')
const inviteCode = ref('')

async function onCreate() {
  try {
    await party.create(createName.value.trim(), queuePolicy.value)
    createName.value = ''
  } catch {
    // toast in store
  }
}

async function onJoin() {
  try {
    await party.join(inviteCode.value.trim().toUpperCase())
    inviteCode.value = ''
  } catch {
    // toast in store
  }
}

async function onLeave() {
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
  <div class="flex flex-col gap-7">
    <PageHeader kicker="Source · Parties" title="Parties" />

    <section
      v-if="party.inParty"
      data-testid="active-party"
      class="vfd-well vfd-scanlines flex flex-col gap-5 rounded-lg border-amber! p-6 shadow-[inset_0_3px_10px_#000000ee,0_0_20px_#FFB23F26] md:flex-row md:items-center"
    >
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <span class="flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.2em] text-amber glow-amber">
          <span aria-hidden="true" class="led led-red size-2!" />Live · Active Party
        </span>
        <span class="truncate font-display text-[34px] font-extrabold uppercase leading-none text-cyan glow-lg">{{ party.state?.name }}</span>
        <span class="text-[13px] text-soft">
          {{ party.state?.members.length ?? 0 }} listeners · queue: {{ party.state?.queuePolicy === 'EVERYONE' ? 'everyone' : 'DJs only' }}
        </span>
      </div>
      <Readout data-testid="invite-readout" caption="Invite code" :value="party.state?.inviteCode ?? ''" tone="amber" />
      <div class="flex gap-2 md:w-[150px] md:flex-col">
        <Button variant="outline" class="flex-1 md:w-full" @click="party.refreshState">
          <template #icon><RefreshCw :size="13" aria-hidden="true" /></template>
          Refresh
        </Button>
        <Button :variant="party.isHost ? 'destructive' : 'outline'" class="flex-1 md:w-full" @click="onLeave">
          {{ party.isHost ? 'End party' : 'Leave party' }}
        </Button>
      </div>
    </section>

    <div class="grid gap-5 md:grid-cols-2">
      <form
        class="flex flex-col gap-4 rounded-lg border border-chrome-lo/40 bg-[linear-gradient(to_top,#0A0F12,#141B20)] p-6 shadow-[0_10px_24px_#000000cc]"
        @submit.prevent="onCreate"
      >
        <h2 class="font-display text-[22px] font-extrabold uppercase text-cyan glow-sm">Create New Party</h2>
        <div class="flex flex-col gap-2">
          <Label for="party-name">Party name</Label>
          <Input id="party-name" v-model="createName" required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="queue-policy">Queue control</Label>
          <VfdSelect id="queue-policy" v-model="queuePolicy">
            <option value="DJ_ONLY">Only DJs</option>
            <option value="EVERYONE">Everyone in party</option>
          </VfdSelect>
        </div>
        <Button type="submit" :disabled="party.loading" class="mt-auto w-full">
          <template #icon><PartyPopper :size="13" aria-hidden="true" /></template>
          Create New Party
        </Button>
      </form>

      <form
        class="flex flex-col gap-4 rounded-lg border border-chrome-lo/40 bg-[linear-gradient(to_top,#0A0F12,#141B20)] p-6 shadow-[0_10px_24px_#000000cc]"
        @submit.prevent="onJoin"
      >
        <h2 class="font-display text-[22px] font-extrabold uppercase text-cyan glow-sm">Join Existing Party</h2>
        <div class="flex flex-col gap-2">
          <Label for="invite-code">Invite code</Label>
          <Input
            id="invite-code"
            v-model="inviteCode"
            maxlength="8"
            placeholder="AB12CD34"
            required
            class="font-display text-lg font-extrabold uppercase tracking-[0.2em] text-amber"
          />
        </div>
        <p class="text-[13px] text-soft">Ask the host for the code shown on their display.</p>
        <Button type="submit" variant="outline" :disabled="party.loading" class="mt-auto w-full">
          <template #icon><LogIn :size="13" aria-hidden="true" /></template>
          Join Party
        </Button>
      </form>
    </div>
  </div>
</template>
