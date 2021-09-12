<template>
<div class="flex flex-col h-screen">
  <div class="flex justify-center bg-teal-700">
    <div class="flex text-white h-16 w-full sm:w-2/3 md:w-1/2 lg:w-2/5 xl:w-1/3">
      <router-link 
        v-for="mn in menu" 
        :key="mn.link"
        :to="mn.link"
        class="flex-1" 
        active-class="bg-teal-800"
      >
        <div class="h-full flex justify-center items-center">
          <font-awesome-icon class="text-4xl" :icon="mn.icon" />
        </div>
      </router-link>
    </div>
  </div>
  <div class="flex-1 flex justify-center overflow-y-scroll bg-gray-800">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
  <Playbox />
</div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.responsive-width {
  @apply w-full sm:w-2/3 md:w-1/2 lg:w-2/5 xl:w-1/3;
}

</style>

<script setup>
  import Playbox from './components/Playbox.vue'
  import { Shared } from './State'
  import { useStore } from 'vuex'

  const menu = [
    {
      link: '/podcasts',
      icon: 'home',
    },
    {
      link: '/queue',
      icon: 'list-ol',
    },
    {
      link: '/history',
      icon: 'history',
    },
    {
      link: '/podcasts/create',
      icon: 'plus',
    },
    {
      link: '/settings',
      icon: 'cog',
    }
  ]

  const store = useStore()

  store.dispatch('syncDownloadedEpisodes')

  Shared.playingAudio = new Audio

  Shared.playingAudio.addEventListener('pause', (event) => {
    store.state.paused = true
  })

  Shared.playingAudio.addEventListener('play', (event) => {
    store.state.paused = false
  })

  Shared.playingAudio.addEventListener('ended', (event) => {
    store.dispatch('playNext', { finishEpisode: true, startPlaying: true })
  })

  Shared.playingAudio.addEventListener('loadedmetadata', () => {
    store.state.playingEpisode.duration = Shared.playingAudio.duration
  })

  store.dispatch('getQueue').then(() => {
    if (store.state.queue.length > 0) {
      return Shared.dexieDB.episodes
        .where({ currently_playing: 1 })
        .toArray().then(result => {
          store.dispatch('playEpisode', { id: result[0]._id })
        }) 
    } else {
      return Promise.resolve()
    }
  }).then(() => {
    setInterval(() => {
      Shared.dexieDB.episodes
        .where({ _id: store.state.playingEpisode._id })
        .modify({ playhead: store.state.playingEpisode.playhead })
        .then(() => {
          store.commit('setPlayheadOfEpisode', {
            episodeID: store.state.playingEpisode._id,
            newPlayhead: store.state.playingEpisode.playhead
          })
        })
    }, 5000)
  })
</script>