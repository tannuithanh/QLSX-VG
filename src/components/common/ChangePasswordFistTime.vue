<template>
  <div class="cpftf-wrap">
    <a-card class="cpftf-card" :bordered="false">
      <div class="cpftf-head">
        <div class="cpftf-logo">
          <KeyOutlined />
        </div>
        <div class="cpftf-title">
          <h1>Đổi mật khẩu</h1>
          <p>Vì đây là tài khoản đăng nhập lần đầu, vui lòng đặt mật khẩu mới trước khi tiếp tục.</p>
        </div>
      </div>

      <a-form class="password-change-form" :model="formState" :rules="rules" layout="vertical" @finish="handleSubmit"
        @finishFailed="onFinishFailed">
        <a-form-item label="Mật khẩu mới" name="password">
          <a-input-password v-model:value="formState.password" :disabled="loading" autocomplete="new-password"
            spellcheck="false" placeholder="Nhập mật khẩu mới" size="large" />
        </a-form-item>

        <div class="cpftf-strength" v-if="formState.password">
          <a-progress :percent="strengthPercent" :status="strengthStatus" :show-info="false" :stroke-width="8" />
          <span class="cpftf-strength-label">{{ strengthLabel }}</span>
        </div>

        <a-form-item label="Xác nhận mật khẩu" name="password_confirmation">
          <a-input-password v-model:value="formState.password_confirmation" :disabled="loading"
            autocomplete="new-password" spellcheck="false" placeholder="Nhập lại mật khẩu" size="large" />
        </a-form-item>

        <ul class="cpftf-hints">
          <li>Tối thiểu 8 ký tự</li>
          <li>Nên có chữ hoa, chữ thường, số và ký tự đặc biệt</li>
        </ul>

        <a-button type="primary" html-type="submit" block size="large" :loading="loading" class="cpftf-submit">
          Đổi mật khẩu
        </a-button>

        <div class="cpftf-footer">
          <a-typography-text type="secondary">
            <a @click="logout" role="button">Đăng xuất</a>
          </a-typography-text>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import { message } from "ant-design-vue";
import { userApi } from "@/services/user_service/userService";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { KeyOutlined } from "@ant-design/icons-vue";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const formState = reactive({
  password: "",
  password_confirmation: "",
});
const loading = ref(false);

// ——— password strength ———
const strengthScore = computed(() => {
  const p = formState.password || "";
  let score = 0;
  if (p.length >= 8) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (p.length >= 12) score++; // bonus length
  return Math.min(score, 5);
});
const strengthPercent = computed(() => [0, 25, 45, 65, 85, 100][strengthScore.value]);
const strengthLabel = computed(() => {
  switch (strengthScore.value) {
    case 0: return "Rất yếu";
    case 1: return "Yếu";
    case 2: return "Trung bình";
    case 3: return "Khá";
    case 4: return "Mạnh";
    case 5: return "Rất mạnh";
  }
});
const strengthStatus = computed(() => {
  // ant-design-vue: 'normal' | 'exception' | 'active' | 'success'
  if (strengthScore.value <= 1) return "exception";
  if (strengthScore.value <= 3) return "active";
  return "success";
});

const rules = {
  password: [
    { required: true, message: "Vui lòng nhập mật khẩu mới", trigger: "blur" },
    { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự", trigger: "blur" },
  ],
  password_confirmation: [
    { required: true, message: "Vui lòng xác nhận mật khẩu", trigger: "blur" },
    {
      validator: async (_, value) => {
        if (!value) return Promise.resolve();
        if (value !== formState.password) {
          return Promise.reject("Mật khẩu xác nhận không khớp");
        }
        return Promise.resolve();
      },
      trigger: "blur",
    },
  ],
};

function onFinishFailed({ errorFields }) {
  const first = errorFields?.[0]?.names?.[0];
  if (first) {
    const el = document.querySelector(`[name="${first}"]`);
    el?.focus?.();
  }
}

const handleSubmit = async () => {
  loading.value = true;
  try {
    await userApi.changePasswordFirstTime({
      password: formState.password,
      password_confirmation: formState.password_confirmation,
    });

    // cập nhật store để guard không chặn nữa
    if (auth?.patchUser) auth.patchUser({ is_first_password_changed: 1 });
    else auth.user = { ...(auth.user || {}), is_first_password_changed: 1 };

    message.success("Đổi mật khẩu thành công");

    // quay lại trang ban đầu
    const back = route.query?.redirect || "/";
    router.replace(back);
  } catch (err) {
    const res = err?.response;
    if (res?.status === 422 && res?.data?.errors) {
      const firstField = Object.keys(res.data.errors)[0];
      const firstMsg = res.data.errors[firstField]?.[0];
      message.error(firstMsg || "Dữ liệu không hợp lệ");
    } else {
      message.error(res?.data?.message || "Có lỗi xảy ra khi đổi mật khẩu");
    }
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    loading.value = false;
  }
};

async function logout() {
  try { await auth?.logout?.(); } catch { }
  router.replace({ name: "Login" });
}
</script>

<style scoped>
/* Nền nhẹ + căn giữa, KHÔNG full width card */
.cpftf-wrap {
  min-height: calc(100vh - 64px);
  /* trừ header 64px của bạn */
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(1200px 600px at 100% -10%, rgba(99, 102, 241, 0.12), transparent 60%),
    radial-gradient(1000px 500px at -10% 110%, rgba(16, 185, 129, 0.10), transparent 60%),
    #f7f9fb;
}

/* Card cố định độ rộng, tránh “full ra luôn” */
.cpftf-card {
  width: 480px;
  max-width: 92vw;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.06);
}

/* Header */
.cpftf-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.cpftf-logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.12);
  font-size: 18px;
}

.cpftf-title h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
}

.cpftf-title p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

/* Form spacing */
.password-change-form :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.password-change-form :deep(.ant-input-affix-wrapper) {
  border-radius: 10px;
}

/* Strength row */
.cpftf-strength {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  margin: -6px 0 8px;
}

.cpftf-strength :deep(.ant-progress-inner) {
  border-radius: 999px;
  overflow: hidden;
}

.cpftf-strength-label {
  font-size: 12px;
  color: #6b7280;
}

/* Hints + submit */
.cpftf-hints {
  list-style: none;
  padding: 0;
  margin: 4px 0 12px;
  color: #6b7280;
  font-size: 12.5px;
}

.cpftf-hints li::before {
  content: "•";
  color: #10b981;
  margin-right: 6px;
}

.cpftf-submit {
  border-radius: 10px;
  height: 40px;
  font-weight: 600;
}

/* Footer */
.cpftf-footer {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

/* Mobile fine-tune */
@media (max-width: 480px) {
  .cpftf-card {
    width: 100%;
  }
}
</style>
