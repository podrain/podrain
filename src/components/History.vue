<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white text-xl text-center">Your episode history</h1>

      <div v-if="loading" class="flex justify-center mt-4">
        <font-awesome-icon class="text-white text-4xl" icon="spinner" spin/>
      </div>
      <div v-else>
        <ul>
          <li class="text-white mt-3" v-for="ep in playHistory" :key="ep._id">
            <div 
              class="bg-gray-700 p-3"
              @click="visitEpisodeShow(ep._id)"
            >
              <h2>{{ ep.title }}</h2>
              <p class="text-xs text-gray-300">{{ prepareDescriptionString(ep.description) }}</p>
              <div class="text-sm mt-2">
                <font-awesome-icon icon="clock" /> {{ prepareHumanFriendlyDuration(ep.duration) }}
              </div>
            </div>
            <button 
              v-if="queue.map(qe => qe._id).includes(ep._id)"
              class="bg-red-500 w-full text-white p-1"
              @click="removeFromQueue(ep._id)"
            >Remove from queue</button>
            <button
              v-else
              class="bg-green-500 w-full text-white p-1"
              @click="addToQueue(ep._id)"
            >Add to queue</button>
          </li>
        </ul>

        <button
          class="bg-purple-500 text-white mt-3 p-3 w-full"
          @click="getMorePlayHistory"
        >
          Show More
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { cleanHTMLString, truncateString, humanFriendlyDuration } from '../Helpers'
import { Shared } from '../State'

export default {
  data() {
    return {
      loading: false,
      playHistory: [],
    }
  },

  computed: {
    queue() {
      return this.$store.state.queue
    }
  },

  methods: {
    prepareDescriptionString(string) {
      if (string) {
        let parsedString = cleanHTMLString(string)
        return truncateString(parsedString, 150)
      } else {
        return 'No description available.'
      }
    },

    prepareHumanFriendlyDuration(seconds) {
      return humanFriendlyDuration(seconds)
    },

    addToQueue(id) {
      this.$store.dispatch('addEpisodeToQueue', id)
    },

    removeFromQueue(id) {
      this.$store.dispatch('removeEpisodeFromQueue', id)
    },

    getMorePlayHistory() {
      Shared.dexieDB.episodes.where('played')
        .notEqual('')
        .reverse()
        .offset(this.playHistory.length)
        .limit(10)
        .sortBy('played')
        .then(result => {
          this.playHistory = this.playHistory.concat(result)
        })
    },

    visitEpisodeShow(id) {
      this.$router.push('/episodes/'+id)
    }
  },

  created() {
    this.loading = true

    Shared.dexieDB.episodes.where('played')
      .notEqual('')
      .reverse()
      .limit(10)
      .sortBy('played')
      .then(result => {
        this.playHistory = result
        this.loading = false
      })
  }
}
</script>