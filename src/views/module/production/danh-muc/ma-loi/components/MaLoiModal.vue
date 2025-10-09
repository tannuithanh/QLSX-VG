<template>
    <a-modal v-model:visible="innerVisible" :title="isEdit ? 'Cập nhật mã lỗi' : 'Thêm mã lỗi'" @ok="submit"
        @cancel="$emit('cancel')" ok-text="Lưu" cancel-text="Huỷ" destroyOnClose>
        <a-form :model="form" layout="vertical">
            <a-form-item label="Mã lỗi" required>
                <a-input v-model:value="form.code" placeholder="VD: 01A, 10B..." />
            </a-form-item>

            <a-form-item label="Dạng lỗi (tên lỗi)" required>
                <a-input v-model:value="form.name" placeholder="VD: Nứt, Bề mặt bám bẩn..." />
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

const form = reactive({ code: '', name: '' })
const isEdit = computed(() => !!(props.initial && props.initial.id))

watch(() => props.initial, (v) => {
    form.code = v?.code || ''
    form.name = v?.name || v?.typeName || '' // fallback nếu data cũ có typeName
}, { immediate: true })

function submit() {
    if (!form.code || !form.name) return
    emit('submit', { code: form.code.trim(), name: form.name.trim() })
}
</script>
