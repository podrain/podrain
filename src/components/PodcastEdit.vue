<template>
  <div class="responsive-width">
    <h1 class="text-white text-2xl mt-3 text-center">Edit &quot;{{ podcast?.meta?.title }}&quot; feed</h1>
    <input v-model="feedURL" type="text" class="w-full mt-3 p-1">
    <button @click="submit" class="text-white bg-green-500 w-full p-1">
      <font-awesome-icon icon="save" class="mr-3" />Save
    </button>
  </div>
</template>

<script setup>
  import { ref, defineProps } from 'vue'
  import { Shared } from '../State'
  import { useRoute, useRouter } from 'vue-router'
  import feedParser from 'better-podcast-parser'

  const router = useRouter()
  const route = useRoute()

  const feedURL = ref('')
  const podcast = ref({
    meta: {
      title: ''
    }
  })

  Shared.dexieDB.podcasts.where({ _id: route.params.id }).first().then((result) => {
    podcast.value = result
    feedURL.value = podcast.value.feed_url
  })

  const submit = async () => {
    const podcastFeed = await feedParser.parseURL(feedURL.value, {
      proxyURL: localStorage.getItem('proxy_url'),
    })

    await Shared.dexieDB.podcasts.where({ _id: route.params.id }).modify({ 
      feed_url: feedURL.value,
      meta: podcastFeed.meta
    })
    await router.push('/podcasts/'+route.params.id)
  }

</script>