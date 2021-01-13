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

    playEpisode(context, payload) {
      let alreadyPlaying = Helpers.playingAudio.paused ? false : true
      let id = payload.hasOwnProperty('id') ? payload.id : null
      let startPlaying = payload.hasOwnProperty('startPlaying') ? payload.startPlaying : false

      if (Helpers.playingAudio && !Helpers.playingAudio.paused) {
        Helpers.playingAudio.pause()
      }

       return Helpers.dexieDB.episodes
        .where({ _id: id })
        .first()
        .then(episode => {
          return Helpers.dexieDB.podcasts
            .where({ _id: episode.podcast_id })
            .first()
            .then(podcast => {
              episode.podcast = podcast

              context.commit('setPlayingEpisode', episode)
            })
        }).then(() => {
          Helpers.playingAudio.src = context.state.playingEpisode.enclosure.url
          Helpers.playingAudio.currentTime = context.state.playingEpisode.playhead

          Helpers.playingAudio.addEventListener('timeupdate', (event) => {
            context.commit('updatePlayhead', Helpers.playingAudio.currentTime)
          })

          setInterval(() => {
            Helpers.dexieDB.episodes.where({ _id: id }).modify({ playhead: context.state.playingEpisode.playhead })
          }, 5000)

          Helpers.playingAudio.load()

          if (alreadyPlaying || startPlaying) Helpers.playingAudio.play()
        })
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
    }
  }
})

