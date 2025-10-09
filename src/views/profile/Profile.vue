<template>
  <div class="profile">
    <a-page-header :ghost="false" title="Thông tin cá nhân" class="page-header" />

    <div class="layout">
      <!-- LEFT: Hồ sơ + Upload -->
      <a-card :bordered="false" class="card profile-card">
        <div class="section-head">
          <span class="section-title">Hồ sơ</span>
        </div>

        <div class="identity">
          <a-avatar :size="96" :src="avatarUrl" />

          <div class="identity__meta">
            <div class="name">{{ me?.name || "—" }}</div>
            <div class="job">
              {{ me?.position?.name || "—" }}
              <template v-if="me?.position_detail"> — {{ me.position_detail }}</template>
            </div>
            <div class="badges">
              <a-tag :color="isAdmin ? 'green' : ''">{{
                isAdmin ? "Admin" : "User"
              }}</a-tag>
              <a-tag v-for="r in me?.roles || []" :key="r.id" class="tag-role">{{
                r.name
              }}</a-tag>
            </div>
          </div>
        </div>

        <a-divider />

        <!-- Avatar -->
        <div class="uploader">
          <div class="uploader__label">Ảnh đại diện</div>
          <div class="uploader__controls">
            <a-upload
              :show-upload-list="false"
              :before-upload="beforeUploadAvatar"
              accept=".png,.jpg,.jpeg,.webp"
            >
              <a-button :loading="loading.avatar">Đổi ảnh đại diện</a-button>
            </a-upload>
            <div class="hint">JPG/PNG/WebP • ≤ 2MB</div>
          </div>
        </div>

        <!-- Signature -->
        <div class="uploader">
          <div class="uploader__label">Chữ ký</div>
          <div class="uploader__controls">
            <div v-if="me?.signature" class="signature-preview">
              <img :src="signatureUrl" alt="signature" />
            </div>
            <div v-else class="signature-empty">Chưa có chữ ký</div>

            <a-upload
              :show-upload-list="false"
              :before-upload="beforeUploadSignature"
              accept=".png,.jpg,.jpeg,.webp"
            >
              <a-button :loading="loading.signature" class="mt-8"
                >Tải lên chữ ký</a-button
              >
            </a-upload>
            <div class="hint">Khuyến nghị PNG nền trong suốt • ≤ 2MB</div>
          </div>
        </div>
      </a-card>

      <!-- RIGHT: Thông tin chi tiết -->
      <div class="right">
        <a-card :bordered="false" class="card">
          <div class="section-head">
            <span class="section-title">Liên hệ</span>
          </div>
          <a-descriptions
            size="small"
            :column="1"
            :label-style="descLabel"
            :content-style="descContent"
          >
            <a-descriptions-item label="MSNV">{{ me?.msnv || "—" }}</a-descriptions-item>
            <a-descriptions-item label="Email">{{
              me?.email || "—"
            }}</a-descriptions-item>
            <a-descriptions-item label="SĐT">{{ me?.phone || "—" }}</a-descriptions-item>
            <a-descriptions-item label="Địa chỉ">{{
              me?.address || "—"
            }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card :bordered="false" class="card">
          <div class="section-head">
            <span class="section-title">Tổ chức</span>
          </div>
          <a-descriptions
            size="small"
            :column="2"
            responsive
            :label-style="descLabel"
            :content-style="descContent"
          >
            <a-descriptions-item label="Phòng ban" :span="1">{{
              me?.department?.name || "—"
            }}</a-descriptions-item>
            <a-descriptions-item label="Bộ phận / Division" :span="1">{{
              me?.division || "—"
            }}</a-descriptions-item>
            <a-descriptions-item label="Chức vụ" :span="2">
              {{ me?.position?.name || "—" }}
              <template v-if="me?.position_detail"> — {{ me.position_detail }}</template>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { notification, message } from "ant-design-vue";
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";
import { userApi } from "@/services/user_service/userService";
import defaultAvatar from "@/assets/images/avatar.png";
import { resolveStoragePath } from "@/utils/storage";

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const me = computed(() => user.value || null);
const isAdmin = computed(() => {
  const v = me.value?.is_admin;
  return v === true || v === 1 || v === "1";
});

const loading = ref({ avatar: false, signature: false });

// style cho descriptions
const descLabel = { width: "160px", color: "#666" };
const descContent = { color: "#2b2b2b", fontWeight: 500 };
const avatarUrl = computed(() => {
  const raw = me.value?.avatar;
  return raw ? resolveStoragePath(raw) : defaultAvatar;
});
// Upload avatar
async function beforeUploadAvatar(file) {
  if (!validateFile(file)) return false;
  try {
    loading.value.avatar = true;
    await userApi.uploadAvatar(file);
    await refreshMe();
    notification.success({ message: "Cập nhật ảnh đại diện thành công" });
  } catch (e) {
    message.error(e?.response?.data?.message || "Tải ảnh đại diện thất bại");
  } finally {
    loading.value.avatar = false;
  }
  return false;
}

// Upload signature
async function beforeUploadSignature(file) {
  if (!validateFile(file)) return false;
  try {
    loading.value.signature = true;
    await userApi.uploadSignature(file);
    await refreshMe();
    notification.success({ message: "Cập nhật chữ ký thành công" });
  } catch (e) {
    message.error(e?.response?.data?.message || "Tải chữ ký thất bại");
  } finally {
    loading.value.signature = false;
  }
  return false;
}

function validateFile(file, maxMB = 2) {
  const okType = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
    file.type
  );
  if (!okType) {
    message.warning("Chỉ chấp nhận PNG/JPG/JPEG/WebP");
    return false;
  }
  const okSize = file.size / 1024 / 1024 <= maxMB;
  if (!okSize) {
    message.warning(`Dung lượng tối đa ${maxMB}MB`);
    return false;
  }
  return true;
}

async function refreshMe() {
  try {
    const id = me.value?.id;
    if (!id) return;
    const { data } = await userApi.show(id);
    auth.setUser(data);
  } catch {
    /* noop */
  }
}
</script>

<style scoped>
.profile {
  min-width: 0;
}

.page-header {
  margin-bottom: 16px;
}

.layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
}

@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.card {
  min-height: 200px;
}

.section-head {
  margin-bottom: 10px;
}

.section-title {
  font-weight: 700;
  font-size: 16px;
  color: #cc5a3a;
  /* điểm màu nhấn nhẹ */
}

.profile-card .identity {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
}

.identity__meta .name {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
}

.identity__meta .job {
  margin-top: 2px;
  color: #7a7a7a;
}

.badges {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-role {
  background: #fafafa;
}

.uploader {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: start;
  margin-top: 8px;
}

.uploader__label {
  font-weight: 600;
  color: #444;
}

.uploader__controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.signature-preview {
  border: 1px dashed #e8e8e8;
  background: #fbfbfb;
  border-radius: 8px;
  padding: 8px;
  max-width: 100%;
  display: inline-flex;
}

.signature-preview img {
  max-height: 120px;
  object-fit: contain;
}

.signature-empty {
  color: #9b9b9b;
}

.mt-8 {
  margin-top: 8px;
}

.hint {
  color: #9b9b9b;
  font-size: 12px;
}

.right {
  display: grid;
  gap: 16px;
}
</style>
