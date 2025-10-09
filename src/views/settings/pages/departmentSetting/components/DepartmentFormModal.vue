<template>
    <a-modal :open="internalOpen" :title="mode === 'edit' ? 'Sửa phòng ban' : 'Thêm phòng ban'"
        :confirm-loading="saving" destroy-on-close @ok="submit" @cancel="$emit('cancel')">
        <a-form ref="formRef" layout="vertical" :model="form" :rules="rules" @submit.prevent>
            <a-form-item label="Tên phòng ban" name="name" has-feedback>
                <a-input v-model:value="form.name" placeholder="VD: Kỹ thuật" />
            </a-form-item>
            <a-form-item label="Mã" name="code" has-feedback>
                <a-input v-model:value="form.code" placeholder="VD: TECH" @input="toUpper" />
            </a-form-item>
            <a-form-item label="Mô tả" name="description">
                <a-textarea v-model:value="form.description" :rows="3" placeholder="Ghi chú..." />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
    open: Boolean,
    mode: { type: String, default: 'create' },
    initial: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'submit', 'cancel'])

const internalOpen = ref(props.open)
watch(() => props.open, v => (internalOpen.value = v))
watch(internalOpen, v => emit('update:open', v))

const formRef = ref()
const saving = ref(false)

const empty = () => ({ id: null, name: '', code: '', description: '' })
const form = reactive(empty())
watch(
    () => props.initial,
    (val) => Object.assign(form, empty(), val || {}),
    { immediate: true }
)

const rules = {
    name: [{ required: true, message: 'Nhập tên phòng ban' }, { min: 2, message: 'Tối thiểu 2 ký tự' }],
    code: [
        { required: true, message: 'Nhập mã' },
        { pattern: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ gồm chữ, số, _ hoặc -' },
    ],
}

function toUpper(e) {
    form.code = (e?.target?.value || '').toUpperCase()
}

async function submit() {
    await formRef.value?.validate()
    saving.value = true
    try {
        emit('submit', { ...form })
    } finally {
        saving.value = false
    }
}
</script>
