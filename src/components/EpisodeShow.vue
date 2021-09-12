<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white text-xl">{{ episode.title }}</h1>
      <div class="flex mt-3">
        <div class="prose-sm prose-episode-details" v-html="episode.description"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { Shared } from '../State'
  import { ref } from 'vue'
  import { useRoute } from 'vue-router'

  const episode = ref({})
  const route = useRoute()

  Shared.dexieDB.episodes.where({ _id: route.params.id }).toArray().then(result => {
    episode.value = result[0]
  })
</script>