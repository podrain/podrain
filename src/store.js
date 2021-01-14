import { createStore } from 'vuex'
import Helpers from './Helpers'
import _ from 'lodash'

export default createStore({
  state() {
    return {
      queue: [],
      playingEpisode: {},
      paused: true
    }
  },

  getters: {
    currentlyPlayingInQueue(state) {
      return state.queue.filter(qe => qe.currently_playing == true)[0]
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

    clearCurrentlyPlaying(state) {
      for (let i = 0; i < state.queue.length; i++) {
        state.queue[i].currently_playing = false
      }
    },

    setCurrentlyPlaying(state, id) {
      let episodeIndex = _.findIndex(state.queue, qe => qe._id == id)
      state.queue[episodeIndex].currently_playing = true
    }
  },

  actions: {
    getQueue(context) {
      context.commit('clearQueue')

      return Helpers.dexieDB.episodes.filter(ep => {
        return ep.queue > 0
      }).toArray().then(queuedEpisodes => {
        return queuedEpisodes.map(async (qe) => {
          qe.podcast = await Helpers.dexieDB.podcasts.where({ _id: qe.podcast_id }).first()
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
      let currentEpisode = context.state.queue.filter(qe => id == qe._id)[0]
      
      return Helpers.dexieDB.episodes.where({ _id: id }).modify({ queue: 0 }).then(() => {
        context.commit('removeEpisodeFromQueue', id)

        return Helpers.dexieDB.episodes.filter(ep => {
          return ep.queue > currentEpisode.queue
        }).toArray()
      }).then(higherInQueue => {
        let queuePromises = []

        if (higherInQueue.length > 0) {
          for (let hiq of higherInQueue) {
            hiq.queue -= 1
            queuePromises.push(
              Helpers.dexieDB.episodes
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

          return Promise.all(queuePromises)
        } else {
          return Promise.resolve()
        }
      })
    },

    async addEpisodeToQueue(context, id) {
      let episodesInQueue = await Helpers.dexieDB.episodes.filter(ep => {
        return ep.queue > 0
      }).toArray()
      
      let highestQueue = episodesInQueue.length > 0 ? Math.max(...episodesInQueue.map(ep => ep.queue)) : 0
      let newHighestQueue = highestQueue + 1
      await Helpers.dexieDB.episodes
        .where({ _id: id })
        .modify({ queue: newHighestQueue })
    
      let episode = await Helpers.dexieDB.episodes
        .where({ _id: id })
        .first()

      episode.podcast = await Helpers.dexieDB.podcasts
        .where({ _id: episode.podcast_id })
        .first()
    
      context.commit('addEpisodeToQueue', episode)
    },

    async playEpisode(context, payload) {
      let alreadyPlaying = Helpers.playingAudio.paused ? false : true
      let id = payload.hasOwnProperty('id') ? payload.id : null
      let startPlaying = payload.hasOwnProperty('startPlaying') ? payload.startPlaying : false

      if (Helpers.playingAudio && !Helpers.playingAudio.paused) {
        Helpers.playingAudio.pause()
      }

      await Helpers.dexieDB.episodes
        .filter(ep => ep.currently_playing == true)
        .modify({ currently_playing: false })
        
      context.commit('clearCurrentlyPlaying')

      let episode = await Helpers.dexieDB.episodes.where({ _id: id }).first()
            
      let podcast = await Helpers.dexieDB.podcasts
        .where({ _id: episode.podcast_id })
        .first()
        
      episode.podcast = podcast

      context.commit('setPlayingEpisode', episode)

      await Helpers.dexieDB.episodes
        .where({ _id: id })
        .modify({ currently_playing: true })
          
      context.commit('setCurrentlyPlaying', id)
         
      Helpers.playingAudio.src = context.state.playingEpisode.enclosure.url
      Helpers.playingAudio.currentTime = context.state.playingEpisode.playhead

      Helpers.playingAudio.addEventListener('timeupdate', (event) => {
        context.commit('updatePlayhead', Helpers.playingAudio.currentTime)
      })

      Helpers.playingAudio.load()

      if (alreadyPlaying || startPlaying) Helpers.playingAudio.play()
    },

    playOrPause(context) {
      if (Helpers.playingAudio.paused) {
        Helpers.playingAudio.play()
      } else {
        Helpers.playingAudio.pause()
      }
    },

    jumpAhead() {
      Helpers.playingAudio.currentTime += 15
    },

    jumpBack() {
      Helpers.playingAudio.currentTime -= 15
    },

    setPlayhead(context, value) {
      Helpers.playingAudio.currentTime = value
      context.commit('updatePlayhead', Helpers.playingAudio.currentTime)
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
        await context.dispatch('removeEpisodeFromQueue', oldEpisodeId)
        await Helpers.dexieDB.episodes.where({ _id: oldEpisodeId }).modify({ playhead: 0, played: true })
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
            Helpers.dexieDB.episodes
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
            Helpers.dexieDB.episodes
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
        Helpers.dexieDB.episodes
          .where({ _id: episodeID })
          .modify({ queue: newOrder })
          .then(() => {
            context.commit('setQueueOfEpisode', {
              episodeID: episodeID, 
              newQueue: newOrder,
            })
          }),
        ...reorderPromises
      ])
    }
  }
})

