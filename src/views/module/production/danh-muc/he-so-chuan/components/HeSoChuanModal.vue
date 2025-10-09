<template>
    <a-modal v-model:visible="innerVisible" :title="isEdit ? 'Cập nhật hệ số chuẩn' : 'Thêm hệ số chuẩn'" @ok="submit"
        @cancel="$emit('cancel')" ok-text="Lưu" cancel-text="Huỷ" destroyOnClose>
        <a-form :model="form" layout="vertical">
            <a-form-item label="Mã hàng" required>
                <a-input v-model:value="form.item_code" />
            </a-form-item>
            <a-form-item label="Hệ số" required>
                <a-input-number v-model:value="form.coefficient" :min="0" :step="0.0001" style="width: 100%"
                    string-mode />
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
    set: v => emit('update:visible', v),
})

const form = reactive({ item_code: '', coefficient: null })
const isEdit = computed(() => !!(props.initial && props.initial.id))

watch(() => props.initial, (v) => {
    form.item_code = v?.item_code || ''
    // đảm bảo dạng số/chuỗi số cho InputNumber
    form.coefficient = (v?.coefficient ?? null)
}, { immediate: true })

function submit() {
    const item = String(form.item_code || '').trim()
    const coef = Number(form.coefficient)
    if (!item || isNaN(coef)) return
    emit('submit', { item_code: item, coefficient: coef })
}
</script>
