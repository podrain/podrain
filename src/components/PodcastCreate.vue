<template>
  <div class="responsive-width">
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

          <div v-if="searching" class="text-white text-center text-4xl mt-6"><font-awesome-icon icon="spinner" spin /></div>

          <ul else class="mt-3">
            <li 
              class="text-white flex mt-3"
              v-for="sr in searchResults"
              :key="sr.collectionId"
            >
              <img class="w-1/5" :src="sr.artworkUrl100" />
              <div class="w-4/5 p-2 bg-gray-700 flex-1">
                <h3>{{ sr.collectionName }}</h3>
                <span v-if="addingPodcast.url == sr.feedUrl" class="text-gray-200 text-sm">{{ addingPodcast.episodesAdded }} / {{ addingPodcast.episodesTotal }} episodes added</span>
                <span v-else class="text-gray-200 text-sm">{{ sr.trackCount }} episodes</span>
              </div>
              <button
                v-if="addingPodcast.url == sr.feedUrl" 
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
                :disabled="addingPodcast.url != '' && (addingPodcast.url != sr.feedUrl)"
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
          :disabled="addingPodcast.adding"
          class="w-full bg-green-500 mt-3 p-2 text-white"
          @click="addManualRssUrl"
        >
          <template v-if="addingPodcast.adding">
            <font-awesome-icon icon="spinner"  class="mr-2" spin />Adding podcast...
          </template>
          <template v-else>
            <font-awesome-icon icon="check" class="mr-2" />Submit
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Shared } from '../State'
import feedParser from 'better-podcast-parser'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { iOS, customTitle } from '../Helpers'

customTitle('Add Podcast')

const router = useRouter()

const selectedTab = ref('search')
const manualRssUrl = ref('')
const search = ref('')
const searchResults = ref([])
const searching = ref(false)
const addingPodcast = ref({
  url: '',
  adding: false,
  episodesAdded: 0,
  episodesTotal: 0,
})

const addPodcast = (podcastUrl) => {
  addingPodcast.value.adding = true
  addingPodcast.value.url = podcastUrl
  let cleanedUrl = podcastUrl.replace(/(?!:\/\/):/g, '%3A')

  return feedParser.parseURL(cleanedUrl, {
    proxyURL: localStorage.getItem('proxy_url'),
    getAllPages: true,
  }).then(podcast => {
    let podcastOnly = _.clone(podcast)
    delete podcastOnly.episodes

    let podcastID = uuidv4()
    addingPodcast.value.episodesTotal = podcast.episodes.length
    let addPodcast = Shared.dexieDB.podcasts.add(_.merge(podcastOnly, {
      '_id': podcastID,
      'feed_url': cleanedUrl
    })).then(() => {
      if (iOS()) {
        return Promise.resolve()
      }

      return axios.get(
        localStorage.getItem('proxy_url') + podcastOnly.meta.imageURL,
        {
          headers: {
            'Accept': 'image/*'
          },
          responseType: 'arraybuffer'
        }
      )
    }).then(response => {
      if (iOS()) {
        return Promise.resolve()
      }

      let imageType = response.headers['content-type']
      let imageBlob = new Blob([response.data], { type: imageType })
      Shared.downloadedImageFiles.setItem('podrain_image_'+podcastID, imageBlob)
    })

    let addPodcastEpisodes = []
    for (let ep of podcast.episodes) {
      addPodcastEpisodes.push(
        Shared.dexieDB.episodes.add(_.merge(ep, {
          '_id': uuidv4(),
          'podcast_id': podcastID,
          'playhead': 0,
          'played': ''
        })).then(() => {
          addingPodcast.value.episodesAdded += 1
        })
      )
    }

    return Promise.all([addPodcast, ...addPodcastEpisodes]).then(() => {
      addingPodcast.value.url = ''
      addingPodcast.value.adding = false
      addingPodcast.value.episodesAdded = 0
      addingPodcast.value.episodesTotal = 0
    })
  })
}

const addManualRssUrl = () => {
  addPodcast(manualRssUrl.value).then(() => {
    router.push('/podcasts')
  })
}

const addSearchedPodcast = (url) => {
  addPodcast(url).then(() => {
    router.push('/podcasts')
  })
}

watch(search, _.debounce(function(value) {
  searching.value = true
  let searchURL = 'https://itunes.apple.com/search?' + new URLSearchParams({
    term: value,
    media: 'podcast',
    entity: 'podcast'
  })

  fetch(searchURL)
    .then(response => {
      return response.json()
    }).then(responseJSON => {
      searchResults.value = responseJSON.results
      searching.value = false
    })
  }, 250)
)
</script>