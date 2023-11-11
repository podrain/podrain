<template>
  <div>
    <div class="flex justify-center bg-teal-700 sticky top-0 z-10">
      <div class="flex text-white h-16 w-full">
        <button @click="showSidebar = true" class="w-16">
          <font-awesome-icon class="text-4xl" icon="bars" />
        </button>
      </div>
    </div>
    <div class="min-h-screen bg-gray-800 flex justify-center">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    <Playbox />
  </div>

  <o-sidebar
    v-model:open="showSidebar"
    :overlay="true"
    contentClass="h-screen w-48 bg-gray-700 text-white"
    overlayClass="bg-black opacity-50"
  >
    <div class="flex flex-col">
      <router-link
        v-for="mn in menu"
        :key="mn.link"
        :to="mn.link"
        class="p-3 flex items-center"
        active-class="bg-gray-800"
        @click="showSidebar = false"
      >
        <font-awesome-icon :icon="mn.icon" class="text-3xl" />
        <span class="ml-3 text-lg">{{ mn.label }}</span>
      </router-link>
    </div>
  </o-sidebar>
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
  import { ref } from 'vue'

  const menu = [
    {
      link: '/podcasts',
      icon: 'home',
      label: 'Podcasts'
    },
    {
      link: '/queue',
      icon: 'list-ol',
      label: 'Queue'
    },
    {
      link: '/history',
      icon: 'history',
      label: 'History'
    },
    {
      link: '/podcasts/create',
      icon: 'plus',
      label: 'Add podcast'
    },
    {
      link: '/settings',
      icon: 'cog',
      label: 'Settings'
    },
  ]

  const store = usePiniaStore()

  const showSidebar = ref(false)

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
      return Shared.dexieDB.player
        .where({ key: 'currently_playing' })
        .first()
        .then(result => {
          store.playEpisode({ id: result.value })
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