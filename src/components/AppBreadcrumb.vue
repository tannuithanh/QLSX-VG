<template>
    <a-breadcrumb style="margin: 16px 0">
        <a-breadcrumb-item>
            <RouterLink to="/">Trang chủ</RouterLink>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-for="(item, index) in filteredMatched" :key="index">
            <RouterLink v-if="index !== filteredMatched.length - 1" :to="getBreadcrumbPath(index)">
                {{ item.meta.title }}
            </RouterLink>
            <span v-else>{{ item.meta.title }}</span>
        </a-breadcrumb-item>
    </a-breadcrumb>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Filter matched routes and remove the root path if needed
const filteredMatched = computed(() =>
    route.matched.filter(r => r.path !== '/')
)

// Get the correct breadcrumb path
const getBreadcrumbPath = (index) => {
    return filteredMatched.value
        .slice(0, index + 1)
        .map(r => r.path)
        .join('/') // Ensure paths are correctly joined with '/'
}
</script>
