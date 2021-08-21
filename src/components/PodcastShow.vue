<template>
  <div class="responsive-width">
    <div class="flex flex-col">
      <div class="flex">
        <div class="w-1/3 m-3">
          <StoredImage v-if="podcast._id" :id="podcast._id" :backupURL="podcast.meta.imageURL" />
        </div>
        <div class="w-2/3 flex flex-col justify-center text-lg py-3 pr-3">
          <h1 class="text-white font-bold leading-snug">{{ podcast.meta.title }}</h1>
          <div class="mt-3 flex-col">
            <div class="flex">
              <button 
                class="text-white bg-indigo-500 p-2 text-sm flex-1"
                @click="refreshEpisodes"
              >
                <font-awesome-icon class="mr-1" icon="sync" v-if="refreshing" pulse />
                <font-awesome-icon class="mr-1" icon="sync" v-else />
                Refresh
              </button>
              <button 
                class="text-white bg-red-500 p-2 text-sm flex-1"
                @click="deletePodcast"
              >
                <font-awesome-icon class="mr-1" icon="spinner" v-if="deleting" spin />
                <font-awesome-icon class="mr-1" icon="times" v-else />
                Delete
              </button>
            </div>
            <button 
              class="bg-yellow-500 p-2 text-sm w-full"
              @click="$router.push('/podcasts/'+podcast._id+'/search')"
            >
              <font-awesome-icon class="mr-1" icon="search" />
              Search episodes
            </button>
          </div>
        </div>
      </div>

      <ul class="mx-3 mb-3">
        <li 
          class="flex flex-col mt-3" 
          v-for="ep in episodes" 
          :key="ep._id"
        >
          <div 
            class="p-3 relative bg-gray-700"
            @click="showEpisodeModal(ep._id)"
          >
            <div v-if="ep.played" class="w-8 h-8 bg-yellow-500 absolute bottom-0 left-0 flex justify-center items-center">
              <font-awesome-icon icon="check" />
            </div>

            <div class="text-white leading-tight text-xs font-bold truncate">{{ ep.title }}</div>

            <div class="flex mt-3">
              <div class="w-1/5">
                <img :src="ep.imageURL || podcast.meta.imageURL" />
              </div>
              <div class="w-4/5 text-xs font-light ml-3 text-gray-300">
                <span class="italic">{{ prepareDateString(ep.pubDate) }}</span>&nbsp;—&nbsp;
                {{ prepareDescriptionString(ep.description) }}
                <div class="mt-2 font-bold">
                  <font-awesome-icon icon="clock" /> {{ prepareHumanFriendlyDuration(ep.duration) }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex">
            <button 
              class="w-1/5 bg-blue-500"
              @click="playOrPauseEpisode(ep._id)"
            >
              <font-awesome-icon v-if="isPlaying(ep._id)" class="text-white" icon="pause" />
              <font-awesome-icon v-else class="text-white" icon="play" />
            </button>

            <div class="flex-1">
              <div
                v-if="queueChanging"
                class="bg-gray-500 text-white text-center p-1"
              >
                queue changing
              </div>
              <template
                v-else
              >
                <button 
                  v-if="queue.map(qe => qe._id).includes(ep._id)"
                  class="w-full bg-red-500 text-white p-1"
                  @click="removeFromQueue(ep._id)"
                >Remove from queue</button>
                <button
                  v-else
                  class="w-full bg-green-500 text-white p-1"
                  @click="addToQueue(ep._id)"
                >Add to queue</button>
              </template>
            </div>
          </div>
        </li>
      </ul>

      <button
        class="bg-purple-500 text-white mx-3 mb-3 p-3"
        @click="getMoreEpisodes"
      >
        Show More
      </button>
    </div>

    <o-modal 
      :active="episodeModalShowing" 
      :onCancel="hideEpisodeModal"
      contentClass="bg-gray-700 text-white p-3"
      mobileClass="px-3"
      scroll="clip"
    >
    <div class="p-3">
      <h1 class="text-white text-xl">{{ episodeModalContent.title }}</h1>
      <div class="flex mt-3">
        <div class="prose-sm prose-episode-details" v-html="episodeModalContent.description"></div>
      </div>
    </div>
    </o-modal>
  </div>
</template>

<script>
import { Shared } from '../State'
import { cleanHTMLString, truncateString, humanFriendlyDuration } from '../Helpers'
import { DateTime } from 'luxon'
import feedParser from 'https://jspm.dev/better-podcast-parser'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import StoredImage from './StoredImage.vue'

export default {
  components: {
    StoredImage
  },

  data() {
    return {
      podcast: {
        meta: {
          title: '',
          imageURL: '',
        }
      },
      allEpisodes: [],
      episodes: [],
      refreshing: false,
      deleting: false,
      episodeModalShowing: false,
      episodeModalContent: {}
    }
  },

  computed: {
    queue() {
      return this.$store.state.queue
    },

    queueChanging() {
      return this.$store.state.queueChanging
    },
  },

  methods: {
    getEpisodes() {
      return Shared.dexieDB.episodes.where({
        podcast_id: this.podcast._id
      }).reverse().sortBy('pubDate').then(allEpisodes => {
        this.allEpisodes = allEpisodes
        this.episodes = this.allEpisodes.slice(0, 10)
      })
    },

    getMoreEpisodes() {
      let newBatch = this.allEpisodes.slice(this.episodes.length, this.episodes.length + 10)
      this.episodes = this.episodes.concat(newBatch)
    },

    async deletePodcast() {
      var self = this
      this.deleting = true

      function removeEpisodesFromQueue(episodes) {
        let sequence = Promise.resolve()

        for (let ep of episodes) {
          if (ep.podcast_id == self.podcast._id) {
            sequence = sequence.then(() => self.$store.dispatch('removeEpisodeFromQueue', ep._id))
          }
        }

        return sequence
      }

      await removeEpisodesFromQueue(this.$store.state.queue)

      let deletePodcastOnly = Shared.dexieDB.podcasts.where({ _id: this.podcast._id }).delete()
      let deleteEpisodes = Shared.dexieDB.episodes.where({ podcast_id: this.podcast._id }).delete()

      await Promise.all([deletePodcastOnly, deleteEpisodes])
      this.deleting = false
      this.$router.push('/podcasts')
    },

    prepareDescriptionString(string) {
      if (string) {
        let parsedString = cleanHTMLString(string)
        return truncateString(parsedString)
      } else {
        return 'No description available.'
      }
    },

    prepareDateString(string) {
      return DateTime.fromISO(string).toFormat('D')
    },

    prepareHumanFriendlyDuration(seconds) {
      return humanFriendlyDuration(seconds)
    },

    removeFromQueue(id) {
      this.$store.dispatch('removeEpisodeFromQueue', id)
    },

    addToQueue(id) {
      this.$store.dispatch('addEpisodeToQueue', id)
    },

    async refreshEpisodes() {
      this.refreshing = true
      let podcastRefreshed = await feedParser.parseURL(this.podcast.feed_url, {
        proxyURL: localStorage.getItem('proxy_url'),
        getAllPages: true
      })

      let newEpisodes = podcastRefreshed.episodes.filter(ep => {
        return ep && ep.hasOwnProperty('pubDate') && ep.pubDate > _.max(this.episodes.map(epCurr => epCurr.pubDate))
      }).map(ep => {
        return _.merge(ep, {
          '_id': uuidv4(),
          'podcast_id': this.podcast._id,
          'queue': 0,
          'playhead': 0,
          'currently_playing': 0,
          'played': ''
        })
      })

      await Shared.dexieDB.episodes.bulkAdd(newEpisodes)
      await this.getEpisodes()
      this.refreshing = false
    },

    playOrPauseEpisode(id) {
      this.$store.dispatch('playOrPauseEpisode', id)
    },

    isPlaying(id) {
      return this.$store.getters.isPlaying(id)
    },

    showEpisodeModal(id) {
      this.episodeModalShowing = true
      this.episodeModalContent = this.episodes.filter(ep => ep._id == id)[0]
    },

    hideEpisodeModal() {
      this.episodeModalShowing = false
      this.episodeModalContent = ''
    }
  },

  created() {
    Shared.dexieDB.podcasts.where({ _id: this.$route.params.id }).toArray().then(result => {
      this.podcast = result[0]

      return this.getEpisodes()
    })
  },
}
</script>