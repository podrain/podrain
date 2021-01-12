import { createStore } from 'vuex'
import Helpers from './Helpers'

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
    }
  },

  actions: {
    getQueue(context) {
      context.commit('clearQueue')

      Helpers.dexieDB.episodes.filter(ep => {
        return ep.queue > 0
      }).toArray().then(queuedEpisodes => {
        return queuedEpisodes.map(async (qe) => {
          qe.podcast = (await Helpers.dexieDB.podcasts.where({ _id: qe.podcast_id }).toArray())[0]
          return qe
        })
      }).then(episodesWithPodcastsPromises => {
        return Promise.all(episodesWithPodcastsPromises)
      }).then(episodesWithPodcasts => {
        for (let ep of episodesWithPodcasts) {
          context.commit('addEpisodeToQueue', ep)
        }
      })
    }
  }
})

