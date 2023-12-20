<template>
  <div class="responsive-width">
    <ul 
      id="queue-list"
      class="p-3"
    >
      <li 
        class="episode-in-queue flex flex-col mt-3" 
        v-for="ep in queue" 
        :key="ep._id"
        :data-id="ep._id"
      >
        <div 
          class="flex"
          :class="[ playingEpisode?._id === ep._id ? 'bg-orange-500' : 'bg-gray-700' ]"
        >
          <div 
            class="p-3 relative w-full"
            @click="router.push('/episodes/'+ep._id)"
          >
            <div class="absolute top-0 left-0 h-1 bg-teal-500" :style="`width: ${getPercent(ep.playhead, ep.duration)}%`"></div>

            <div v-if="ep.played" class="w-8 h-8 bg-yellow-500 absolute bottom-0 left-0 flex justify-center items-center">
              <font-awesome-icon icon="check" />
            </div>

            <div 
              class="leading-tight text-xs font-bold"
              :class="[ playingEpisode?._id === ep._id ? 'text-gray-900' : 'text-white']"
            >{{ ep.title }}</div>

            <div class="flex mt-3">
              <div class="w-1/5">
                <img :src="ep.imageURL || ep.podcast.meta.imageURL" />
              </div>
              <div 
                class="w-4/5 text-xs font-light ml-3"
                :class="[ playingEpisode?._id === ep._id ? 'text-gray-900' : 'text-gray-300']"
              >
                <span class="italic">{{ prepareDateString(ep.pubDate) }}</span>&nbsp;—&nbsp;
                {{ prepareDescriptionString(ep.description) }}
                <div class="mt-2 font-bold">
                  <font-awesome-icon icon="clock" /> {{ humanFriendlyDuration(ep.duration) }}
                </div>
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
            @click="playOrPauseEpisode(ep._id)"
          >
            <font-awesome-icon v-if="isPlaying(ep._id)" icon="pause" />
            <font-awesome-icon v-else icon="play" />
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
            v-if="!iOS()" 
            class="flex-1 relative"
            :class="[isDownloading(ep._id) ? 'bg-gray-600' : 'bg-blue-500']"
            @click="downloadEpisode(ep._id)"
            :disabled="isDownloading(ep._id)"
          >
            <div
              v-if="isDownloading(ep._id) || isDownloaded(ep._id)" 
              class="h-full bg-green-500 absolute"
              :style="`transition: width 150ms; width: ${ isDownloaded(ep._id) ? '100' : downloadProgress(ep._id) }%`"
            ></div>
            <div 
              class="flex h-full justify-center items-center relative text-white"
            >{{ isDownloaded(ep._id) ? 'Downloaded' : isDownloading(ep._id) ? (downloadProgress(ep._id) > 0 ? `${ downloadProgress(ep._id) }%` : 'Starting download...') : 'Download' }}</div>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style>
ul#queue-list > li:first-child {
  @apply mt-0;
}
</style>

<script setup>
  import { computed, onMounted } from 'vue'
  import { usePiniaStore } from '../State'
  import { useRouter } from 'vue-router'
  import { cleanHTMLString, truncateString, iOS, getPercent, humanFriendlyDuration, customTitle } from '../Helpers'
  import { DateTime } from 'luxon'
  import _ from 'lodash'
  import Sortable from 'sortablejs'

  customTitle('Queue')

  const store = usePiniaStore()
  const router = useRouter()
  const playingEpisode = computed(() => store.playingEpisode)
  const queue = computed(() => store.queue)
  const downloading = computed(() => store.downloading)
  const queueChanging = computed(() => store.queueChanging)

  const isDownloading = (id) => store.downloading.map(dl => dl.id).includes(id)
  const downloadProgress = (id) => store.downloading.filter(dl => dl.id == id)[0].progress
  const isDownloaded = (id) => store.downloaded.includes(id)

  const prepareDescriptionString = (string) => {
    if (string) {
      let parsedString = cleanHTMLString(string)
      return truncateString(parsedString)
    } else {
      return 'No description available.'
    }
  }

  const prepareDateString = (string) => {
    return DateTime.fromISO(string).toFormat('D')
  }

  const removeFromQueue = (episodeID) => {
    store.removeEpisodeFromQueue(episodeID)
  }

  const downloadEpisode = (id) => {
    if (isDownloaded(id)) {
      store.removeDownload(id)
    } else {
      store.downloadEpisode(id)
    } 
  }

  const playOrPauseEpisode = (id) => {
    store.playOrPauseEpisode(id)
  }

  const isPlaying = (id) => store.isPlaying(id)

  onMounted(() => {
    let queueList = document.getElementById('queue-list')
    let sortable = Sortable.create(queueList, {
      handle: '.queue-dragbar',
      scroll: true,
      animation: 150,

      onUpdate(evt) {
        store.reorderQueue({
          from: evt.oldIndex,
          to: evt.newIndex,
        })
      }
    })
  })
</script>