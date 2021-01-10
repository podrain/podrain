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
    </div>
  </Layout>
</template>

<script>
import Layout from './Layout.vue'
import Helpers from '../Helpers'

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
      }
    }
  },

  created() {
    Helpers.dexieDB.podcasts.where({ _id: this.$route.params.id }).toArray().then(result => {
      this.podcast = result[0]
    })
  }
}
</script>