<template>
    <div class="home-under-dev">
        <img class="home-logo" src="@/assets/images/logo.png" alt="Logo" />
    </div>
</template>

<script setup>
// Không cần logic
</script>

<style scoped>
.home-under-dev {
    min-height: calc(100vh - 360px);
    display: grid;
    place-items: center;
    padding: 24px;
}

.home-logo {
    width: 30   0px;
    /* chỉnh kích thước tùy ý */
    height: auto;
    opacity: .95;
}
</style>
