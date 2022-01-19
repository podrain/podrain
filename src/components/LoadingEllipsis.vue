<template>
{{ dots }}
</template>

<script setup>
  import { ref, computed, onUnmounted } from 'vue'

  const count = ref(0)

  const timer = setInterval(() => {
    if (count.value <= 3) {
      count.value += 1
    } else {
      count.value = 0
    }
  }, 150)

  const dots = computed(() => {
    let dotsArray = new Array

    for (let i = 0; i < count.value; i++) {
      dotsArray.push('.')
    }

    return dotsArray.join('')
  })

  onUnmounted(() => {
    clearInterval(timer)
  })
</script>