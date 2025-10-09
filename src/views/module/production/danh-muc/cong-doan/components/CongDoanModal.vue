<!-- src/views/congdoan/components/CongDoanModal.vue -->
<template>
    <a-modal v-model:visible="innerVisible" :title="isEdit ? 'Cập nhật công đoạn' : 'Thêm công đoạn'" @ok="submit"
        @cancel="$emit('cancel')" ok-text="Lưu" cancel-text="Huỷ" destroyOnClose>
        <a-form :model="form" layout="vertical">
            <a-form-item label="Tên công đoạn" required>
                <a-input v-model:value="form.name" />
            </a-form-item>
            <a-form-item label="Mã công đoạn" required>
                <a-input v-model:value="form.code" />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
    visible: { type: Boolean, default: false },
    initial: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const innerVisible = computed({
    get: () => props.visible,
    set: (v) => emit('update:visible', v),
})

const form = reactive({ name: '', code: '' })
const isEdit = computed(() => !!(props.initial && props.initial.id))

watch(() => props.initial, (v) => {
    form.name = v?.name || ''
    form.code = v?.code || ''
}, { immediate: true })

function submit() {
    if (!form.name || !form.code) return
    emit('submit', { name: form.name.trim(), code: form.code.trim() })
}
</script>
