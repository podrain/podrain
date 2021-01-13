<template>
  <ul class="mx-3 mb-3">
    <li 
      class="flex flex-col mt-3" 
      v-for="ep in queue" 
      :key="ep._id"
    >
      <div 
        class="p-3 relative bg-gray-700"
        @click="$router.push('/episodes/'+ep._id)"
      >
        <div v-if="ep.played" class="w-8 h-8 bg-yellow-500 absolute bottom-0 left-0 flex justify-center items-center">
          <font-awesome-icon icon="check" />
        </div>

        <div class="text-white leading-tight text-xs font-bold truncate">{{ ep.title }}</div>

        <div class="flex mt-3">
          <div class="w-1/5">
            <img :src="ep.imageURL || ep.podcast.meta.imageURL" />
          </div>
          <div class="w-4/5 text-xs font-light ml-3 text-gray-300">
            <span class="italic">{{ prepareDateString(ep.pubDate) }}</span>&nbsp;—&nbsp;
            {{ prepareDescriptionString(ep.description) }}
          </div>
        </div>
      </div>

      <div class="flex">
        <button 
          class="w-1/4 bg-blue-500 text-white p-1"
          @click="playEpisode(ep._id)"
        >Play</button>
        <button 
          class="w-3/4 bg-red-500 text-white p-1"
          @click="removeFromQueue(ep._id)"
        >Remove from queue</button>
      </div>
    </li>
  </ul>
</template>

<script>
import Helpers from '../Helpers'
import { DateTime } from 'luxon'
import _ from 'lodash'

export default {
  computed: {
    queue() {
      return this.$store.state.queue
    }
  },
  
  methods: {
    prepareDescriptionString(string) {
      if (string) {
        let parsedString = Helpers.cleanHTMLString(string)
        return Helpers.truncateString(parsedString)
      } else {
        return 'No description available.'
      }
    },

    prepareDateString(string) {
      return DateTime.fromISO(string).toFormat('D')
    },

    removeFromQueue(episodeID) {
      this.$store.dispatch('removeEpisodeFromQueue', episodeID)
    },

    playEpisode(id) {
      this.$store.dispatch('playEpisode', { id: id })
    }
  },

  created() {
    this.$store.dispatch('getQueue')
  }
}
</script>