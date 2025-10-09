<template>
    <a-modal v-model:visible="innerVisible" :title="isEdit ? 'Cập nhật hệ số layout' : 'Thêm hệ số layout'" @ok="submit"
        @cancel="$emit('cancel')" ok-text="Lưu" cancel-text="Huỷ" destroyOnClose>
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
            <a-form-item label="Mã hàng" name="item_code" required>
                <a-input v-model:value="form.item_code" />
            </a-form-item>

            <a-form-item label="Chiều dài (L)" name="L" required>
                <a-input-number v-model:value="form.L" :min="0" :step="1" :precision="0" style="width: 100%" />
            </a-form-item>

            <a-form-item label="Chiều rộng (W)" name="W" required>
                <a-input-number v-model:value="form.W" :min="0" :step="1" :precision="0" style="width: 100%" />
            </a-form-item>

            <a-form-item label="Chiều cao (H)" name="H" required>
                <a-input-number v-model:value="form.H" :min="0" :step="1" :precision="0" style="width: 100%" />
            </a-form-item>

            <a-form-item label="Hệ số (coefficient)" name="coefficient" required>
                <a-input-number v-model:value="form.coefficient" :min="0" :precision="4" :step="0.0001"
                    style="width: 100%" />
            </a-form-item>

        </a-form>
    </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
    visible: { type: Boolean, default: false },
    initial: { type: Object, default: null }, // { id?, item_code?, L?, W?, H?, coefficient? }
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const innerVisible = computed({
    get: () => props.visible,
    set: v => emit('update:visible', v),
})

const formRef = ref(null)

const form = reactive({
    item_code: '',
    L: null,
    W: null,
    H: null,
    coefficient: null,
})

const isEdit = computed(() => !!(props.initial && props.initial.id))

watch(
    () => props.initial,
    (v) => {
        form.item_code = v?.item_code ?? ''
        form.L = v?.L ?? null
        form.W = v?.W ?? null
        form.H = v?.H ?? null
        form.coefficient = v?.coefficient ?? null
    },
    { immediate: true }
)

const rules = {
    item_code: [
        { required: true, message: 'Vui lòng nhập mã hàng' },
    ],
    L: [{ required: true, type: 'number', message: 'Vui lòng nhập L (số nguyên)' }],
    W: [{ required: true, type: 'number', message: 'Vui lòng nhập W (số nguyên)' }],
    H: [{ required: true, type: 'number', message: 'Vui lòng nhập H (số nguyên)' }],
    coefficient: [{ required: true, type: 'number', message: 'Vui lòng nhập hệ số (tối đa 4 số thập phân)' }],
}


function submit() {
    formRef.value?.validate()
        .then(() => {
            // Giá trị a-input-number không dùng string-mode => đã là number
            const payload = {
                item_code: String(form.item_code || '').trim(),
                L: Number(form.L),
                W: Number(form.W),
                H: Number(form.H),
                coefficient: Number(form.coefficient),
            }
            // Bạn có thể thêm chặn âm nếu cần: if (payload.L < 0 || ...) return;
            emit('submit', payload)
        })
        .catch(() => {
            // validate fail -> không emit
        })
}
</script>
