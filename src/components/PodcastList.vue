<template>

    <div v-if="podcasts.length > 0" class="flex flex-wrap">
      <div 
        class="w-1/3 flex-none"
        v-for="pc in podcasts"
        :key="pc._id"
        @click="$router.push(`/podcasts/${pc._id}`)"
      >
        <img :src="pc.meta.imageURL">
      </div>
    </div>

    <div v-else class="text-white h-full flex-1 flex justify-center items-center">
      <div class="flex flex-col">
        There are no podcasts.
        <button @click="$router.push('/podcasts/create')" class="mt-2 p-2 bg-green-500">Add some!</button>
      </div>
    </div>
</template>

<script>
  import Helpers from '../Helpers'

  export default {
    data() {
      return {
        podcasts: []
      }
    },

    created() {
      Helpers.dexieDB.podcasts.toArray().then(result => {
        this.podcasts = result
      })
    }
  }
</script>