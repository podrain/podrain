<template>
  <div v-if="expanded" class="h-48 bg-gray-200">
    <div class="p-3 h-full flex flex-col justify-between">
      <div class="flex justify-between">
        <div class="flex flex-col w-4/5">
          <div class="w-full text-gray-800 text-sm">
            {{ playingEpisode?.podcast?.meta?.title }}
          </div>
          <div class="w-full whitespace-no-wrap overflow-x-hidden">
            <marquee scrollamount="4">
              {{ playingEpisode?.title }}
            </marquee>
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

      <div class="flex justify-between">
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
        <font-awesome-icon
          v-if="paused"
          icon="play" 
          class="text-4xl text-teal-500"
          @click="playOrPause"
        />
        <font-awesome-icon
          v-else
          icon="pause" 
          class="text-4xl text-teal-500"
          @click="playOrPause"
        />
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

  <div 
    v-else 
    class="h-12 bg-gray-200 flex items-center justify-center"
    @click="expanded = true"
  >
    <font-awesome-icon icon="chevron-up" class="text-4xl" />
  </div>
</template>

<script>
import Helpers from '../Helpers'

export default {
  data() {
    return {
      expanded: true
    }
  },

  computed: {
    playingEpisode() {
      return this.$store.state.playingEpisode
    },

    humanFriendlyDuration() {
      return Helpers.floatToISO(this.playingEpisode.duration)
    },

    humanFriendlyPlayhead() {
      return Helpers.floatToISO(this.playingEpisode.playhead)
    },

    paused() {
      return this.$store.state.paused
    },
  },

  methods: {
    playOrPause() {
      this.$store.dispatch('playOrPause')
    },

    jumpAhead() {
      this.$store.dispatch('jumpAhead')
    },

    jumpBack() {
      this.$store.dispatch('jumpBack')
    },

    playNext() {
      this.$store.dispatch('playNext')
    },

    playPrev() {
      this.$store.dispatch('playPrev')
    },

    setPlayhead(e) {
      this.$store.dispatch('setPlayhead', e.target.value)
    }
  },
}
</script>