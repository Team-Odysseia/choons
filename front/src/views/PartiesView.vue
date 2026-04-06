<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { usePartyStore } from '@/stores/party'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to update party state')
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Parties</h1>

    <div v-if="party.inParty" class="rounded-lg border border-border bg-card p-4 mb-6">
      <div class="text-[12px] uppercase tracking-wider text-dimmed">Active Party</div>
      <div class="text-xl font-black mt-1">{{ party.state?.name }}</div>
      <div class="text-[13px] text-dimmed mt-1">Invite code: {{ party.state?.inviteCode }}</div>
      <div class="flex items-center gap-2 mt-4">
        <Button variant="outline" @click="party.refreshState">Refresh</Button>
        <Button :variant="party.isHost ? 'destructive' : 'outline'" @click="onLeave">
          {{ party.isHost ? 'End party' : 'Leave party' }}
        </Button>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <form class="rounded-lg border border-border bg-card p-4 flex flex-col gap-3" @submit.prevent="onCreate">
        <h2 class="font-bold">Create New Party</h2>
        <div class="form-group">
          <Label for="party-name">Party name</Label>
          <Input id="party-name" v-model="createName" required />
        </div>
        <div class="form-group">
          <Label>Queue control</Label>
          <select
            v-model="queuePolicy"
            class="flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          >
            <option value="DJ_ONLY">Only DJs</option>
            <option value="EVERYONE">Everyone in party</option>
          </select>
        </div>
        <Button type="submit" :disabled="party.loading">Create New Party</Button>
      </form>

      <form class="rounded-lg border border-border bg-card p-4 flex flex-col gap-3" @submit.prevent="onJoin">
        <h2 class="font-bold">Join Existing Party</h2>
        <div class="form-group">
          <Label for="invite-code">Invite code</Label>
          <Input id="invite-code" v-model="inviteCode" maxlength="8" placeholder="AB12CD34" required />
        </div>
        <Button type="submit" :disabled="party.loading">Join Party</Button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
