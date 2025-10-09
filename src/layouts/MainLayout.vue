<template>
  <a-layout style="min-height: 100vh">
    <!-- Sidebar -->
    <a-layout-sider v-if="!isMobile" :collapsed="collapsed" breakpoint="md"
      style="background: #001529; border-right: none; background: #ffffff">
      <Sidebar :collapsed="collapsed" />
    </a-layout-sider>

    <!-- Main layout -->
    <a-layout>

      <!-- Header -->
      <a-layout-header style="background: #fff; padding: 0 16px; display: flex; align-items: center">
        <menu-unfold-outlined v-if="collapsed && !isMobile" @click="collapsed = false"
          style="font-size: 18px; cursor: pointer; margin-right: 16px; color: #c06252;" />
        <menu-fold-outlined v-else-if="!collapsed && !isMobile" @click="collapsed = true"
          style="font-size: 18px; cursor: pointer; margin-right: 16px; color: #c06252;" />

        <Header style="flex: 1" />
      </a-layout-header>

      <!-- Content -->
      <!-- Trong layout -->
      <a-layout-content style="margin: 16px">
        <AppBreadcrumb />
        <div class="main-content-wrapper">
          <FullScreenLoader v-if="isLoading" />
          <div style="padding: 24px; background: #fff; min-height: 360px">
            <router-view />
          </div>
        </div>
      </a-layout-content>
      <!-- Footer -->
      <Footer />
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/components/Header/Header.vue'
import Footer from '@/components/Footer.vue'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import FullScreenLoader from '@/components/FullScreenLoader.vue'

const isLoading = ref(false)
const router = useRouter()
const collapsed = ref(false)
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}
router.beforeEach((to, from, next) => {
  isLoading.value = true
  next()
})
router.afterEach(() => {
  setTimeout(() => (isLoading.value = false), 600)
})
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

</script>
