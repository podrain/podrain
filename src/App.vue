<template>
  <router-view></router-view>
</template>

<script>
import Layout from './components/Layout.vue'
import PodcastList from './components/PodcastList.vue'

export default {
  components: {
    Layout,
    PodcastList
  }
}
</script>