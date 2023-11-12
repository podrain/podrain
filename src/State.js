import { DateTime } from 'luxon'
import _, { first } from 'lodash'
import axios from 'axios'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useEventBus } from '@vueuse/core'

export let Shared = {
  dexieDB: null,
  playingAudio: null,
  wakeLock: null,
  downloadedEpisodeFiles: null,
  downloadedImageFiles: null,
  syncDownloadBus: useEventBus('bus'),
}

export let usePiniaStore = defineStore('main', () => {
  const queue = ref([])
  const playingEpisode = ref(null)
  const paused = ref(true)
  const downloading = ref([])
  const downloaded = ref([])
  const queueChanging = ref(false)

  function getEpisodeInQueue(id) {
    return queue.value.filter(qe => qe._id == id)[0]
  }

  function isInQueue(id) {
    return queue.value.map(qe => qe._id).includes(id)
  }

  function isPlaying(id) {
    return playingEpisode.value?._id == id && !paused.value
  }

  function addEpisodeToQueueInternal(episode) {
    queue.value.push(episode)
  }

  function clearQueue() {
    queue.value = []
  }

  function removeEpisodeFromQueueInternal(episodeID) {
    let queuedEpisodeIndex = _.findIndex(queue.value, qe => qe._id == episodeID)
    queue.value.splice(queuedEpisodeIndex, 1)
  }

  // function setQueueOfEpisode(args) {

  // }

  function setPlayingEpisode(episode) {
    playingEpisode.value = episode
  }

  function updatePlayhead(playhead) {
    playingEpisode.value.playhead = playhead
  }

  function setPlayheadOfEpisode(args) {
    let episodeIndex = _.findIndex(queue.value, qe => qe._id == args.episodeID)
    queue.value[episodeIndex].playhead = args.newPlayhead
  }

  function setCurrentlyPlaying(id) {
    Shared.dexieDB.player.where({ key: 'currently_playing' }).modify({ value: id })
  }

  function addEpisodeToDownloading(id) {
    downloading.value.push({
      id,
      progress: 0
    })
  }

  function setEpisodeDownloadingProgress(payload) {
    let episodeIndex = _.findIndex(downloading.value, dl => dl.id == payload.id)
    downloading.value[episodeIndex].progress = payload.progress
  }

  function removeEpisodeFromDownloading(id) {
    let episodeIndex = _.findIndex(downloading.value, dl => dl.id == id)
    downloading.value.splice(episodeIndex, 1)
  }

  function addEpisodeToDownloaded(id) {
    downloaded.value.push(id)
  }

  function setQueueChanging(isQueueChanging) {
    queueChanging.value = isQueueChanging
  }

  async function getQueue() {
    clearQueue()

    const queueCollection = await Shared.dexieDB.player.where({ key: 'queue' }).first()

    if (!queueCollection) {
      await Shared.dexieDB.player.add({ key: 'queue', value: JSON.stringify([]) })
    }

    const queueIDs = JSON.parse(queueCollection.value).filter(qe => qe !== null)
    const queuedEpisodes = await Shared.dexieDB.episodes.where('_id').anyOf(queueIDs).toArray()
    
    const episodesWithPodcastsPromises = queuedEpisodes.map(async (qe) => {
      qe.podcast = await Shared.dexieDB.podcasts.where({ _id: qe.podcast_id }).first()
      return qe
    })

    const episodesWithPodcasts = await Promise.all(episodesWithPodcastsPromises)

    for (let id of queueIDs) {
      const episode = episodesWithPodcasts.filter(ep => ep._id === id)[0]
      addEpisodeToQueueInternal(episode)
    }
  }

  function removeEpisodeFromQueue(idOrArray) {
    setQueueChanging(true)

    return Shared.dexieDB.player.where({ key: 'queue' }).first().then(queueCollection => {
      const currentQueue = JSON.parse(queueCollection.value)

      if (typeof idOrArray === 'string') {
        const removeIndex = currentQueue.indexOf(idOrArray)
        currentQueue.splice(removeIndex, 1)
      } else {
        for (let id of idOrArray) {
          const removeIndex = currentQueue.indexOf(id)
          currentQueue.splice(removeIndex, 1)
        }
      }

      const newQueueString = JSON.stringify(currentQueue)

      return Shared.dexieDB.player.where({ key: 'queue' }).modify({ value: newQueueString })
    }).then(() => {
      if (typeof idOrArray === 'string') {
        removeEpisodeFromQueueInternal(idOrArray)
      } else {
        for (let id of idOrArray) {
          removeEpisodeFromQueueInternal(id)
        }
      }
      setQueueChanging(false)
    })
  }

  async function addEpisodeToQueue(id) {
    setQueueChanging(true)

    const queueCollection = await Shared.dexieDB.player.where({ key: 'queue' }).first()
    const currentQueue = JSON.parse(queueCollection.value)

    currentQueue.push(id)

    const newQueueString = JSON.stringify(currentQueue)

    await Shared.dexieDB.player.where({ key: 'queue' }).modify({ value: newQueueString })
  
    let episode = await Shared.dexieDB.episodes
      .where({ _id: id })
      .first()

    episode.podcast = await Shared.dexieDB.podcasts
      .where({ _id: episode.podcast_id })
      .first()
  
    addEpisodeToQueueInternal(episode)
    setQueueChanging(false)
  }

  async function playEpisode(payload) {
    let alreadyPlaying = Shared.playingAudio.paused ? false : true
    let id = payload.hasOwnProperty('id') ? payload.id : null
    let startPlaying = payload.hasOwnProperty('startPlaying') ? payload.startPlaying : false

    if (Shared.playingAudio && !Shared.playingAudio.paused) {
      Shared.playingAudio.pause()
    }

    // If not in queue already, add episode to queue
    if(!isInQueue(id)) {
      await addEpisodeToQueue(id)
    }

    let episode = await Shared.dexieDB.episodes.where({ _id: id }).first()
          
    let podcast = await Shared.dexieDB.podcasts
      .where({ _id: episode.podcast_id })
      .first()
      
    episode.podcast = podcast

    setPlayingEpisode(episode)

    const currentlyPlaying = await Shared.dexieDB.player.where({ key: 'currently_playing' }).first()

    if (currentlyPlaying) {
      await Shared.dexieDB.player.where({ key: 'currently_playing' }).modify({ value: id })
    } else {
      await Shared.dexieDB.player.add({ key: 'currently_playing', value: id })
    }

    setCurrentlyPlaying(id)

    let downloadedFile = await Shared.downloadedEpisodeFiles.getItem('podrain_episode_'+id)
    if (downloadedFile) {
      let blobAB = await downloadedFile.arrayBuffer()
      let newBlob = new Blob([blobAB], { type: episode.enclosure.type })
      Shared.playingAudio.src = URL.createObjectURL(newBlob)
    } else {
      Shared.playingAudio.src = playingEpisode.value.enclosure.url
    }
      
    Shared.playingAudio.currentTime = playingEpisode.value.playhead

    Shared.playingAudio.addEventListener('timeupdate', (event) => {
      updatePlayhead(Shared.playingAudio.currentTime)
      setPlayheadOfEpisode({
        episodeID: playingEpisode.value._id,
        newPlayhead: Shared.playingAudio.currentTime
      })
    })

    Shared.playingAudio.load()

    if (alreadyPlaying || startPlaying) Shared.playingAudio.play()
  }

  function playOrPause() {
    if (Shared.playingAudio.paused) {
      Shared.playingAudio.play()
    } else {
      Shared.playingAudio.pause()
    }
  }

  function jumpAhead() {
    Shared.playingAudio.currentTime += 15
  }

  function jumpBack() {
    Shared.playingAudio.currentTime -= 15
  }

  function setPlayhead(value) {
    Shared.playingAudio.currentTime = value
    updatePlayhead(Shared.playingAudio.currentTime)
  }

  async function playNext(payload = {}) {
    let finishEpisode = payload.hasOwnProperty('finishEpisode') ? payload.finishEpisode : false
    let startPlaying = payload.hasOwnProperty('startPlaying') ? payload.startPlaying : false

    const currentQueueString = await Shared.dexieDB.player.where({ key: 'queue' }).first()
    const currentQueue = JSON.parse(currentQueueString.value).filter(qe => qe !== null)

    const currentlyPlayingID = (await Shared.dexieDB.player.where({ key: 'currently_playing' }).first()).value

    let oldEpisodeId = _.clone(playingEpisode.value._id)
    let firstInQueue = currentQueue[0]
    let lastInQueue = currentQueue[currentQueue.length - 1]

    if (currentlyPlayingID == lastInQueue) {
      await playEpisode({ id: firstInQueue, startPlaying })
    } else {
      const currentIndex = currentQueue.indexOf(currentlyPlayingID)
      const nextEpisodeID = currentQueue[currentIndex + 1]
      
      await playEpisode({ id: nextEpisodeID, startPlaying })
    }

    if (finishEpisode) {
      setQueueChanging(true)
      await removeEpisodeFromQueue(oldEpisodeId)
      setQueueChanging(false)
      await Shared.dexieDB.episodes.where({ _id: oldEpisodeId }).modify({ 
        playhead: 0, 
        played: DateTime.now().setZone('utc').toISO()
      })
      removeDownload(oldEpisodeId)
    }
  }

  async function playPrev() {
    const currentQueueString = await Shared.dexieDB.player.where({ key: 'queue' }).first()
    const currentQueue = JSON.parse(currentQueueString.value).filter(qe => qe !== null)
    
    let firstInQueue = currentQueue[0]
    let lastInQueue = currentQueue[currentQueue.length - 1]

    const currentlyPlayingID = (await Shared.dexieDB.player.where({ key: 'currently_playing' }).first()).value

    if (currentlyPlayingID === firstInQueue) {
      playEpisode({ id: lastInQueue })
    } else {
      const currentIndex = currentQueue.indexOf(currentlyPlayingID)
      const prevEpisodeID = currentQueue[currentIndex - 1]

      playEpisode({ id: prevEpisodeID })
    }
  }

  function reorderArray(array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0])
    return array
  }

  async function reorderQueue(payload) {
    setQueueChanging(true)
    let from = payload.hasOwnProperty('from') ? payload.from : null
    let to = payload.hasOwnProperty('to') ? payload.to : null

    const queue = JSON.parse((await Shared.dexieDB.player.where({ key: 'queue' }).first()).value).filter(qe => qe !== null)
    const newQueue = reorderArray(queue, from, to)

    await Shared.dexieDB.player.where({ key: 'queue' }).modify({ value: JSON.stringify(newQueue) })

    setQueueChanging(false)
  }

  async function downloadEpisode(id) {
    addEpisodeToDownloading(id)
    let proxyUrl = localStorage.getItem('proxy_url') || ""

    let episodeAudio = await axios.get(
      proxyUrl + getEpisodeInQueue(id).enclosure.url,
      {
        onDownloadProgress(event) {
          setEpisodeDownloadingProgress({ 
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
    syncDownloadedEpisodes()
    Shared.syncDownloadBus.emit('downloaded')
    removeEpisodeFromDownloading(id)
  }

  async function removeDownload(id) {
    if (await Shared.downloadedEpisodeFiles.getItem('podrain_episode_'+id)) {
      await Shared.downloadedEpisodeFiles.removeItem('podrain_episode_'+id)
      syncDownloadedEpisodes()
      Shared.syncDownloadBus.emit('removed')
    }
  }

  async function syncDownloadedEpisodes() {
    let keys = await Shared.downloadedEpisodeFiles.keys()

    let episodes = keys.filter(key => {
        return key.includes('podrain_episode_')
      }).map(key => {
        return key.substr('podrain_episode_'.length)
      })
  
    downloaded.value = episodes
  }

  function playOrPauseEpisode(id) {
    if (id == playingEpisode.value?._id) {
      if (paused.value) {
        Shared.playingAudio.play()
      } else {
        Shared.playingAudio.pause()
      }
    } else {
      playEpisode({
        id,
        startPlaying: true
      })
    }
  }

  return {
    queue,
    playingEpisode,
    paused,
    downloading,
    downloaded,
    queueChanging,

    getEpisodeInQueue,
    isInQueue,
    isPlaying,
    clearQueue,
    setPlayingEpisode,
    updatePlayhead,
    setPlayheadOfEpisode,
    setCurrentlyPlaying,
    addEpisodeToDownloading,
    setEpisodeDownloadingProgress,
    removeEpisodeFromDownloading,
    addEpisodeToDownloaded,
    setQueueChanging,

    getQueue,
    removeEpisodeFromQueue,
    addEpisodeToQueue,
    playEpisode,
    playOrPause,
    jumpAhead,
    jumpBack,
    setPlayhead,
    playNext,
    playPrev,
    reorderQueue,
    downloadEpisode,
    removeDownload,
    syncDownloadedEpisodes,
    playOrPauseEpisode,
  }
})

