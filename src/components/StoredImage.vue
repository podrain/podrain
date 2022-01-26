<template>
  <img 
    ref="imageTag" 
    :alt="alt" 
    class="text-white text-center text-lg flex justify-center items-center bg-gradient-to-br p-4"
    :class="`from-${chosenColor.from} to-${chosenColor.to}`"
    @load="imageLoaded"
  />
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { Shared } from '../State.js'

  const randomInt = (max) => {
    return Math.floor(Math.random() * max)
  }

  const props = defineProps({
    id: String,
    backupURL: '',
    alt: String
  })

  const imageTag = ref(null)

  const colorCombos = [
    {
      from: 'green-500',
      to: 'blue-500'
    },
    {
      from: 'pink-400',
      to: 'red-600'
    },
    {
      from: 'yellow-500',
      to: 'orange-500'
    }
  ]

  const chosenColor = colorCombos[randomInt(3)]

  const imageLoaded = (img) => {
    img.target.style.padding = '0'
  }
  
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