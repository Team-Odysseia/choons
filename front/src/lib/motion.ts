import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

const preference = usePreferredReducedMotion()

export const prefersReducedMotion = computed(() => preference.value === 'reduce')
