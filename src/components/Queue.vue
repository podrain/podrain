<template>
  <ul 
    id="queue-list"
    class="mx-3 mb-3"
  >
    <li 
      class="flex flex-col mt-3" 
      v-for="ep in queue" 
      :key="ep._id"
      :data-id="ep._id"
    >
      <div 
        class="flex"
        :class="[ ep.currently_playing ? 'bg-orange-500' : 'bg-gray-700' ]"
      >
        <div 
          class="p-3 relative w-full"
          @click="$router.push('/episodes/'+ep._id)"
        >
          <div v-if="ep.played" class="w-8 h-8 bg-yellow-500 absolute bottom-0 left-0 flex justify-center items-center">
            <font-awesome-icon icon="check" />
          </div>

          <div class="text-white leading-tight text-xs font-bold">{{ ep.title }}</div>

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

        <button 
          class="queue-dragbar bg-purple-500 w-10 text-white"
          :disabled="queueChanging"
        >
          <template v-if="queueChanging">
            <font-awesome-icon icon="spinner" spin />
          </template>
          <template v-else>
            <font-awesome-icon icon="bars" />
          </template>
        </button>
      </div>

      <div class="flex">
        <button 
          class="bg-blue-500 text-white px-4"
          @click="playEpisode(ep._id)"
        >
          <font-awesome-icon icon="play" />
        </button>
        <button 
          class="flex-1 bg-red-500 text-white p-1"
          @click="removeFromQueue(ep._id)"
        >
          <template v-if="queueChanging">
            <font-awesome-icon icon="spinner" spin />
          </template>
          <template v-else>
            Remove from queue
          </template>
        </button>
        <button
          class="text-white w-1/3"
          :class="[isDownloading(ep._id) ? 'bg-gray-500' : isDownloaded(ep._id) ? 'bg-green-500' : 'bg-blue-500']"
          @click="downloadEpisode(ep._id)"
        >
          <span v-if="isDownloading(ep._id)">{{ downloadProgress(ep._id)+'%' }}</span>
          <span v-else-if="isDownloaded(ep._id)">Downloaded</span>
          <span v-else>Download</span>
        </button>
      </div>
    </li>
  </ul>
</template>

<script>
import Helpers from '../Helpers'
import { DateTime } from 'luxon'
import _ from 'lodash'
import Sortable from 'sortablejs'

export default {
  computed: {
    queue() {
      return this.$store.getters.queueInOrder
    },

    downloading() {
      return this.$store.state.downloading
    },

    queueChanging() {
      return this.$store.state.queueChanging
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
      this.$store.dispatch('playEpisode', { id: id, startPlaying: true })
    },

    async downloadEpisode(id) {
      if (this.isDownloaded(id)) {
        this.$store.dispatch('removeDownload', id)
      } else {
        this.$store.dispatch('downloadEpisode', id)
      } 
    },

    isDownloading(id) {
      return this.$store.state.downloading.map(dl => dl.id).includes(id)
    },

    downloadProgress(id) {
      return this.$store.state.downloading.filter(dl => dl.id == id)[0].progress
    },

    isDownloaded(id) {
      return this.$store.state.downloaded.includes(id)
    },
  },

  mounted() {
    var self = this

    let queueList = document.getElementById('queue-list')
    let sortable = Sortable.create(queueList, {
      handle: '.queue-dragbar',
      scroll: true,
      animation: 150,

      onUpdate(evt) {
        let newOrder = evt.newIndex + 1
        let episodeID = evt.item.dataset.id
        self.$store.dispatch('reorderQueue', {
          episodeID,
          newOrder
        })
      }
    })
  }
}
</script>