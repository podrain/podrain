<template>
  <img ref="imageTag" :alt="alt" />
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { Shared } from '../State.js'

  const props = defineProps({
    id: String,
    backupURL: '',
    alt: String
  })

  const imageTag = ref(null)
  
  onMounted(async () => {
    let imageFile = await Shared.downloadedImageFiles.getItem('podrain_image_'+props.id)
    if (imageFile) {
      let imageType = imageFile.type
      let blobAB = await imageFile.arrayBuffer()
      let newBlob = new Blob([blobAB], { type: imageType })
      imageTag.value.src = URL.createObjectURL(newBlob)
    } else {
      imageTag.value.src = props.backupURL
    }
  })
</script>