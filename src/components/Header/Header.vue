<template>
  <a-layout-header class="header">
    <div class="header-inner">
      <div class="left-slot">
        <slot name="left" />
      </div>

      <div class="right-slot">
        <a-dropdown placement="bottomRight" trigger="click">
          <a class="header__user" @click.prevent>
            <!-- dùng URL đã chuẩn hoá -->
            <a-avatar :size="32" :src="avatarUrl" style="object-fit: contain" />
            <div class="user-meta">
              <div class="header__username">{{ user?.name || "Người dùng Demo" }}</div>
              <div class="header__position">
                {{ user?.position?.name || "Vị trí công việc" }}
              </div>
            </div>
          </a>

          <template #overlay>
            <a-menu class="custom-dropdown-menu">
              <a-menu-item key="profile">
                <template #icon>
                  <UserOutlined />
                </template>
                <router-link to="/profile">Thông tin cá nhân</router-link>
              </a-menu-item>

              <a-menu-item v-if="isAdmin" key="settings">
                <template #icon>
                  <SettingOutlined />
                </template>
                <router-link to="/settings">Cài đặt hệ thống</router-link>
              </a-menu-item>

              <a-menu-item key="change-pass" @click="showChangePass = true">
                <template #icon>
                  <KeyOutlined />
                </template>
                <span>Đổi mật khẩu</span>
              </a-menu-item>

              <a-menu-item key="logout" danger @click="logout">
                <template #icon>
                  <LogoutOutlined />
                </template>
                <span>Đăng xuất</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <ChangePasswordModal v-model:visible="showChangePass" />
      </div>
    </div>
  </a-layout-header>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { notification } from "ant-design-vue";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { authApi } from "@/services/auth";
import { resolveStoragePath } from "@/utils/storage";

import {
  LogoutOutlined,
  KeyOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons-vue";
import ChangePasswordModal from "@/components/common/ChangePasswordModal.vue";
import defaultAvatar from "@/assets/images/avatar.png";

const showChangePass = ref(false);

const router = useRouter();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const isAdmin = computed(() => {
  const v = user.value?.is_admin;
  return v === true || v === 1 || v === "1";
});

// 👉 avatar đã chuẩn hoá URL (nếu null/empty thì dùng fallback ảnh mặc định)
const avatarUrl = computed(() => {
  const raw = user.value?.avatar;
  return raw ? resolveStoragePath(raw) : defaultAvatar;
});

async function logout() {
  try {
    await authApi.logout();
  } catch { }
  authStore.logout();
  notification.success({
    message: "Đăng xuất thành công",
    description: "Bạn đã đăng xuất khỏi hệ thống.",
  });
  router.replace({ name: "Login" });
}
</script>

<style scoped>
.header {
  background: #fff;
  height: 64px;
  line-height: 64px;
  position: relative;
  z-index: 10;
  padding: 0 16px;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
}

.left-slot,
.right-slot {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__user {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  line-height: 1;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.header__username {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.header__position {
  font-size: 12px;
  color: #888;
}
</style>
