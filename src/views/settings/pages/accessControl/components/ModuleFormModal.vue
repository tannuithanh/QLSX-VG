<template>
    <a-modal v-model:visible="visible" :title="mode === 'edit' ? 'Sửa module' : 'Thêm module'" :confirm-loading="saving"
        @ok="submit" @cancel="$emit('cancel')" ok-text="Lưu" cancel-text="Huỷ" destroy-on-close>
        <a-form ref="formRef" layout="vertical" :model="form" :rules="rules">
            <a-form-item label="Tên module" name="name" has-feedback>
                <a-input v-model:value="form.name" placeholder="VD: Quản lý người dùng" />
            </a-form-item>
            <a-form-item label="Mã (code)" name="code" has-feedback>
                <a-input v-model:value="form.code" placeholder="VD: USER_MANAGEMENT" />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
const props = defineProps({
    visible: Boolean,
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const visible = ref(props.visible)
watch(() => props.visible, v => visible.value = v)
watch(visible, v => emit('update:visible', v))

const formRef = ref()
const form = reactive({ name: '', code: '' })

watch(() => props.initial, (v) => {
    Object.assign(form, { name: '', code: '' }, v || {})
}, { immediate: true })

const rules = {
    name: [{ required: true, message: 'Nhập tên module' }, { min: 2, message: 'Tối thiểu 2 ký tự' }],
    code: [
        { required: true, message: 'Nhập mã (code)' },
        { pattern: /^[A-Z0-9_\\-]+$/, message: 'Chỉ chữ HOA, số, _, -' },
    ],
}

const saving = ref(false)
async function submit() {
    await formRef.value?.validate()
    saving.value = true
    try {
        emit('submit', { name: form.name?.trim(), code: form.code?.trim().toUpperCase() })
    } finally {
        saving.value = false
    }
}
</script>
