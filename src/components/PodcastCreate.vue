<template>
    <div class="p-3">
      <div class="text-white text-2xl">Add Podcast</div>
      <div class="flex mt-3">
        <button 
          class="flex-1 p-3 text-white"
          :class="[selectedTab == 'search' ? 'bg-orange-500' : 'bg-gray-900']"
          @click="selectedTab = 'search'"
        >
          <font-awesome-icon icon="search" />
          Search
        </button>
        <button 
          class="flex-1 p-3 text-white"
          :class="[selectedTab == 'rss' ? 'bg-orange-500' : 'bg-gray-900']"
          @click="selectedTab = 'rss'"
        >
          <font-awesome-icon icon="rss" />
          RSS
        </button>
      </div>

      <div v-if="selectedTab == 'search'">
        <input 
            type="text"
            class="w-full mt-3 p-1"
            placeholder="Podcast title to search..."
            v-model="search"
          />

          <ul class="mt-3">
            <li 
              class="text-white flex mt-3"
              v-for="sr in searchResults"
              :key="sr.collectionId"
            >
              <img class="w-1/5" :src="sr.artworkUrl100" />
              <div class="w-4/5 p-2 bg-gray-700 flex-1">
                <h3>{{ sr.collectionName }}</h3>
                <span v-if="addingSearchedPodcast.url == sr.feedUrl" class="text-gray-200 text-sm">{{ addingSearchedPodcast.episodesAdded }} / {{ addingSearchedPodcast.episodesTotal }} episodes added</span>
                <span v-else class="text-gray-200 text-sm">{{ sr.trackCount }} episodes</span>
              </div>
              <button
                v-if="addingSearchedPodcast.url == sr.feedUrl" 
                class="bg-green-500 w-10"
                disabled
              >
                <font-awesome-icon 
                  icon="spinner" 
                  spin
                />
              </button>
              <button 
                v-else
                class="bg-green-500 w-10"
                @click="addSearchedPodcast(sr.feedUrl)"
                :disabled="addingSearchedPodcast.url != '' && (addingSearchedPodcast.url != sr.feedUrl)"
              >
                <font-awesome-icon 
                  icon="plus" 
                />
              </button>
            </li>
          </ul>
      </div>

      <div v-if="selectedTab == 'rss'">
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
</template>

<script>
import Helpers from '../Helpers'
import feedParser from 'https://jspm.dev/better-podcast-parser'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'

export default {
  data() {
    return {
      selectedTab: 'search',
      manualRssUrl: '',
      search: '',
      searchResults: [],
      addingSearchedPodcast: {
        url: '',
        adding: false,
        episodesAdded: 0,
        episodesTotal: 0,
      }
    }
  },

  methods: {
    addManualRssUrl() {
      this.addPodcast(this.manualRssUrl).then(() => {
        this.$router.push('/podcasts')
      })
    },

    addSearchedPodcast(url) {
      this.addPodcast(url).then(() => {
        this.$router.push('/podcasts')
      })
    },

    addPodcast(podcastUrl) {
      this.addingSearchedPodcast.url = podcastUrl
      let cleanedUrl = podcastUrl.replace(/(?!:\/\/):/g, '%3A')

      return feedParser.parseURL(cleanedUrl, {
        proxyURL: localStorage.getItem('proxy_url'),
        getAllPages: true,
      }).then(podcast => {
        let podcastOnly = _.clone(podcast)
        delete podcastOnly.episodes

        let podcastID = uuidv4()
        this.addingSearchedPodcast.episodesTotal = podcast.episodes.length
        let addPodcast = Helpers.dexieDB.podcasts.add(_.merge(podcastOnly, {
          '_id': podcastID,
          'feed_url': cleanedUrl
        }))

        let addPodcastEpisodes = []
        for (let ep of podcast.episodes) {
          addPodcastEpisodes.push(Helpers.dexieDB.episodes.add(_.merge(ep, {
            '_id': uuidv4(),
            'podcast_id': podcastID,
            'queue': 0,
            'playhead': 0,
            'currently_playing': 0,
            'played': false
          })).then(() => {
            this.addingSearchedPodcast.episodesAdded += 1
          }))
        }

        return Promise.all([addPodcast, ...addPodcastEpisodes]).then(() => {
          this.addingSearchedPodcast.url = ''
          this.addingSearchedPodcast.adding = false
          this.addingSearchedPodcast.episodesAdded = 0
          this.addingSearchedPodcast.episodesTotal = 0
        })
      })
    },
  },

  watch: {
    search: _.debounce(function(value) {
      let searchURL = 'https://itunes.apple.com/search?' + new URLSearchParams({
        term: value,
        media: 'podcast',
        entity: 'podcast'
      })

      fetch(searchURL)
        .then(response => {
          return response.json()
        }).then(responseJSON => {
          this.searchResults = responseJSON.results
        })
    }, 250)
  }
}
</script>