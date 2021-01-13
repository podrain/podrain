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

    addEpisodeToQueue(context, id) {
      return Helpers.dexieDB.episodes.filter(ep => {
        return ep.queue > 0
      }).toArray().then(episodesInQueue => {
        let highestQueue = episodesInQueue.length > 0 ? Math.max(...episodesInQueue.map(ep => ep.queue)) : 0

        let newHighestQueue = highestQueue + 1
        return Helpers.dexieDB.episodes
          .where({ _id: id })
          .modify({ queue: newHighestQueue })
      }).then(() => {
        return Helpers.dexieDB.episodes
          .where({ _id: id })
          .first()
      }).then(episode => {
        context.commit('addEpisodeToQueue', episode)
      })
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
      if (context.state.playingEpisode.queue == lastInQueue.queue) {
        await context.dispatch('playEpisode', { id: firstInQueue._id, startPlaying })
      } else {
        let nextInQueue = context.state.queue.filter(qe => qe.queue == context.state.playingEpisode.queue + 1)[0]
        
        await context.dispatch('playEpisode', { id: nextInQueue._id, startPlaying })
      }

      if (finishEpisode) {
        await context.dispatch('removeEpisodeFromQueue', oldEpisodeId)
        await Helpers.dexieDB.episodes.where({ _id: oldEpisodeId }).modify({ playhead: 0, played: true })
      }
    },

    playPrev(context) {
      if (context.state.playingEpisode.queue == 1) {
        let lastInQueue = _.reverse(_.sortBy(context.state.queue, ['queue']))[0]
        context.dispatch('playEpisode', { id: lastInQueue._id })
      } else {
        let prevInQueue = context.state.queue.filter(qe => qe.queue == context.state.playingEpisode.queue - 1)[0]
        context.dispatch('playEpisode', { id: prevInQueue._id })
      }
    }
  }
})

