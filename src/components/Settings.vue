<template>
  <div class="responsive-width">
    <div class="p-3 text-white">
      <h1 class="text-xl text-center">Settings</h1>

      <div class="mt-2">
        <input type="checkbox" class="mr-2" v-model="wakeLock" id="wakelock-id">
        <label for="wakelock-id">Keep awake</label>
      </div>

      <div class="mt-2">
        Proxy URL
        <input 
          type="text" 
          class="w-full p-1 mt-1 text-black"
          v-model="proxyURL"
        />
        <button 
          class="w-full bg-green-500 h-8 text-white"
          @click="saveProxyURL"
        >
          <font-awesome-icon icon="save" class="mr-1" />
          Save
        </button>
      </div>

      <div class="mt-6">
        <button 
          class="bg-purple-600 p-1 text-white mr-1 w-full"
          @click="downloadBackup"
        >
          <font-awesome-icon icon="download" class="mr-1" />
          Download Backup
        </button>
      </div>

      <h2 class="text-white mt-3">Restore backup</h2>
      <input 
        type="file" 
        class="text-white mt-1"
        @change="setRestoreFile"
      >
      <button 
        v-if="restoreFile"
        class="bg-orange-600 p-1 text-white mr-1 w-full mt-3"
        :disabled="restoring"
        @click="restoreBackup"
      >
        <template v-if="restoring">
          <font-awesome-icon v-if="restoring" icon="spinner" spin/>
          {{ restoreStatus }}
        </template>
        <template v-else>
          <font-awesome-icon icon="upload" class="mr-1" />
          Restore backup
        </template>
      </button>

      <button
        v-if="!iOS()" 
        class="bg-blue-500 p-3 mt-3"
        @click="downloadPodcastImages"
        :disabled="podcastImagesDownloading"
      >
        <template v-if="podcastImagesDownloading">
          <font-awesome-icon icon="spinner" spin class="mr-1" />Downloading images
        </template>
        <template v-else>
          <font-awesome-icon icon="image" class="mr-1" />Download images for podcasts
        </template>
      </button>

      <div class="mt-3">
        (Estimated) Total time listened: <font-awesome-icon v-if="loadingListenTime" icon="spinner" spin /><span v-else>{{ totalTimeListened }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { Shared } from '../State'
  import FileSaver from 'file-saver'
  import axios from 'axios'
  import { iOS } from '../Helpers'
  import { humanFriendlyDuration } from '../Helpers'

  const proxyURL = ref(localStorage.getItem('proxy_url') || '')
  const restoreStatus = ref('')
  const restoring = ref(false)
  const restoreFile = ref(null)
  const wakeLock = ref(Shared.wakeLock ? true : false)
  const podcastImagesDownloading = ref(false)
  const totalTimeListened = ref('')
  const loadingListenTime = ref(false)

  const saveProxyURL = () => {
    localStorage.setItem('proxy_url', proxyURL.value)
  }

  const setRestoreFile = (e) => {
    restoreFile.value = e.target.files[0]
  }

  const restoreBackup = () => {
    restoring.value = true
    restoreStatus.value = 'Starting restore...'
    restoreFile.value.text().then(result => {
      let parsedResult = JSON.parse(result)

      restoreStatus.value = 'Clearing podcasts...'
      return Promise.all([
        Shared.dexieDB.podcasts.clear(),
        Shared.dexieDB.episodes.clear(),
        Shared.dexieDB.player.clear()
      ]).then(() => {
        restoreStatus.value = 'Loading new podcasts...'
        return Promise.all([
          Shared.dexieDB.podcasts.bulkAdd(parsedResult.podcasts),
          Shared.dexieDB.episodes.bulkAdd(parsedResult.episodes),
          Shared.dexieDB.player.bulkAdd(parsedResult.player),
        ])
      }).then(() => {
        restoring.value = false
        restoreStatus.value = 'Podcasts loaded!'
      })
    })
  }

  const downloadBackup = () => {
    let getPodcasts = Shared.dexieDB.podcasts.toArray()
    let getEpisodes = Shared.dexieDB.episodes.toArray()
    let getPlayer = Shared.dexieDB.player.toArray()

    Promise.all([getPodcasts, getEpisodes, getPlayer]).then(result => {
      let downloadPayload = {
        podcasts: result[0],
        episodes: result[1],
        player: result[2],
      }

      let downloadBlob = new Blob([JSON.stringify(downloadPayload)], {
        type: 'text/plain;charset=utf8'
      })

      FileSaver.saveAs(downloadBlob, 'backup.json')
    })
  }

  const downloadPodcastImages = async () => {
    podcastImagesDownloading.value = true
    let podcasts = await Shared.dexieDB.podcasts.toArray()

    for (let pc of podcasts) {
      let response = await axios.get(
        localStorage.getItem('proxy_url') + pc.meta.imageURL,
        {
          headers: {
            'Accept': 'image/*'
          },
          responseType: 'arraybuffer'
        },
      )

      let imageType = response.headers['content-type']
      let imageBlob = new Blob([response.data], { type: imageType })
      Shared.downloadedImageFiles.setItem('podrain_image_'+pc._id, imageBlob)
    }
    
    podcastImagesDownloading.value = false
  }

  watch(wakeLock, (wlActive) => {
    if ('wakeLock' in navigator) {
      if (wlActive && !Shared.wakeLock) {
        navigator.wakeLock.request('screen').then(wl => {
          Shared.wakeLock = wl
        })
      }

      if (!wlActive && Shared.wakeLock) {
        Shared.wakeLock.release().then(() => {
          Shared.wakeLock = null
        })
      }
    } else {
      alert('Cannot keep this device awake. \'Keep awake\' setting is ignored.')
    }
  })

  const getTotalTimeListened = () => {
    loadingListenTime.value = true
    Shared.dexieDB.episodes.where('played').notEqual('').toArray().then((playedEpisodes) => {
      const playedDurations = playedEpisodes.map(ep => ep.duration).filter(ep => ep !== undefined)
      
      const playedDuration = playedDurations.reduce((acc, current) => acc + current, 0)
      loadingListenTime.value = false
      totalTimeListened.value = humanFriendlyDuration(playedDuration)
    })
  }

  getTotalTimeListened()
</script>