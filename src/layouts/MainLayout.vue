<template>
  <a-layout style="min-height: 100vh">
    <!-- Sidebar cho Desktop -->
    <a-layout-sider v-if="!isMobile" :collapsed="collapsed" :collapsed-width="0" :trigger="null" breakpoint="md"
      style="background: #ffffff; border-right: 1px solid #f0f0f0">
      <Sidebar :collapsed="collapsed" />
    </a-layout-sider>

    <!-- Sidebar cho Mobile (Drawer) -->
    <a-drawer v-if="isMobile" v-model:visible="mobileMenuVisible" placement="left" :closable="false" :width="250"
      bodyStyle="padding: 0">
      <Sidebar :collapsed="false" @click="mobileMenuVisible = false" />
    </a-drawer>

    <!-- Main layout -->
    <a-layout>
      <!-- Header -->
      <a-layout-header class="main-header">
        <!-- Nút toggle sidebar Desktop -->
        <template v-if="!isMobile">
          <menu-unfold-outlined v-if="collapsed" @click="collapsed = false" class="trigger-icon" />
          <menu-fold-outlined v-else @click="collapsed = true" class="trigger-icon" />
        </template>

        <!-- Nút mở menu Mobile -->
        <template v-else>
          <menu-outlined @click="mobileMenuVisible = true" class="trigger-icon" />
        </template>

        <Header style="flex: 1" />
      </a-layout-header>

      <!-- Content -->
      <a-layout-content :class="['main-content', isMobile ? 'mobile-content' : '']">
        <AppBreadcrumb v-if="!isMobile" />
        <div class="main-content-wrapper">
          <FullScreenLoader v-if="isLoading" />
          <div :class="['content-inner', isMobile ? 'mobile-inner' : '']">
            <router-view />
          </div>
        </div>
      </a-layout-content>

      <!-- Footer -->
      <Footer v-if="!isMobile" />
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/components/Header/Header.vue'
import Footer from '@/components/Footer.vue'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  MenuOutlined,
} from '@ant-design/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import FullScreenLoader from '@/components/FullScreenLoader.vue'

const isLoading = ref(false)
const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const isMobile = ref(false)
const mobileMenuVisible = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    mobileMenuVisible.value = false
  }
}

// Đóng menu mobile khi chuyển trang
watch(() => route.path, () => {
  if (isMobile.value) {
    mobileMenuVisible.value = false
  }
})

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

<style scoped>
.main-header {
  background: #fff;
  padding: 0 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  height: 64px;
}

.trigger-icon {
  font-size: 18px;
  cursor: pointer;
  margin-right: 16px;
  color: #c06252;
  transition: color 0.3s;
}

.trigger-icon:hover {
  color: #a04a3c;
}

.main-content {
  margin: 16px;
  transition: all 0.3s;
}

.main-content.mobile-content {
  margin: 8px;
}

.content-inner {
  padding: 24px;
  background: #fff;
  min-height: 360px;
  border-radius: 4px;
}

.content-inner.mobile-inner {
  padding: 12px;
}

.main-content-wrapper {
  position: relative;
}
</style>
