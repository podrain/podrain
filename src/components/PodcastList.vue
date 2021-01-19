<template>

    <div v-if="podcasts.length > 0" class="
        grid 
        grid-cols-3 
        sm:grid-cols-4 
        md:grid-cols-6 
        lg:grid-cols-8
        xl:grid-cols-10
        2xl:grid-cols-12
        auto-rows-max
      ">
        <img 
          :src="pc.meta.imageURL"
          v-for="pc in podcasts"
          :key="pc._id"
          @click="$router.push(`/podcasts/${pc._id}`)"
        />
    </div>

    <div v-else class="text-white h-full flex-1 flex justify-center items-center">
      <div class="flex flex-col">
        There are no podcasts.
        <button @click="$router.push('/podcasts/create')" class="mt-2 p-2 bg-green-500">Add some!</button>
      </div>
    </div>
</template>

<script>
  import { Shared } from '../store'

  export default {
    data() {
      return {
        podcasts: []
      }
    },

    created() {
      Shared.dexieDB.podcasts.toArray().then(result => {
        this.podcasts = result
      })
    }
  }
</script>