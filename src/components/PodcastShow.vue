<template>
  <div class="responsive-width">
    <div class="flex flex-col">
      <div class="flex">
        <div class="w-1/3 m-3">
          <StoredImage :alt="podcast.meta.title" v-if="podcast._id" :id="podcast._id" :backupURL="podcast.meta.imageURL" />
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
                @click="confirmDeleteDialogOpen = true"
              >
                <font-awesome-icon class="mr-1" icon="spinner" v-if="deleting" spin />
                <font-awesome-icon class="mr-1" icon="times" v-else />
                Delete
              </button>
            </div>
            <div class="flex">
              <button 
                class="bg-yellow-500 p-2 text-sm w-full flex-1"
                @click="router.push('/podcasts/'+podcast._id+'/search')"
              >
                <font-awesome-icon class="mr-1" icon="search" />
                Search
              </button>
              <button 
                class="text-white bg-blue-500 p-2 text-sm flex-1"
                @click="router.push('/podcasts/'+podcast._id+'/edit')"
              >
                <font-awesome-icon class="mr-1" icon="edit" />
                Edit
              </button>
            </div>
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
                  <font-awesome-icon icon="clock" /> {{ humanFriendlyDuration(ep.duration) }}
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

    <o-modal
      :active="confirmDeleteDialogOpen"
      :onClose="() => { confirmDeleteDialogOpen = false }"
      contentClass="p-3 bg-gray-700 text-white"
      mobileClass="px-3"
    >
      <div>
        Are you sure you want to delete this podcast?
      </div>
      <div class="flex justify-between">
        <button class="text-white p-1 bg-red-700 mt-3" @click="deletePodcast">Confirm</button>
        <button class="text-white p-1 bg-gray-500 mt-3 ml-2" @click="confirmDeleteDialogOpen = false">Cancel</button>
      </div>
    </o-modal>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { Shared, usePiniaStore } from '../State'
  import { cleanHTMLString, truncateString, humanFriendlyDuration } from '../Helpers'
  import { DateTime } from 'luxon'
  import feedParser from 'better-podcast-parser'
  import _ from 'lodash'
  import { v4 as uuidv4 } from 'uuid'
  import StoredImage from './StoredImage.vue'
  import { useProgrammatic } from '@oruga-ui/oruga-next'

  const { oruga } = useProgrammatic()

  const store = usePiniaStore()
  const router = useRouter()
  const route = useRoute()
  const podcast = ref({
    meta: {
      title: '',
      imageURL: '',
    }
  })

  const allEpisodes = ref([])
  const episodes = ref([])
  const refreshing = ref(false)
  const deleting = ref(false)
  const episodeModalShowing = ref(false)
  const episodeModalContent = ref({})
  const confirmDeleteDialogOpen = ref(false)

  const queue = computed(() => store.queue)
  const queueChanging = computed(() => store.queueChanging)

  Shared.dexieDB.podcasts.where({ _id: route.params.id }).toArray().then(result => {
    podcast.value = result[0]
    return getEpisodes()
  })

  const getEpisodes = () => {
    return Shared.dexieDB.episodes.where({
      podcast_id: podcast.value._id
    }).reverse().sortBy('pubDate').then(ae => {
      allEpisodes.value = ae
      episodes.value = allEpisodes.value.slice(0, 10)
    })
  }

  const getMoreEpisodes = () => {
    const newBatch = allEpisodes.value.slice(episodes.value.length, episodes.value.length + 10)
    episodes.value = episodes.value.concat(newBatch)
  }

  const deletePodcast = async () => {
    deleting.value = true

    const queueEpisodesToDelete = []

    for (let episode of queue.value) {
      if (episode.podcast_id === podcast.value._id) {
        queueEpisodesToDelete.push(episode._id)
      }
    }

    await store.removeEpisodeFromQueue(queueEpisodesToDelete)

    let deletePodcastOnly = Shared.dexieDB.podcasts.where({ _id: podcast.value._id }).delete()
    let deleteEpisodes = Shared.dexieDB.episodes.where({ podcast_id: podcast.value._id }).delete()

    await Promise.all([deletePodcastOnly, deleteEpisodes])
    deleting.value = false
    router.push('/podcasts')
  }

  const prepareDescriptionString = (string) => {
    if (string) {
      let parsedString = cleanHTMLString(string)
      return truncateString(parsedString)
    } else {
      return 'No description available.'
    }
  }

  const prepareDateString = (string) => DateTime.fromISO(string).toFormat('D')

  const removeFromQueue = (id) => store.removeEpisodeFromQueue(id)
  const addToQueue = (id) => store.addEpisodeToQueue(id)

  const refreshEpisodes = async () => {
    refreshing.value = true

    try {
      let podcastRefreshed = await feedParser.parseURL(podcast.value.feed_url, {
        proxyURL: localStorage.getItem('proxy_url'),
        getAllPages: true
      })

      let newEpisodes = podcastRefreshed.episodes.filter(ep => {
        return ep && ep.hasOwnProperty('pubDate') && ep.pubDate > _.max(episodes.value.map(epCurr => epCurr.pubDate))
      }).map(ep => {
        return _.merge(ep, {
          '_id': uuidv4(),
          'podcast_id': podcast.value._id,
          'playhead': 0,
          'played': ''
        })
      })

      await Shared.dexieDB.episodes.bulkAdd(newEpisodes)
      await getEpisodes()
      refreshing.value = false
    } catch (e) {
      oruga.notification.open({
        message: `${e}`,
        position: 'top',
        rootClass: 'bg-red-500 w-full p-3',
        closable: true
      })
      refreshing.value = false
    }
    
  }

  const playOrPauseEpisode = (id) => {
    store.playOrPauseEpisode(id)
  }

  const isPlaying = (id) => store.isPlaying(id)

  const showEpisodeModal = (id) => {
    episodeModalShowing.value = true
    episodeModalContent.value = episodes.value.filter(ep => ep._id == id)[0]
  }

  const hideEpisodeModal = () => {
    episodeModalShowing.value = false
    episodeModalContent.value = ''
  }
</script>