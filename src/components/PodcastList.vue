<template>
    <div class="flex flex-wrap">
      <div 
        class="w-1/3 flex-none"
        v-for="pc in podcasts"
        :key="pc._id"
        @click="$router.push(`/podcasts/${pc._id}`)"
      >
        <img :src="pc.meta.imageURL">
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