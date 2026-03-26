<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')

async function submit() {
  try {
    await auth.login(username.value, password.value)
    router.push('/library')
  } catch (e: any) {
    toast.error(
      e.response?.status === 401 ? 'Invalid username or password' : 'Login failed. Please try again.',
    )
  }
}
</script>

<template>
  <div class="h-screen flex items-center justify-center bg-background">
    <form
      class="bg-card border border-border rounded-lg px-9 py-10 w-full max-w-[380px] flex flex-col gap-5"
      @submit.prevent="submit"
    >
      <div class="text-[28px] font-black text-primary text-center tracking-tight">choons</div>
      <h1 class="text-[22px] font-extrabold text-center">Sign in</h1>

      <div class="flex flex-col gap-1.5">
        <Label for="username">Username</Label>
        <Input
          id="username"
          v-model="username"
          type="text"
          autocomplete="username"
          required
          autofocus
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <Button type="submit" :disabled="auth.loading" class="w-full justify-center">
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </Button>
    </form>
  </div>
</template>
