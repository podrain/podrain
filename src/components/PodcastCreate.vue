<template>
  <Layout>
    <div class="p-3">
      <div class="text-white text-2xl">Add Podcast</div>
      <div class="flex-mt-3">
        <input 
          type="text" 
          class="w-full mt-3 p-1" 
          placeholder="https://example.com/podcast/feed"
          v-model="manualRssUrl"
        >
        <button 
          class="w-full bg-green-500 mt-3 p-2 text-white"
          @click="addManualRssUrl"
        >Submit</button>
      </div>
    </div>
  </Layout>
</template>

<script>
import Layout from './Layout.vue'
import Helpers from '../Helpers'
import feedParser from 'https://jspm.dev/better-podcast-parser'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'

export default {
  components: {
    Layout
  },

  data() {
    return {
      feedUrl: '',
      manualRssUrl: '',
    }
  },

  methods: {
    addManualRssUrl() {
      this.addPodcast(this.manualRssUrl)
    },

    addPodcast(podcastUrl) {
      let preUrl = podcastUrl
      this.feedUrl = preUrl.replace(/(?!:\/\/):/g, '%3A')

      feedParser.parseURL(this.feedUrl, {
        proxyURL: localStorage.getItem('proxy_url'),
        getAllPages: true,
      }).then(podcast => {
        console.log(podcast)

        let podcastOnly = _.clone(podcast)
        delete podcastOnly.episodes

        let podcastID = uuidv4()

        let addPodcast = Helpers.dexieDB.podcasts.add(_.merge(podcastOnly, {
          '_id': podcastID,
          'feed_url': this.feedUrl
        }))

        let addPodcastEpisodes = []
        for (let ep of podcast.episodes) {
          addPodcastEpisodes.push(Helpers.dexieDB.episodes.add(_.merge(ep, {
            '_id': uuidv4(),
            'podcast_id': podcastID,
            'queue': 0,
            'playhead': 0,
            'currently_playing': false,
            'played': false
          })))
        }

        return Promise.all([addPodcast, ...addPodcastEpisodes])
      }).then(() => {
        this.$router.push('/podcasts')
      })
    }
  }
}
</script>