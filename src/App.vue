<template>
<div>
  <div class="flex justify-center bg-teal-700 sticky top-0 z-10">
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
  <div class="min-h-screen overflow-y-scroll bg-gray-800">
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
  import { Shared, usePiniaStore } from './State'

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

  const store = usePiniaStore()

  store.syncDownloadedEpisodes()

  Shared.playingAudio = new Audio

  Shared.playingAudio.addEventListener('pause', (event) => {
    store.paused = true
  })

  Shared.playingAudio.addEventListener('play', (event) => {
    store.paused = false
  })

  Shared.playingAudio.addEventListener('ended', (event) => {
    store.playNext({ finishEpisode: true, startPlaying: true })
  })

  Shared.playingAudio.addEventListener('loadedmetadata', () => {
    store.playingEpisode.duration = Shared.playingAudio.duration
  })

  store.getQueue().then(() => {
    if (store.queue.length > 0) {
      return Shared.dexieDB.episodes
        .where({ currently_playing: 1 })
        .toArray().then(result => {
          store.playEpisode({ id: result[0]._id })
        }) 
    } else {
      return Promise.resolve()
    }
  }).then(() => {
    setInterval(() => {
      Shared.dexieDB.episodes
        .where({ _id: store.playingEpisode._id })
        .modify({ playhead: store.playingEpisode.playhead })
        .then(() => {
          store.setPlayheadOfEpisode({
            episodeID: store.playingEpisode._id,
            newPlayhead: store.playingEpisode.playhead
          })
        })
    }, 5000)
  })
</script>