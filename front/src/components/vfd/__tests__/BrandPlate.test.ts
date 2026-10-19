import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandPlate from '../BrandPlate.vue'

describe('BrandPlate', () => {
  it('shows the wordmark', () => {
    expect(mount(BrandPlate).text()).toContain('CHOONS')
  })

  it('cannot be text-selected', () => {
    expect(mount(BrandPlate).classes()).toContain('select-none')
  })
})
