import { defineStore } from 'pinia'
import axios from 'axios'
import { Shared } from '../State'
import _ from 'lodash'

export const useDownloadsStore = defineStore('downloads', {
  state: () => {
    return {
      downloading: [],
      downloaded: []
    }
  },

  actions: {
    async downloadEpisode(id) {
      var self = this

      this.downloading.push({
        id,
        progress: 0
      })

      let proxyUrl = localStorage.getItem('proxy_url') || ""

      const episodeInfo = await Shared.dexieDB.episodes.where({_id: id}).first()
      console.log(episodeInfo)

      let episodeAudio = await axios.get(
        proxyUrl + episodeInfo.enclosure.url,
        {
          onDownloadProgress(event) {
            let episodeIndex = _.findIndex(self.downloading, dl => dl.id == id)
            self.downloading[episodeIndex].progress = Math.floor((event.loaded / event.total) * 100)
          },

          headers: {
            'Accept': 'audio/*'
          },
          responseType: 'arraybuffer'
        }
      )

      let audioType = episodeAudio.headers['content-type']
      let audioBlob = new Blob([episodeAudio.data], { type: audioType })
      await Shared.downloadedEpisodeFiles.setItem('podrain_episode_'+id, audioBlob)
      this.syncDownloadedEpisodes()
      
      // Remove from downloading array
      let episodeIndex = _.findIndex(this.downloading, dl => dl.id == id)
      this.downloading.splice(episodeIndex, 1)
    },

    async syncDownloadedEpisodes() {
      let keys = await Shared.downloadedEpisodeFiles.keys()

      let episodes = keys.filter(key => {
          return key.includes('podrain_episode_')
        }).map(key => {
          return key.substr('podrain_episode_'.length)
        })
    
      this.downloaded = episodes
    },

    async removeDownload(id) {
      if (await Shared.downloadedEpisodeFiles.getItem('podrain_episode_'+id)) {
        await Shared.downloadedEpisodeFiles.removeItem('podrain_episode_'+id)
        this.syncDownloadedEpisodes()
      }
    },
  }
})