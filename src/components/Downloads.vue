<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white text-2xl text-center">Downloads</h1>

      <ul class="text-white">
        <li class="bg-gray-600 p-2 my-2 flex items-center justify-between gap-4" v-for="ep in episodes">
          <span>{{ ep.title }}</span>
          <button @click="removeDownload(ep._id)" class="bg-red-500 p-2"><font-awesome-icon icon="times" /></button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { Shared, usePiniaStore } from '../State'

  const store = usePiniaStore()
  const episodes = ref([])

  const loadDownloadedFiles = () => {
    return Shared.downloadedEpisodeFiles.keys().then((keys) => {
      const ids = []
  
      for (let key of keys) {
        const id = key.split('podrain_episode_')[1]
        ids.push(id)
      }
  
      return Shared.dexieDB.episodes.where('_id').anyOf(ids).toArray()
    }).then((episodeResults) => {
      episodes.value = episodeResults
    })
  }

  const removeDownload = (id) => {
    Shared.downloadedEpisodeFiles.removeItem('podrain_episode_'+id).then(() => {
      return loadDownloadedFiles()
    }).then(() => {
      return store.syncDownloadedEpisodes()
    })
  }

  loadDownloadedFiles()
</script>