import { DateTime } from 'luxon'
import _ from 'lodash'
import axios from 'axios'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export let Shared = {
  dexieDB: null,
  playingAudio: null,
  wakeLock: null,
  downloadedEpisodeFiles: null,
  downloadedImageFiles: null,
}

export let usePiniaStore = defineStore('main', () => {
  const queue = ref([])
  const playingEpisode = ref(null)
  const paused = ref(true)
  const downloading = ref([])
  const downloaded = ref([])
  const queueChanging = ref(false)

  const currentlyPlayingInQueue = computed(() => queue.value.filter(qe => qe.currently_playing == 1)[0])

  function getEpisodeInQueue(id) {
    return queue.value.filter(qe => qe._id == id)[0]
  }

  function isInQueue(id) {
    return queue.value.map(qe => qe._id).includes(id)
  }

  const queueInOrder = computed(() => _.sortBy(queue.value, ['queue']))

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

  function setQueueOfEpisode(args) {
    let episodeIndex = _.findIndex(queue.value, qe => qe._id == args.episodeID)
    queue.value[episodeIndex].queue = args.newQueue
  }

  function setPlayingEpisode(episode) {
    delete episode.queue
    playingEpisode.value = episode
  }

  function updatePlayhead(playhead) {
    playingEpisode.value.playhead = playhead
  }

  function setPlayheadOfEpisode(args) {
    let episodeIndex = _.findIndex(queue.value, qe => qe._id == args.episodeID)
    queue.value[episodeIndex].playhead = args.newPlayhead
  }

  function clearCurrentlyPlaying() {
    for (let i = 0; i < queue.value.length; i++) {
      queue.value[i].currently_playing = 0
    }
  }

  function setCurrentlyPlaying(id) {
    let episodeIndex = _.findIndex(queue.value, qe => qe._id == id)
    queue.value[episodeIndex].currently_playing = 1
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

  function getQueue() {
    clearQueue()

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
        addEpisodeToQueueInternal(ep)
      }
    })
  }

  function removeEpisodeFromQueue(id) {
    setQueueChanging(true)
    let currentEpisode = queue.value.filter(qe => id == qe._id)[0]
    
    return Shared.dexieDB.episodes.where({ _id: id }).modify({ queue: 0 }).then(() => {
      removeEpisodeFromQueueInternal(id)

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
                setQueueOfEpisode({
                  episodeID: hiq._id, 
                  newQueue: hiq.queue,
                })
              })
          )
        }

        return Promise.all(queuePromises).then(() => {
          setQueueChanging(false)
        })
      } else {
        return Promise.resolve().then(() => {
          setQueueChanging(false)
        })
      }
    })
  }

  async function addEpisodeToQueue(id) {
    setQueueChanging(true)
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

    await Shared.dexieDB.episodes
      .filter(ep => ep.currently_playing == 1)
      .modify({ currently_playing: 0 })
      
    clearCurrentlyPlaying()

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

    await Shared.dexieDB.episodes
      .where({ _id: id })
      .modify({ currently_playing: 1 })
    
    clearCurrentlyPlaying()
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

    let oldEpisodeId = _.clone(playingEpisode.value._id)
    let firstInQueue = _.sortBy(queue.value, ['queue'])[0]
    let lastInQueue = _.reverse(_.sortBy(queue.value, ['queue']))[0]
    if (currentlyPlayingInQueue.value.queue == lastInQueue.queue) {
      await playEpisode({ id: firstInQueue._id, startPlaying })
    } else {
      let nextInQueue = queue.value.filter(qe => qe.queue == currentlyPlayingInQueue.value.queue + 1)[0]
      
      await playEpisode({ id: nextInQueue._id, startPlaying })
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

  function playPrev() {
    if (currentlyPlayingInQueue.value.queue == 1) {
      let lastInQueue = _.reverse(_.sortBy(queue.value, ['queue']))[0]
      playEpisode({ id: lastInQueue._id })
    } else {
      let prevInQueue = queue.value.filter(qe => qe.queue == currentlyPlayingInQueue.value.queue - 1)[0]
      playEpisode({ id: prevInQueue._id })
    }
  }

  function reorderQueue(payload) {
    setQueueChanging(true)
    let episodeID = payload.hasOwnProperty('episodeID') ? payload.episodeID : null
    let newOrder = payload.hasOwnProperty('newOrder') ? payload.newOrder : null

    let currentEpisode = queue.value.filter(qe => qe._id == episodeID)[0]
    let reorderPromises = []

    if (newOrder < currentEpisode.queue) {
      let higherInQueue = queue.value.filter(ep => {
        return ep.queue >= newOrder && ep.queue < currentEpisode.queue
      })

      for (let hiq of higherInQueue) {
        reorderPromises.push(
          Shared.dexieDB.episodes
            .where({ _id: hiq._id })
            .modify({ queue: hiq.queue + 1 })
            .then(() => {
              setQueueOfEpisode({
                episodeID: hiq._id, 
                newQueue: hiq.queue + 1,
              })
            })
        )
      }
    } else if (newOrder > currentEpisode.queue) {
      let lowerInQueue = queue.value.filter(ep => {
        return ep.queue <= newOrder && ep.queue > currentEpisode.queue
      })

      for (let liq of lowerInQueue) {
        reorderPromises.push(
          Shared.dexieDB.episodes
            .where({ _id: liq._id })
            .modify({ queue: liq.queue - 1 })
            .then(() => {
              setQueueOfEpisode({
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
          setQueueOfEpisode({
            episodeID: episodeID, 
            newQueue: newOrder,
          })
        }),
      ...reorderPromises
    ]).then(() => 
      setQueueChanging(false)
    )
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
    removeEpisodeFromDownloading(id)
  }

  async function removeDownload(id) {
    if (await Shared.downloadedEpisodeFiles.getItem('podrain_episode_'+id)) {
      await Shared.downloadedEpisodeFiles.removeItem('podrain_episode_'+id)
      syncDownloadedEpisodes()
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

    currentlyPlayingInQueue,
    getEpisodeInQueue,
    isInQueue,
    queueInOrder,
    isPlaying,
    clearQueue,
    setQueueOfEpisode,
    setPlayingEpisode,
    updatePlayhead,
    setPlayheadOfEpisode,
    clearCurrentlyPlaying,
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

