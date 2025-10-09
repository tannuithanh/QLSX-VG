<template>
  <a-layout-footer class="custom-footer-modern">
    <div class="footer-content">
      <span>© {{ new Date().getFullYear() }} Vinh Gia Co., Ltd</span>
      <span class="dot">·</span>
      <span>Thiết kế & phát triển bởi <strong>Phòng CNTT</strong></span>
    </div>
  </a-layout-footer>

  <!-- Modal tĩnh (demo) -->
  <a-modal v-model:visible="showForceChangePassword" title="Đổi mật khẩu lần đầu" :closable="false"
    :maskClosable="false" :footer="null" width="400px" destroyOnClose>
    <!-- Nếu bạn chưa có component ChangePasswordFistTime, thay bằng div demo -->
    <div style="text-align:center; padding:16px;">
      <p>Form đổi mật khẩu lần đầu (demo)</p>
      <a-button type="primary" @click="handlePasswordChanged">Xác nhận</a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
// import ChangePasswordFistTime from './common/ChangePasswordFistTime.vue' // nếu có thật

// chỉ dùng ref đơn giản
const showForceChangePassword = ref(false)

// Giả lập hành động đổi mật khẩu thành công
function handlePasswordChanged() {
  showForceChangePassword.value = false
}
</script>

<style scoped>
.custom-footer-modern {
  text-align: center;
  padding: 16px 0;
  background: #f9f9f9;
  color: #888;
  font-size: 13px;
  border-top: 1px solid #eee;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  align-items: center;
}

.footer-content strong {
  font-weight: 500;
  color: #555;
}

.footer-content .dot {
  color: #ccc;
}
</style>
