<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white text-2xl text-center">Downloads</h1>

      <div v-if="loading" class="flex justify-center mt-2">
        <font-awesome-icon class="text-white text-3xl" icon="spinner" spin />
      </div>
      <div v-else class="flex justify-center">
        <span class="text-white text-lg mt-2" v-if="episodes.length === 0">No episodes downloaded for offline listening.</span>
        <ul v-else class="text-white">
          <li class="bg-gray-600 p-2 my-2 flex items-center justify-between gap-4" v-for="ep in episodes">
            <div class="flex flex-col">
              <span class="italic text-sm text-gray-300">{{ ep.podcast.meta.title }}</span>
              <span>{{ ep.title }}</span>
            </div>
            <button @click="removeDownload(ep._id)" class="bg-red-500 p-2"><font-awesome-icon icon="times" /></button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { Shared, usePiniaStore } from '../State'
  import { customTitle } from '../Helpers'

  customTitle('Downloads')
  const store = usePiniaStore()
  const episodes = ref([])
  const loading = ref(false)

  const loadDownloadedFiles = () => {
    loading.value = true
    return Shared.downloadedEpisodeFiles.keys().then((keys) => {
      const ids = []
  
      for (let key of keys) {
        const id = key.split('podrain_episode_')[1]
        ids.push(id)
      }
  
      return Shared.dexieDB.episodes.where('_id').anyOf(ids).toArray()
    }).then((episodeResults) => {

      const podcastsIDs = episodeResults.map(ep => ep.podcast_id)

      Shared.dexieDB.podcasts.where('_id').anyOf(podcastsIDs).toArray()
        .then((podcastResults) => {
          const episodesModified = episodeResults.map(ep => {
            const podcast = podcastResults.filter(pc => pc._id === ep.podcast_id)[0]
            ep.podcast = podcast
            return ep
          })

          loading.value = false
          episodes.value = episodesModified
        })
    })
  }

  const removeDownload = (id) => {
    Shared.downloadedEpisodeFiles.removeItem('podrain_episode_'+id).then(() => {
      return loadDownloadedFiles()
    }).then(() => {
      return store.syncDownloadedEpisodes()
    })
  }

  Shared.syncDownloadBus.on((event) => {
    loadDownloadedFiles()
  })

  loadDownloadedFiles()
</script>