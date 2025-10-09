<template>
  <div class="settings-shell">
    <!-- LEFT -->
    <div class="settings-left">
      <div class="settings-title">Cài đặt hệ thống</div>

      <a-menu mode="inline" :selectedKeys="[activeKey]" @click="onMenuClick">
        <a-menu-item key="/settings/user">
          <UserOutlined />
          <span>Người dùng</span>
        </a-menu-item>

        <a-menu-item key="/settings/departments">
          <ApartmentOutlined />
          <span>Phòng ban</span>
        </a-menu-item>

        <a-menu-item key="/settings/positions">
          <IdcardOutlined />
          <span>Chức vụ</span>
        </a-menu-item>

        <a-menu-item key="/settings/roles">
          <TeamOutlined />
          <span>Chức năng</span>
        </a-menu-item>

        <a-menu-item key="/settings/access-control">
          <SettingOutlined />
          <span>Vai trò & Phân quyền</span>
        </a-menu-item>

        <!-- ✅ Đưa vào bên trong <a-menu> -->
        <a-menu-item key="/settings/user-roles">
          <TeamOutlined />
          <span>Gán vai trò cho người dùng</span>
        </a-menu-item>
      </a-menu>
    </div>

    <!-- RIGHT -->
    <div class="settings-right">
      <a-page-header :title="pageTitle" :ghost="false" class="page-header" />
      <a-card :bordered="false">
        <router-view />
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SettingOutlined, TeamOutlined, UserOutlined, ApartmentOutlined, IdcardOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()

const activeKey = computed(() => {
  const p = route.path
  if (p.startsWith('/settings/departments')) return '/settings/departments'
  if (p.startsWith('/settings/positions'))   return '/settings/positions'
  if (p.startsWith('/settings/roles'))       return '/settings/roles'
  if (p.startsWith('/settings/access-control')) return '/settings/access-control'
  if (p.startsWith('/settings/user-roles'))  return '/settings/user-roles'   // ✅ thêm
  return '/settings/user'
})

const pageTitle = computed(() => {
  switch (activeKey.value) {
    case '/settings/departments':   return 'Phòng ban'
    case '/settings/positions':     return 'Chức vụ'
    case '/settings/roles':         return 'Chức năng'
    case '/settings/access-control':return 'Vai trò & Phân quyền'
    case '/settings/user-roles':    return 'Gán vai trò cho người dùng'      // ✅ thêm
    default:                        return 'Quản lý người dùng'
  }
})

function onMenuClick({ key }) {
  if (key !== route.path) router.push(key)
}
</script>


<style scoped>
.settings-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px
}

.settings-left {
  position: sticky;
  top: 16px;
  align-self: start;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 8px 12px
}

.settings-title {
  font-weight: 600;
  padding: 8px 8px 12px
}

.settings-right {
  min-height: 480px;
  min-width: 0
}

@media (max-width: 992px) {
  .settings-shell {
    grid-template-columns: 1fr
  }

  .settings-left {
    position: static
  }
}
</style>
