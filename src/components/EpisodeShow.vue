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

<script>
import { Shared } from '../State'

export default {

  data() {
    return {
      episode: {}
    }
  },

  created() {
    Shared.dexieDB.episodes.where({ _id: this.$route.params.id }).toArray().then(result => {
      this.episode = result[0]
    })
  }
}
</script>