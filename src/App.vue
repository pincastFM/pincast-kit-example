<script setup>
import { computed } from 'vue'
import { Tabletop, createTabletop } from '@pincast/placecard-kit/vue'
import { config, signedIn, source } from './tabletop.js'

const tabletop = createTabletop(config)
const note = computed(() => {
  if (tabletop.error.value) return tabletop.error.value.message || String(tabletop.error.value)
  if (source.value === 'sample') return 'Sample cards. Add a key to go live.'
  if (source.value === 'live' && !signedIn.value) return 'Live, with no person set. Add PINCAST_ACTOR to show their cards.'
  if (source.value === 'live') return 'Live from the Pincast API.'
  return 'Loading the cards.'
})
</script>

<template>
  <p class="lantern-note" :class="{ 'is-error': tabletop.error.value }" role="status">{{ note }}</p>
  <Tabletop :tabletop="tabletop" />
</template>
