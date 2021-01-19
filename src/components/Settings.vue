<template>
  <div class="responsive-width">
    <div class="p-3 text-white">
      <h1 class="text-xl text-center">Settings</h1>
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
    </div>
  </div>
</template>

<script>
import { Shared } from '../State'
import FileSaver from 'file-saver'

export default {
  data() {
    return {
      proxyURL: localStorage.getItem('proxy_url') || '',
      restoreStatus: '',
      restoring: false,
      restoreFile: null,
    }
  },

  methods: {
    saveProxyURL() {
      localStorage.setItem('proxy_url', this.proxyURL)
    },

    setRestoreFile(e) {
      this.restoreFile = e.target.files[0]
    },

    restoreBackup() {
      this.restoring = true
      this.restoreStatus = 'Starting restore...'
      this.restoreFile.text().then(result => {
        let parsedResult = JSON.parse(result)
        this.restoreStatus = 'Clearing podcasts...'
        return Promise.all([
          Shared.dexieDB.podcasts.clear(),
          Shared.dexieDB.episodes.clear()
        ]).then(() => {
          this.restoreStatus = 'Loading new podcasts...'
          return Promise.all([
            Shared.dexieDB.podcasts.bulkAdd(parsedResult.podcasts),
            Shared.dexieDB.episodes.bulkAdd(parsedResult.episodes)
          ])
        }).then(() => {
          this.restoring = false
          this.restoreStatus = 'Podcasts loaded!'
        })
      })
    },

    downloadBackup() {
      let getPodcasts = Shared.dexieDB.podcasts.toArray()
      let getEpisodes = Shared.dexieDB.episodes.toArray()

      Promise.all([getPodcasts, getEpisodes]).then(result => {
        let downloadPayload = {
          podcasts: result[0],
          episodes: result[1]
        }

        let downloadBlob = new Blob([JSON.stringify(downloadPayload)], {
          type: 'text/plain;charset=utf8'
        })

        FileSaver.saveAs(downloadBlob, 'backup.json')
      })
    }
  }
}
</script>