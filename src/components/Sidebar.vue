<template>
  <a-layout-sider theme="light" v-model:collapsed="collapsed" :trigger="null" collapsible>
    <div class="logo">
      <router-link to="/"><img src="@/assets/images/logo.png" alt="Logo" width="75" /></router-link>
    </div>

    <a-menu :selectedKeys="[activeKey]" :openKeys="openKeys" @openChange="onOpenChange" theme="light" mode="inline">
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
            <template #icon><LayoutOutlined /></template>
            <router-link to="/san-xuat/bao-cao-layout">Thống kê lỗi</router-link>
          </a-menu-item>
        </a-sub-menu>
      </a-sub-menu>
    </a-menu>
  </a-layout-sider>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { ref, computed, watch } from 'vue'

import {
  HomeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  BugOutlined,
  FileTextOutlined,
  LineChartOutlined,
  LayoutOutlined, // mở lại mục "Báo cáo Layout" thì bỏ comment dòng này
} from '@ant-design/icons-vue'

const collapsed = ref(false)
const route = useRoute()

const activeKey = computed(() => route.meta.activeKey || '')

const openKeys = ref([])
watch(
  () => route.fullPath,
  () => {
    openKeys.value = Array.isArray(route.meta.openKeys) ? [...route.meta.openKeys] : []
  },
  { immediate: true }
)

function onOpenChange(keys) {
  openKeys.value = keys
}
</script>



<style scoped>
.logo {
  height: 90px;
  margin: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}
</style>
