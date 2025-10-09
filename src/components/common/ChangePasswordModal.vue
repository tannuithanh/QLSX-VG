<template>
    <a-modal v-model:visible="visible" title="Đổi mật khẩu" ok-text="Lưu" cancel-text="Huỷ" :confirm-loading="loading"
        @ok="handleOk">
        <a-form :model="form" :rules="rules" layout="vertical" ref="formRef">
            <a-form-item label="Mật khẩu hiện tại" name="current_password" has-feedback>
                <a-input-password v-model:value="form.current_password" />
            </a-form-item>

            <a-form-item label="Mật khẩu mới" name="new_password" has-feedback>
                <a-input-password v-model:value="form.new_password" />
            </a-form-item>

            <a-form-item label="Xác nhận mật khẩu mới" name="new_password_confirmation" has-feedback>
                <a-input-password v-model:value="form.new_password_confirmation" />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { authApi } from '@/services/auth'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible'])

const visible = ref(props.visible)
watch(() => props.visible, v => visible.value = v)
watch(visible, v => emit('update:visible', v))

const formRef = ref()
const loading = ref(false)
const form = reactive({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
})

const rules = {
    current_password: [{ required: true, message: 'Nhập mật khẩu hiện tại' }],
    new_password: [{ required: true, min: 6, message: 'Mật khẩu mới tối thiểu 6 ký tự' }],
    new_password_confirmation: [
        { required: true, message: 'Xác nhận mật khẩu mới' },
        {
            validator: (_, value) =>
                value === form.new_password
                    ? Promise.resolve()
                    : Promise.reject('Mật khẩu xác nhận không khớp')
        }
    ]
}

async function handleOk() {
    try {
        await formRef.value.validate()
        loading.value = true
        await authApi.changePassword(form) // POST /change-password
        notification.success({ message: 'Đổi mật khẩu thành công' })
        visible.value = false
    } catch (err) {
        notification.error({ message: 'Đổi mật khẩu thất bại', description: err.response?.data?.message || 'Lỗi không xác định' })
    } finally {
        loading.value = false
    }
}
</script>
