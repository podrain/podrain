<template>
  <Layout>
    <div class="flex flex-col">
      <div class="flex">
        <div class="w-1/3 m-3">
          <img v-if="podcast" :src="podcast.meta.imageURL" />
        </div>
        <div class="w-2/3 flex flex-col justify-center text-lg py-3 pr-3">
          <h1 class="text-white font-bold leading-snug">{{ podcast.meta.title }}</h1>
          <div class="mt-3 flex-col">
            <div class="flex">
              <button 
                class="text-white bg-indigo-500 p-2 text-sm flex-1"
              >
                <font-awesome-icon class="mr-1" icon="sync" />
                Refresh
              </button>
              <button 
                class="text-white bg-red-500 p-2 text-sm flex-1"
                @click="deletePodcast"
              >
                <font-awesome-icon class="mr-1" icon="times" />
                Delete
              </button>
            </div>
            <button 
              class="bg-yellow-500 p-2 text-sm w-full"
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
          @click="$router.push(`/episodes/${ep._id}`)"
        >
          <div class="p-3 relative bg-gray-700">
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
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </Layout>
</template>

<script>
import Layout from './Layout.vue'
import Helpers from '../Helpers'
import { DateTime } from 'luxon'

export default {
  components: {
    Layout
  },

  data() {
    return {
      podcast: {
        meta: {
          title: '',
          imageURL: '',
        }
      },

      episodes: []
    }
  },

  methods: {
    getEpisodes() {
      Helpers.dexieDB.episodes.where({
        podcast_id: this.podcast._id
      }).reverse().sortBy('pubDate').then(allEpisodes => {
        this.episodes = allEpisodes.splice(0, 10)
      })
    },

    deletePodcast() {
      let deletePodcastOnly = Helpers.dexieDB.podcasts.where({ _id: this.podcast._id }).delete()
      let deleteEpisodes = Helpers.dexieDB.episodes.where({ podcast_id: this.podcast._id }).delete()

      Promise.all([deletePodcastOnly, deleteEpisodes]).then(() => {
        this.$router.push('/podcasts')
      })
    },

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
    }
  },

  created() {
    Helpers.dexieDB.podcasts.where({ _id: this.$route.params.id }).toArray().then(result => {
      this.podcast = result[0]

      return this.getEpisodes()
    })
  },
}
</script>