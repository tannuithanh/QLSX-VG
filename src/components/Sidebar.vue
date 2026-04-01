<template>
  <div class="sidebar-container">
    <div v-if="!collapsed" class="logo">
      <router-link to="/">
        <img src="@/assets/images/logo.png" alt="Logo" :width="75" />
      </router-link>
    </div>

    <a-menu :selectedKeys="[activeKey]" :openKeys="openKeys" @openChange="onOpenChange" theme="light" mode="inline"
      :inlineCollapsed="collapsed">
      <!-- Trang chủ -->
      <a-menu-item key="home">
        <template #icon>
          <HomeOutlined />
        </template>
        <router-link to="/">Trang chủ</router-link>
      </a-menu-item>

      <!-- Quản lý sản xuất -->
      <a-sub-menu key="production">
        <template #icon>
          <AppstoreOutlined />
        </template>
        <template #title>Quản lý sản xuất</template>

        <a-menu-item key="production-danh-muc">
          <template #icon>
            <DatabaseOutlined />
          </template>
          <router-link to="/san-xuat/danh-muc">Danh mục</router-link>
        </a-menu-item>

        <a-menu-item key="production-nang-suat">
          <template #icon>
            <BarChartOutlined />
          </template>
          <router-link to="/san-xuat/nang-suat">Dữ liệu năng suất</router-link>
        </a-menu-item>

        <a-menu-item key="production-dau-vao-loi">
          <template #icon>
            <BugOutlined />
          </template>
          <router-link to="/san-xuat/dau-vao-loi">Dữ liệu lỗi</router-link>
        </a-menu-item>

        <!-- Báo cáo -->
        <a-sub-menu key="report">
          <template #icon>
            <FileTextOutlined />
          </template>
          <template #title>Báo cáo</template>

          <a-menu-item key="report-nang-suat">
            <template #icon>
              <LineChartOutlined />
            </template>
            <router-link to="/san-xuat/bao-cao-nang-suat">Năng suất</router-link>
          </a-menu-item>
          <a-menu-item key="report-layout">
            <template #icon>
              <LayoutOutlined />
            </template>
            <router-link to="/san-xuat/bao-cao-layout">Thống kê lỗi</router-link>
          </a-menu-item>
        </a-sub-menu>
      </a-sub-menu>
    </a-menu>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { ref, computed, watch, defineProps } from 'vue'

import {
  HomeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  BugOutlined,
  FileTextOutlined,
  LineChartOutlined,
  LayoutOutlined,
} from '@ant-design/icons-vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const activeKey = computed(() => route.meta.activeKey || '')

const openKeys = ref([])
watch(
  () => route.fullPath,
  () => {
    if (!props.collapsed) {
      openKeys.value = Array.isArray(route.meta.openKeys) ? [...route.meta.openKeys] : []
    }
  },
  { immediate: true }
)

function onOpenChange(keys) {
  openKeys.value = keys
}
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 64px; /* Giảm chiều cao logo cho đồng bộ với header */
  margin: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.logo img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}
</style>
