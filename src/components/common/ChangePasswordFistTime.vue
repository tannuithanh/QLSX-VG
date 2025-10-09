<template>
  <a-form :model="formState" :rules="rules" layout="vertical" @finish="handleSubmit" class="password-change-form">
    <a-form-item label="Mật khẩu mới" name="password">
      <a-input-password v-model:value="formState.password" placeholder="Nhập mật khẩu mới" />
    </a-form-item>

    <a-form-item label="Xác nhận mật khẩu" name="password_confirmation">
      <a-input-password v-model:value="formState.password_confirmation" placeholder="Nhập lại mật khẩu" />
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit" block :loading="loading">
        Đổi mật khẩu
      </a-button>
    </a-form-item>
  </a-form>
</template>

<script setup>
import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { userApi } from "@/services/user_service/userService";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const emit = defineEmits(["success"]);

const formState = reactive({
  password: "",
  password_confirmation: "",
});

const loading = ref(false);

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

const handleSubmit = async () => {
  loading.value = true
  try {
    await userApi.changePasswordFirstTime({
      password: formState.password,
      password_confirmation: formState.password_confirmation,
    })

    // cập nhật store để guard không chặn nữa
    if (auth?.patchUser) {
      auth.patchUser({ is_first_password_changed: 1 }) // hoặc true
    }

    message.success('Đổi mật khẩu thành công')
    emit('success')

    const back = route.query?.redirect || '/'
    router.replace(back)
  } catch (err) {
    const res = err?.response
    if (res?.status === 422 && res?.data?.errors) {
      const firstField = Object.keys(res.data.errors)[0]
      const firstMsg = res.data.errors[firstField]?.[0]
      message.error(firstMsg || 'Dữ liệu không hợp lệ')
    } else {
      message.error(res?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu')
    }
    console.error(err)
  } finally {
    loading.value = false
  }
}

</script>
