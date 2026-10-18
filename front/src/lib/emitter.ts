import mitt from 'mitt'
import type { PartyStateResponse } from '@/api/types'

type Events = {
  'auth:login': { userId: string }
  'auth:logout': void
  'party:stateChanged': PartyStateResponse | null
  'party:joined': { next: () => Promise<boolean> }
  'party:left': void
}

export const emitter = mitt<Events>()
