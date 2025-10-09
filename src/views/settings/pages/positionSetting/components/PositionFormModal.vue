<template>
    <a-modal v-model:visible="internalVisible" :title="mode === 'edit' ? 'Sửa chức vụ' : 'Thêm chức vụ'"
        :confirm-loading="saving" @ok="submit" @cancel="emit('update:visible', false)" destroy-on-close>
        <a-form ref="formRef" layout="vertical" :model="form" :rules="rules">
            <a-form-item label="Tên chức vụ" name="name" has-feedback>
                <a-input v-model:value="form.name" placeholder="VD: Trưởng phòng" />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
    visible: Boolean,                 // 👈 nhận prop visible
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const internalVisible = ref(props.visible)
watch(() => props.visible, v => internalVisible.value = v)
watch(internalVisible, v => emit('update:visible', v))

const formRef = ref()
const form = reactive({ name: '' })
watch(() => props.initial, (val) => {
    form.name = val?.name || ''
}, { immediate: true })

const rules = {
    name: [
        { required: true, message: 'Vui lòng nhập tên chức vụ' },
        { min: 2, message: 'Tối thiểu 2 ký tự' },
    ],
}

const saving = ref(false)

async function submit() {
    await formRef.value?.validate()
    saving.value = true
    try {
        emit('submit', { name: form.name })
        emit('update:visible', false)
    } finally {
        saving.value = false
    }
}
</script>
