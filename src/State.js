import { createStore } from 'vuex'
import { DateTime } from 'luxon'
import _ from 'lodash'
import axios from 'axios'

export let Shared = {
  dexieDB: null,
  playingAudio: null,
  wakeLock: null,
  downloadedEpisodeFiles: null,
  downloadedImageFiles: null,
}

export let VuexStore = createStore({
  state() {
    return {
      queue: [],
      playingEpisode: null,
      paused: true,
      downloading: [],
      downloaded: [],
      queueChanging: false,
    }
  },

  getters: {
    currentlyPlayingInQueue(state) {
      return state.queue.filter(qe => qe.currently_playing == 1)[0]
    },

    getEpisodeInQueue: (state) => (id) => {
      return state.queue.filter(qe => qe._id == id)[0]
    },

    isInQueue: (state) => (id) => {
      return state.queue.map(qe => qe._id).includes(id)
    },

    queueInOrder(state) {
      return _.sortBy(state.queue, ['queue'])
    },

    isPlaying: (state) => (id) => {
      return state.playingEpisode?._id == id && !state.paused
    }
  },

  mutations: {
    addEpisodeToQueue(state, episode) {
      state.queue.push(episode)
    },

    clearQueue(state) {
      state.queue = []
    },

    removeEpisodeFromQueue(state, episodeID) {
      let queuedEpisodeIndex = _.findIndex(state.queue, qe => qe._id == episodeID)
      state.queue.splice(queuedEpisodeIndex, 1)
    },

    setQueueOfEpisode(state, args) {
      let episodeIndex = _.findIndex(state.queue, qe => qe._id == args.episodeID)
      state.queue[episodeIndex].queue = args.newQueue
    },

    setPlayingEpisode(state, episode) {
      delete episode.queue
      state.playingEpisode = episode
    },

    updatePlayhead(state, playhead) {
      state.playingEpisode.playhead = playhead
    },

    setPlayheadOfEpisode(state, args) {
      let episodeIndex = _.findIndex(state.queue, qe => qe._id == args.episodeID)
      state.queue[episodeIndex].playhead = args.newPlayhead
    },

    clearCurrentlyPlaying(state) {
      for (let i = 0; i < state.queue.length; i++) {
        state.queue[i].currently_playing = 0
      }
    },

    setCurrentlyPlaying(state, id) {
      let episodeIndex = _.findIndex(state.queue, qe => qe._id == id)
      state.queue[episodeIndex].currently_playing = 1
    },

    addEpisodeToDownloading(state, id) {
      state.downloading.push({
        id,
        progress: 0
      })
    },

    setEpisodeDownloadingProgress(state, payload) {
      let episodeIndex = _.findIndex(state.downloading, dl => dl.id == payload.id)
      state.downloading[episodeIndex].progress = payload.progress
    },

    removeEpisodeFromDownloading(state, id) {
      let episodeIndex = _.findIndex(state.downloading, dl => dl.id == id)
      state.downloading.splice(episodeIndex, 1)
    },

    addEpisodeToDownloaded(state, id) {
      state.downloaded.push(id)
    },

    setQueueChanging(state, isQueueChanging) {
      state.queueChanging = isQueueChanging
    }
  },

  actions: {
    getQueue(context) {
      context.commit('clearQueue')

      return Shared.dexieDB.episodes.where('queue').above(0).toArray().then(queuedEpisodes => {
        return queuedEpisodes.map(async (qe) => {
          qe.podcast = await Shared.dexieDB.podcasts.where({ _id: qe.podcast_id }).first()
          return qe
        })
      }).then(episodesWithPodcastsPromises => {
        return Promise.all(episodesWithPodcastsPromises)
      }).then(episodesWithPodcasts => {
        let episodesWithPodcastsSorted = _.sortBy(episodesWithPodcasts, ['queue'])

        for (let ep of episodesWithPodcastsSorted) {
          context.commit('addEpisodeToQueue', ep)
        }
      })
    },

    removeEpisodeFromQueue(context, id) {
      context.commit('setQueueChanging', true)
      let currentEpisode = context.state.queue.filter(qe => id == qe._id)[0]
      
      return Shared.dexieDB.episodes.where({ _id: id }).modify({ queue: 0 }).then(() => {
        context.commit('removeEpisodeFromQueue', id)

        return Shared.dexieDB.episodes.where('queue').above(currentEpisode.queue).toArray()
      }).then(higherInQueue => {
        let queuePromises = []

        if (higherInQueue.length > 0) {
          for (let hiq of higherInQueue) {
            hiq.queue -= 1
            queuePromises.push(
              Shared.dexieDB.episodes
                .where({ _id: hiq._id })
                .modify({ queue: hiq.queue })
                .then(() => {
                  context.commit('setQueueOfEpisode', {
                    episodeID: hiq._id, 
                    newQueue: hiq.queue,
                  })
                })
            )
          }

          return Promise.all(queuePromises).then(() => {
            context.commit('setQueueChanging', false)
          })
        } else {
          return Promise.resolve().then(() => {
            context.commit('setQueueChanging', false)
          })
        }
      })
    },

    async addEpisodeToQueue(context, id) {
      context.commit('setQueueChanging', true)
      let episodesInQueue = await Shared.dexieDB.episodes.where('queue').above(0).toArray()
      
      let highestQueue = episodesInQueue.length > 0 ? Math.max(...episodesInQueue.map(ep => ep.queue)) : 0
      let newHighestQueue = highestQueue + 1
      await Shared.dexieDB.episodes
        .where({ _id: id })
        .modify({ queue: newHighestQueue })
    
      let episode = await Shared.dexieDB.episodes
        .where({ _id: id })
        .first()

      episode.podcast = await Shared.dexieDB.podcasts
        .where({ _id: episode.podcast_id })
        .first()
    
      context.commit('addEpisodeToQueue', episode)
      context.commit('setQueueChanging', false)
    },

    async playEpisode(context, payload) {
      let alreadyPlaying = Shared.playingAudio.paused ? false : true
      let id = payload.hasOwnProperty('id') ? payload.id : null
      let startPlaying = payload.hasOwnProperty('startPlaying') ? payload.startPlaying : false

      if (Shared.playingAudio && !Shared.playingAudio.paused) {
        Shared.playingAudio.pause()
      }

      await Shared.dexieDB.episodes
        .filter(ep => ep.currently_playing == 1)
        .modify({ currently_playing: 0 })
        
      context.commit('clearCurrentlyPlaying')

      // If not in queue already, add episode to queue
      if(!context.getters.isInQueue(id)) {
        await context.dispatch('addEpisodeToQueue', id)
      }

      let episode = await Shared.dexieDB.episodes.where({ _id: id }).first()
            
      let podcast = await Shared.dexieDB.podcasts
        .where({ _id: episode.podcast_id })
        .first()
        
      episode.podcast = podcast

      context.commit('setPlayingEpisode', episode)

      await Shared.dexieDB.episodes
        .where({ _id: id })
        .modify({ currently_playing: 1 })
      
      context.commit('clearCurrentlyPlaying')
      context.commit('setCurrentlyPlaying', id)

      let downloadedFile = await Shared.downloadedEpisodeFiles.getItem('podrain_episode_'+id)
      if (downloadedFile) {
        let blobAB = await downloadedFile.arrayBuffer()
        let newBlob = new Blob([blobAB], { type: episode.enclosure.type })
        Shared.playingAudio.src = URL.createObjectURL(newBlob)
      } else {
        Shared.playingAudio.src = context.state.playingEpisode.enclosure.url
      }
        
      Shared.playingAudio.currentTime = context.state.playingEpisode.playhead

      Shared.playingAudio.addEventListener('timeupdate', (event) => {
        context.commit('updatePlayhead', Shared.playingAudio.currentTime)
        context.commit('setPlayheadOfEpisode', {
          episodeID: context.state.playingEpisode._id,
          newPlayhead: Shared.playingAudio.currentTime
        })
      })

      Shared.playingAudio.load()

      if (alreadyPlaying || startPlaying) Shared.playingAudio.play()
    },

    playOrPause(context) {
      if (Shared.playingAudio.paused) {
        Shared.playingAudio.play()
      } else {
        Shared.playingAudio.pause()
      }
    },

    jumpAhead() {
      Shared.playingAudio.currentTime += 15
    },

    jumpBack() {
      Shared.playingAudio.currentTime -= 15
    },

    setPlayhead(context, value) {
      Shared.playingAudio.currentTime = value
      context.commit('updatePlayhead', Shared.playingAudio.currentTime)
    },

    async playNext(context, payload = {}) {

      let finishEpisode = payload.hasOwnProperty('finishEpisode') ? payload.finishEpisode : false
      let startPlaying = payload.hasOwnProperty('startPlaying') ? payload.startPlaying : false

      let oldEpisodeId = _.clone(context.state.playingEpisode._id)
      let firstInQueue = _.sortBy(context.state.queue, ['queue'])[0]
      let lastInQueue = _.reverse(_.sortBy(context.state.queue, ['queue']))[0]
      if (context.getters.currentlyPlayingInQueue.queue == lastInQueue.queue) {
        await context.dispatch('playEpisode', { id: firstInQueue._id, startPlaying })
      } else {
        let nextInQueue = context.state.queue.filter(qe => qe.queue == context.getters.currentlyPlayingInQueue.queue + 1)[0]
        
        await context.dispatch('playEpisode', { id: nextInQueue._id, startPlaying })
      }

      if (finishEpisode) {
        context.commit('setQueueChanging', true)
        await context.dispatch('removeEpisodeFromQueue', oldEpisodeId)
        context.commit('setQueueChanging', false)
        await Shared.dexieDB.episodes.where({ _id: oldEpisodeId }).modify({ 
          playhead: 0, 
          played: DateTime.now().setZone('utc').toISO()
        })
        context.dispatch('removeDownload', oldEpisodeId)
      }
    },

    playPrev(context) {
      if (context.getters.currentlyPlayingInQueue.queue == 1) {
        let lastInQueue = _.reverse(_.sortBy(context.state.queue, ['queue']))[0]
        context.dispatch('playEpisode', { id: lastInQueue._id })
      } else {
        let prevInQueue = context.state.queue.filter(qe => qe.queue == context.getters.currentlyPlayingInQueue.queue - 1)[0]
        context.dispatch('playEpisode', { id: prevInQueue._id })
      }
    },

    reorderQueue(context, payload) {
      context.commit('setQueueChanging', true)
      let episodeID = payload.hasOwnProperty('episodeID') ? payload.episodeID : null
      let newOrder = payload.hasOwnProperty('newOrder') ? payload.newOrder : null

      let currentEpisode = context.state.queue.filter(qe => qe._id == episodeID)[0]
      let reorderPromises = []

      if (newOrder < currentEpisode.queue) {
        let higherInQueue = context.state.queue.filter(ep => {
          return ep.queue >= newOrder && ep.queue < currentEpisode.queue
        })

        for (let hiq of higherInQueue) {
          reorderPromises.push(
            Shared.dexieDB.episodes
              .where({ _id: hiq._id })
              .modify({ queue: hiq.queue + 1 })
              .then(() => {
                context.commit('setQueueOfEpisode', {
                  episodeID: hiq._id, 
                  newQueue: hiq.queue + 1,
                })
              })
          )
        }
      } else if (newOrder > currentEpisode.queue) {
        let lowerInQueue = context.state.queue.filter(ep => {
          return ep.queue <= newOrder && ep.queue > currentEpisode.queue
        })

        for (let liq of lowerInQueue) {
          reorderPromises.push(
            Shared.dexieDB.episodes
              .where({ _id: liq._id })
              .modify({ queue: liq.queue - 1 })
              .then(() => {
                context.commit('setQueueOfEpisode', {
                  episodeID: liq._id, 
                  newQueue: liq.queue - 1,
                })
              })
          )
        }
      }

      return Promise.all([
        Shared.dexieDB.episodes
          .where({ _id: episodeID })
          .modify({ queue: newOrder })
          .then(() => {
            context.commit('setQueueOfEpisode', {
              episodeID: episodeID, 
              newQueue: newOrder,
            })
          }),
        ...reorderPromises
      ]).then(() => 
        context.commit('setQueueChanging', false)
      )
    },

    async downloadEpisode(context, id) {
      context.commit('addEpisodeToDownloading', id)
      let proxyUrl = localStorage.getItem('proxy_url') || ""

      let episodeAudio = await axios.get(
        proxyUrl + context.getters.getEpisodeInQueue(id).enclosure.url,
        {
          onDownloadProgress(event) {
            context.commit('setEpisodeDownloadingProgress', { 
              id, 
              progress: Math.floor((event.loaded / event.total) * 100)
            })
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
      context.dispatch('syncDownloadedEpisodes')
      context.commit('removeEpisodeFromDownloading', id)
    },

    async removeDownload(context, id) {
      if (await Shared.downloadedEpisodeFiles.getItem('podrain_episode_'+id)) {
        await Shared.downloadedEpisodeFiles.removeItem('podrain_episode_'+id)
        context.dispatch('syncDownloadedEpisodes')
      }
    },

    async syncDownloadedEpisodes(context) {
      let keys = await Shared.downloadedEpisodeFiles.keys()

      let episodes = keys.filter(key => {
          return key.includes('podrain_episode_')
        }).map(key => {
          return key.substr('podrain_episode_'.length)
        })
    
      context.state.downloaded = episodes
    },

    playOrPauseEpisode(context, id) {
      if (id == context.state.playingEpisode?._id) {
        if (context.state.paused) {
          Shared.playingAudio.play()
        } else {
          Shared.playingAudio.pause()
        }
      } else {
        context.dispatch('playEpisode', {
          id,
          startPlaying: true
        })
      }
    }
  }
})

