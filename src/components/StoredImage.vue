<template>
  <img ref="imageTag" :alt="alt" />
</template>

<script>
import { Shared } from '../State.js'
  export default {
    props: {
      id: String,
      backupURL: '',
      alt: String
    },

    async mounted() {
      let imageFile = await Shared.downloadedImageFiles.getItem('podrain_image_'+this.id)
      if (imageFile) {
        let imageType = imageFile.type
        let blobAB = await imageFile.arrayBuffer()
        let newBlob = new Blob([blobAB], { type: imageType })
        this.$refs.imageTag.src = URL.createObjectURL(newBlob)
      } else {
        this.$refs.imageTag.src = this.backupURL
      }
    }
  }
</script>