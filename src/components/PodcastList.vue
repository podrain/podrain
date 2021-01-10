<template>
  <Layout>
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