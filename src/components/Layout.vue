<template>
<div class="flex flex-col h-screen">
  <div class="flex items-center justify-between h-16 bg-teal-800 px-4 text-white">
    <font-awesome-icon class="text-4xl" icon="home" />
    <font-awesome-icon class="text-4xl" icon="list-ol" />
    <font-awesome-icon class="text-4xl" icon="plus" />
    <font-awesome-icon class="text-4xl" icon="cog" />
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