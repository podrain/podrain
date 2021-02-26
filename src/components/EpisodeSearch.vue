<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white">Search episodes in <span class="italic">{{ podcast?.meta?.title }}</span></h1>
      <input 
        class="p-1 w-full mt-1"
        v-model="search"
      />
      <ul>
        <li class="text-white mt-3" v-for="sr in searchResults" :key="sr._id">
          <div class="bg-gray-700 p-3">
            <h2>{{ sr.title }}</h2>
            <p class="text-xs text-gray-300">{{ prepareDescriptionString(sr.description) }}</p>
            <div class="text-sm mt-2">
              <font-awesome-icon icon="clock" /> {{ prepareHumanFriendlyDuration(sr.duration) }}
            </div>
          </div>
          <button 
            v-if="queue.map(qe => qe._id).includes(sr._id)"
            class="bg-red-500 w-full text-white p-1"
            @click="removeFromQueue(sr._id)"
          >Remove from queue</button>
          <button
            v-else
            class="bg-green-500 w-full text-white p-1"
            @click="addToQueue(sr._id)"
          >Add to queue</button>
        </li>

      </ul>
    </div>
  </div>
</template>

<script>
import { cleanHTMLString, truncateString, humanFriendlyDuration } from '../Helpers'
import { Shared } from '../State'
import _ from 'lodash'

export default {
  data() {
    return {
      podcast: {},
      search: '',
      episodes: [],
      searchResults: []
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
  },

  watch: {
    search: _.debounce(function(value) {
      this.searchResults = this.episodes.filter(ep => {
        let lowerCaseDesc = ep.description.toLowerCase()
        let lowerCaseTitle = ep.title.toLowerCase()
        return lowerCaseDesc.includes(value.toLowerCase()) || lowerCaseTitle.includes(value.toLowerCase())
      })
    }, 1000)
  },

  created() {
    let getPodcasts = Shared.dexieDB.podcasts
      .where({ _id: this.$route.params.id })
      .first()
      .then(podcast => {
        this.podcast = podcast
      })

    let getEpisodes = Shared.dexieDB.episodes
      .where({ podcast_id: this.$route.params.id })
      .toArray()
      .then(episodes => {
        this.episodes = episodes
      })

    Promise.all([
      getPodcasts,
      getEpisodes
    ])
  }
}
</script>