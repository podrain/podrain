<template>
<div class="flex flex-col h-screen">
  <div class="flex items-center justify-between h-16 bg-teal-800 px-4 text-white">
    <router-link to="/"><font-awesome-icon class="text-4xl" icon="home" /></router-link>
    <font-awesome-icon class="text-4xl" icon="list-ol" />
    <font-awesome-icon class="text-4xl" icon="plus" />
    <router-link to="/settings"><font-awesome-icon class="text-4xl" icon="cog" /></router-link>
  </div>
  <div class="flex-1 overflow-y-scroll bg-gray-800">
    <slot />
  </div>
</div>
</template>

<script>
export default {
  
}
</script>