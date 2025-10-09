<template>
    <a-modal v-model:visible="internalVisible" :title="mode === 'edit' ? 'Sửa chức năng' : 'Thêm chức năng'"
        :mask-closable="false" destroy-on-close @cancel="$emit('cancel')" @ok="submit" ok-text="Lưu">
        <a-form ref="formRef" layout="vertical" :model="form" :rules="rules" @submit.prevent>
            <a-form-item label="Tên chức năng" name="name" has-feedback>
                <a-input v-model:value="form.name" placeholder="VD: Quản trị hệ thống" />
            </a-form-item>
            <a-form-item label="Mã chức năng" name="code" has-feedback>
                <a-input v-model:value="form.code"  @blur="normalizeCode" />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
    visible: Boolean,
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const internalVisible = ref(props.visible)
watch(() => props.visible, v => (internalVisible.value = v))
watch(internalVisible, v => emit('update:visible', v))

const empty = () => ({ id: null, name: '', code: '' })
const form = reactive(empty())

watch(
    () => props.initial,
    v => Object.assign(form, empty(), v || {}),
    { immediate: true }
)

const rules = {
    name: [
        { required: true, message: 'Vui lòng nhập tên chức năng' },
        { min: 2, message: 'Tối thiểu 2 ký tự' }
    ],
    code: [
        { required: true, message: 'Vui lòng nhập mã chức năng' },
        { pattern: /^[A-Za-z0-9_-]+$/, message: 'Chỉ gồm chữ, số, gạch dưới hoặc gạch ngang' }
    ]
}

function normalizeCode() {
    if (form.code) form.code = String(form.code).trim().toUpperCase()
}

const formRef = ref()
async function submit() {
    normalizeCode()
    await formRef.value?.validate()
    emit('submit', { name: form.name.trim(), code: form.code.trim() })
}
</script>
