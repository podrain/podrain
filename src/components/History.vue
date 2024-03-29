<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white text-2xl text-center">Listening history</h1>

      <div v-if="loading" class="flex justify-center mt-4">
        <font-awesome-icon class="text-white text-4xl" icon="spinner" spin/>
      </div>
      <div v-else>
        <ul v-if="playHistory.length > 0">
          <li class="text-white mt-3" v-for="ep in playHistory" :key="ep._id">
            <div 
              class="bg-gray-700 p-3"
              @click="visitEpisodeShow(ep._id)"
            >
              <h2>{{ ep.title }}</h2>
              <p class="text-sm text-gray-400 italic mt-2">Last played: {{ prepareDateString(ep.played) }}</p>
              <p class="text-xs text-gray-300 mt-2">{{ prepareDescriptionString(ep.description) }}</p>
              <div class="text-sm mt-2">
                <font-awesome-icon icon="clock" /> {{ humanFriendlyDuration(ep.duration) }}
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

        <div v-else class="text-white italic mt-3">You haven't listened to any episodes yet! They'll show up here when you do.</div>

        <button
          v-if="(playHistoryCount - playHistory.length >= maxNumEpisodesShowing) || (playHistoryCount != playHistory.length)"
          class="bg-purple-500 text-white mt-3 p-3 w-full"
          @click="getMorePlayHistory"
          :disabled="morePlayHistoryLoading"
        >
          <span v-if="morePlayHistoryLoading">Loading<font-awesome-icon class="ml-2" icon="spinner" spin /></span>
          <span v-else>Show More</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { cleanHTMLString, truncateString, humanFriendlyDuration, customTitle } from '../Helpers'
  import { Shared, usePiniaStore } from '../State'
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { DateTime } from 'luxon'

  customTitle('History')

  const maxNumEpisodesShowing = 10

  const loading = ref(false)
  const playHistory = ref([])
  const playHistoryCount = ref(0)
  const store = usePiniaStore()
  const router = useRouter()
  const morePlayHistoryLoading = ref(false)

  const queue = computed(() => store.queue)

  loading.value = true

  Shared.dexieDB.episodes.where('played')
    .notEqual('')
    .count()
    .then(result => {
      playHistoryCount.value = result
    })


  Shared.dexieDB.episodes.where('played')
    .notEqual('')
    .reverse()
    .limit(maxNumEpisodesShowing)
    .sortBy('played')
    .then(result => {
      playHistory.value = result
      loading.value = false
    })

  const prepareDateString = (string) => {
    return DateTime.fromISO(string).toFormat('ff')
  }

  const prepareDescriptionString = (string) => {
    if (string) {
      let parsedString = cleanHTMLString(string)
      return truncateString(parsedString, 150)
    } else {
      return 'No description available.'
    }
  }

  const addToQueue = (id) => {
    store.addEpisodeToQueue(id)
  }

  const removeFromQueue = (id) => {
    store.removeEpisodeFromQueue(id)
  }

  const getMorePlayHistory = async () => {
    morePlayHistoryLoading.value = true

    const result = await Shared.dexieDB.episodes.where('played')
      .notEqual('')
      .reverse()
      .offset(playHistory.value.length)
      .limit(maxNumEpisodesShowing)
      .sortBy('played')
      
    playHistory.value = playHistory.value.concat(result)
    morePlayHistoryLoading.value = false
  }

  const visitEpisodeShow = (id) => {
    router.push('/episodes/'+id)
  }
</script>