<template>
  <div class="responsive-width">
    <div class="p-3">
      <h1 class="text-white text-xl text-center">Your episode history</h1>

      <div v-if="loading" class="flex justify-center mt-4">
        <font-awesome-icon class="text-white text-4xl" icon="spinner" spin/>
      </div>
      <div v-else>
        <ul>
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

        <button
          class="bg-purple-500 text-white mt-3 p-3 w-full"
          @click="getMorePlayHistory"
        >
          Show More
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { cleanHTMLString, truncateString, humanFriendlyDuration } from '../Helpers'
  import { Shared } from '../State'
  import { ref, computed } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import { DateTime } from 'luxon'

  const loading = ref(false)
  const playHistory = ref([])
  const store = useStore()
  const router = useRouter()

  const queue = computed(() => store.state.queue)

  loading.value = true

  Shared.dexieDB.episodes.where('played')
    .notEqual('')
    .reverse()
    .limit(10)
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
    store.dispatch('addEpisodeToQueue', id)
  }

  const removeFromQueue = (id) => {
    store.dispatch('removeEpisodeFromQueue', id)
  }

  const getMorePlayHistory = () => {
    Shared.dexieDB.episodes.where('played')
      .notEqual('')
      .reverse()
      .offset(playHistory.value.length)
      .limit(10)
      .sortBy('played')
      .then(result => {
        playHistory.value = playHistory.value.concat(result)
    })
  }

  const visitEpisodeShow = (id) => {
    router.push('/episodes/'+id)
  }
</script>