<template>
  <div v-if="playingEpisode" class="bg-gray-200 sticky bottom-0 z-10">
      <div v-if="expanded" class="h-48">
        <div class="p-3 h-full flex flex-col justify-between sm:justify-around">
          <div class="flex justify-between">
            <div class="flex flex-col w-4/5">
              <div class="w-full text-gray-800 text-sm">
                {{ playingEpisode?.podcast?.meta?.title }}
              </div>
              <div class="w-full whitespace-no-wrap overflow-x-hidden">
                <marquee class="md:hidden" scrollamount="4">
                  {{ playingEpisode?.title }}
                </marquee>
                <div class="hidden md:block">
                  {{ playingEpisode?.title }}
                </div>
              </div>
            </div>
            <div class="flex justify-end items-start w-1/5">
              <font-awesome-icon 
                icon="chevron-down"
                class="text-4xl"
                @click="expanded = false"
              />
            </div>
          </div>

          <div class="flex flex-col justify-between h-full sm:flex-row sm:items-center">
            <div class="flex justify-between items-center sm:w-2/5 lg:w-1/4">
              <font-awesome-icon
                icon="step-backward" 
                class="text-4xl"
                @click="playPrev"
              />
              <font-awesome-icon
                icon="undo" 
                class="text-4xl"
                @click="jumpBack"
              />
              <div 
                class="text-5xl text-teal-500 flex justify-center items-center"
                @click="playOrPause"  
              >
                <font-awesome-icon
                  v-if="paused"
                  icon="play" 
                />
                <font-awesome-icon
                  v-else
                  icon="pause"
                />
              </div>
              
              <font-awesome-icon
                icon="redo" 
                class="text-4xl"
                @click="jumpAhead"
              />
              <font-awesome-icon
                icon="step-forward" 
                class="text-4xl"
                @click="playNext"
              />
            </div>

            <div class="sm:flex-1 sm:ml-8">
              <div>
                {{ humanFriendlyPlayhead }} / {{ humanFriendlyDuration }}
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <div class="relative w-full">
                    <input 
                      id="play-slider"
                      class="w-full appearance-none bg-gray-200"
                      type="range"
                      min="0"
                      :max="playingEpisode.duration"
                      :value="playingEpisode.playhead"
                      @change="setPlayhead"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div 
        v-else 
        class="h-12 flex items-center justify-center"
        @click="expanded = true"
      >
        <font-awesome-icon icon="chevron-up" class="text-4xl" />
      </div>
  </div>

  <div 
    v-else
    class="h-36 flex justify-center items-center bg-gray-200 sticky bottom-0 z-10"
  >
    Loading player<LoadingEllipsis />
  </div>
</template>

<script setup>
  import { usePiniaStore } from '../State'
  import { computed, ref } from 'vue'
  import { floatToISO } from '../Helpers'
  import LoadingEllipsis from './LoadingEllipsis.vue'

  const store = usePiniaStore()
  const expanded = ref(true)

  const playingEpisode = computed(() => store.playingEpisode)
  const humanFriendlyDuration = computed(() => floatToISO(playingEpisode.value.duration))
  const humanFriendlyPlayhead = computed(() => floatToISO(playingEpisode.value.playhead))
  const paused = computed(() => store.paused)

  const playOrPause = () => {
    store.playOrPause()
  }

  const jumpAhead = () => {
    store.jumpAhead()
  }

  const jumpBack = () => {
    store.jumpBack()
  }

  const playNext = () => {
    store.playNext()
  }

  const playPrev = () => {
    store.playPrev()
  }

  const setPlayhead = (e) => {
    store.setPlayhead(e.target.value)
  }
</script>