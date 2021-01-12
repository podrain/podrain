import { createStore } from 'vuex'
import Helpers from './Helpers'
import _ from 'lodash'

export default createStore({
  state() {
    return {
      queue: []
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
    }
  }
})

