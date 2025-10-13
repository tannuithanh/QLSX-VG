<template>
  <div class="login-page">
    <div class="overlay"></div>

    <a-card class="login-card" :bordered="false">
      <div class="logo-wrap">
        <img src="@/assets/images/logo.png" alt="Logo" class="logo" />
      </div>

      <div class="title">HỆ THỐNG DASHBOARD</div>
      <div class="subtitle">Đăng nhập để tiếp tục phiên làm việc</div>

      <a-form layout="vertical" :model="form" :rules="rules" @submit.prevent="onSubmit" autocomplete="on" ref="formRef">
        <a-form-item label="Email" name="email" has-feedback>
          <a-input v-model:value="form.email" type="email" placeholder="admin@example.com" autocomplete="username">
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item label="Mật khẩu" name="password" has-feedback>
          <a-input-password v-model:value="form.password" placeholder="••••••••" autocomplete="current-password"
            @pressEnter="onSubmit">
            <template #prefix>
              <LockOutlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-button type="primary" html-type="submit" block :loading="loading" size="large" class="btn-primary"
          :disabled="loading">
          <template #icon>
            <LoginOutlined />
          </template>
          Đăng nhập
        </a-button>

        <div class="forgot-center">
          <a-button type="link" class="text-link" @click="goForgot">Quên mật khẩu?</a-button>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { notification } from 'ant-design-vue'
import { authApi } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref()
const form = reactive({
  email: 'admin@example.com',
  password: '123',
})
const loading = ref(false)

const rules = {
  email: [
    { required: true, message: 'Vui lòng nhập email' },
    { type: 'email', message: 'Email không hợp lệ' },
  ],
  password: [{ required: true, message: 'Vui lòng nhập mật khẩu' }],
}

async function onSubmit() {
  try {
    await formRef.value?.validate()
    loading.value = true

    // 1) Login
    const res = await authApi.login({ email: form.email, password: form.password })
    const token = res?.data?.token || res?.data?.access_token
    const rawUser = res?.data?.user || null

    // Lưu tạm (để header có dữ liệu ngay)
    auth.setAuth(token, rawUser)

    // 2) Lấy user đầy đủ từ /me (quan trọng để tránh user=null khi SPA chuyển trang)
    try {
      // nếu axios interceptor chưa gắn token từ store kịp, truyền tay cũng được:
      const me = await authApi.me?.()
      if (me?.data) auth.setAuth(token, me.data)
    } catch (_) {
      // nếu /me fail thì vẫn giữ user từ login response
    }

    notification.success({
      message: 'Đăng nhập thành công',
      description: `Xin chào ${rawUser?.name || 'bạn'}!`,
    })

    const redirectTo =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : '/settings'
    router.replace(redirectTo)
  } catch (e) {
    const status = e?.response?.status
    if (status === 422) {
      notification.warning({
        message: 'Thông tin không hợp lệ',
        description: e?.response?.data?.message || 'Vui lòng kiểm tra lại',
      })
    } else if (status === 401) {
      notification.error({
        message: 'Đăng nhập thất bại',
        description: e?.response?.data?.message || 'Email hoặc mật khẩu không đúng',
      })
    } else {
      notification.error({
        message: 'Lỗi hệ thống',
        description: 'Có lỗi xảy ra. Vui lòng thử lại',
      })
    }
  } finally {
    loading.value = false
  }
}

function goForgot() {
  notification.info({
    message: 'Thông báo',
    description: 'Chức năng quên mật khẩu sẽ được bổ sung sau.',
  })
}
</script>

<style scoped>
/* giữ nguyên style của bạn */
</style>


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
  max-width: 440px;
  padding: 28px 26px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 6px 12px rgba(0, 0, 0, 0.08);
  z-index: 1;
  animation: lift 420ms ease-out;
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
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}

.title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.2px;
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
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.25);
}

.btn-primary:hover {
  box-shadow: 0 8px 18px rgba(24, 144, 255, 0.32);
}
</style>
