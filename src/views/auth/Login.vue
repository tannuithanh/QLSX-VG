<template>
  <div class="login-page">
    <div class="overlay"></div>

    <a-card class="login-card" :bordered="false">
      <div class="logo-wrap">
        <img src="@/assets/images/logo.png" alt="Logo" class="logo" />
      </div>

      <div class="title">HỆ THỐNG DASHBOARD</div>
      <div class="subtitle">Đăng nhập để tiếp tục phiên làm việc</div>

      <a-form ref="formRef" layout="vertical" :model="form" :rules="rules" autocomplete="on" @finish="onSubmit">
        <a-form-item label="Email" name="email" has-feedback>
          <a-input v-model:value="form.email" type="email" placeholder="admin@example.com" autocomplete="username">
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="Mật khẩu" name="password" has-feedback>
          <a-input-password v-model:value="form.password" placeholder="••••••••" autocomplete="current-password">
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <div class="row-between">
          <a-checkbox v-model:checked="form.remember">Ghi nhớ đăng nhập</a-checkbox>
          <a-button type="link" class="text-link" @click="goForgot">Quên mật khẩu?</a-button>
        </div>

        <a-button type="primary" html-type="submit" block size="large" class="btn-primary" :loading="loading"
          :disabled="loading">
          <template #icon>
            <LoginOutlined />
          </template>
          Đăng nhập
        </a-button>

        <!-- <a-button class="btn-diagnose" block @click="diag" :loading="diagLoading">
          Kiểm tra kết nối /health
        </a-button> -->

        
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { notification } from 'ant-design-vue'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons-vue'
import { authApi } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

// ---- setup ----
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const diagLoading = ref(false)

const form = reactive({
  email: 'admin@example.com',
  password: '123',
  remember: true,
})

const rules = {
  email: [
    { required: true, message: 'Vui lòng nhập email' },
    { type: 'email', message: 'Email không hợp lệ' },
  ],
  password: [{ required: true, message: 'Vui lòng nhập mật khẩu' }],
}

// Ghi chú env để dễ debug trên máy user
const envNote = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) return 'Chú ý: VITE_API_BASE_URL chưa được cấu hình.'
  return `API: ${base}`
})

function goForgot() {
  notification.info({
    message: 'Thông báo',
    description: 'Chức năng quên mật khẩu sẽ được bổ sung sau.',
  })
}

function showAxiosError(e, fallbackMsg = 'Không thể kết nối. Có thể do CORS/HTTPS/DNS.') {
  const status = e?.response?.status
  const msg =
    e?.response?.data?.message ||
    e?.message ||
    e?.code ||
    fallbackMsg

  // log chi tiết để dev soi ở máy user
  // (sẽ không ảnh hưởng UX vì vẫn show toast ngắn gọn)
  // eslint-disable-next-line no-console
  console.error('[LOGIN ERROR]', {
    status,
    code: e?.code,
    url: e?.config?.url,
    message: e?.message,
    data: e?.response?.data,
  })

  if (status === 422) {
    notification.warning({
      message: 'Thông tin không hợp lệ',
      description: msg,
      duration: 5,
    })
  } else if (status === 401) {
    notification.error({
      message: 'Đăng nhập thất bại',
      description: msg || 'Email hoặc mật khẩu không đúng',
      duration: 5,
    })
  } else {
    notification.error({
      message: 'Lỗi kết nối',
      description: msg,
      duration: 6,
    })
  }
}

async function onSubmit() {
  try {
    loading.value = true

    // 1) Login
    const res = await authApi.login({
      email: form.email,
      password: form.password,
      remember: form.remember,
    })

    const token = res?.data?.token || res?.data?.access_token
    const rawUser = res?.data?.user || null

    if (!token) {
      throw new Error('API không trả về token (token/access_token).')
    }

    // Lưu tạm để có header ngay
    auth.setAuth(token, rawUser)

    // 2) Lấy thông tin /me (ổn định user trước khi điều hướng)
    try {
      const me = await authApi.me()
      if (me?.data) auth.setAuth(token, me.data)
    } catch (err) {
      // Nếu /me fail vẫn tiếp tục với rawUser
      // eslint-disable-next-line no-console
      console.warn('[ME ERROR]', err?.message || err)
    }

    notification.success({
      message: 'Đăng nhập thành công',
      description: `Xin chào ${rawUser?.name || 'bạn'}!`,
    })

    // 3) Điều hướng (ưu tiên redirect query)
    const redirectTo =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : '/settings'
    router.replace(redirectTo)
  } catch (e) {
    showAxiosError(e)
  } finally {
    loading.value = false
  }
}

// async function diag() {
//   const base = import.meta.env.VITE_API_BASE_URL
//   if (!base) {
//     notification.error({
//       message: 'Thiếu cấu hình',
//       description: 'VITE_API_BASE_URL chưa có trong .env.',
//     })
//     return
//   }

//   diagLoading.value = true
//   try {
//     const u = new URL('/health', base)
//     const r = await fetch(u, { method: 'GET' })
//     notification.info({
//       message: 'Kết quả /health',
//       description: `URL: ${u.href} — ${r.status} ${r.statusText}`,
//       duration: 5,
//     })
//   } catch (e) {
//     // eslint-disable-next-line no-console
//     console.error('[DIAG /health ERROR]', e)
//     notification.error({
//       message: 'Không gọi được /health',
//       description: e?.message || String(e),
//       duration: 6,
//     })
//   } finally {
//     diagLoading.value = false
//   }
// }

onMounted(() => {
  // In ra env để dev soi trên máy user (chỉ 1 lần khi vào trang)
  // eslint-disable-next-line no-console
  console.log('[ENV] VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL)
})
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: url("@/assets/images/BG.jpg") center center / cover no-repeat fixed;
}

.overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 60% at 50% 40%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 40%, rgba(0, 0, 0, 0.25) 100%);
  pointer-events: none;
}

.login-card {
  width: 100%;
  max-width: 460px;
  padding: 28px 26px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .12), 0 6px 12px rgba(0, 0, 0, .08);
  z-index: 1;
  animation: lift .42s ease-out;
}

@keyframes lift {
  from {
    transform: translateY(8px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.logo {
  width: 92px;
  height: 92px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, .15));
}

.title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  letter-spacing: .2px;
  margin-top: 6px;
  margin-bottom: 4px;
  background: linear-gradient(90deg, #111, #3b3b3b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 16px;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -2px 0 10px;
}

.text-link {
  padding: 0;
}

.forgot-center {
  text-align: center;
  margin-top: 10px;
}

.btn-primary {
  height: 44px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(24, 144, 255, .25);
}

.btn-primary:hover {
  box-shadow: 0 8px 18px rgba(24, 144, 255, .32);
}

.btn-diagnose {
  margin-top: 10px;
}

.env-note {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
  text-align: center;
  user-select: text;
  word-break: break-all;
}
</style>
