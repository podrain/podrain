<template>
<div class="flex flex-col h-screen">
  <div class="flex items-center justify-between h-16 bg-teal-800 px-4 text-white">
    <router-link to="/"><font-awesome-icon class="text-4xl" icon="home" /></router-link>
    <router-link to="/queue"><font-awesome-icon class="text-4xl" icon="list-ol" /></router-link>
    <router-link to="/podcasts/create"><font-awesome-icon class="text-4xl" icon="plus" /></router-link>
    <router-link to="/settings"><font-awesome-icon class="text-4xl" icon="cog" /></router-link>
  </div>
  <div class="flex-1 overflow-y-scroll bg-gray-800">
    <router-view />
  </div>
  <Playbox />
</div>
</template>

<script>
import Playbox from './components/Playbox.vue'
import Helpers from './Helpers'

export default {
  components: {
    Playbox
  },

  created() {
    this.$store.dispatch('syncDownloadedEpisodes')

    Helpers.playingAudio = new Audio

    Helpers.playingAudio.addEventListener('pause', (event) => {
      this.$store.state.paused = true
    })

    Helpers.playingAudio.addEventListener('play', (event) => {
      this.$store.state.paused = false
    })

    Helpers.playingAudio.addEventListener('ended', (event) => {
      this.$store.dispatch('playNext', { finishEpisode: true, startPlaying: true })
    })

    this.$store.dispatch('getQueue').then(() => {
      return Helpers.dexieDB.episodes
        .filter(ep => ep.currently_playing == true)
        .toArray().then(result => {
          this.$store.dispatch('playEpisode', { id: result[0]._id })
        })
    }).then(() => {
      setInterval(() => {
        Helpers.dexieDB.episodes.where({ _id: this.$store.state.playingEpisode._id }).modify({ playhead: this.$store.state.playingEpisode.playhead })
      }, 5000)
    })
  }
}
</script>