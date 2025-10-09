<template>
    <a-modal :visible="visible" title="Thêm diện tích chuẩn" :confirmLoading="saving" okText="Lưu" cancelText="Hủy"
        destroyOnClose @ok="submit" @cancel="$emit('update:visible', false)">
        <div class="grid">
            <div>
                <div class="lbl">Diện tích chuẩn</div>
                <a-input-number v-model:value="form.standard_area" :precision="4" :step="0.0001" class="w-auto"
                    placeholder="Nhập diện tích chuẩn" />
            </div>
        </div>
    </a-modal>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { standardProductAreaApi } from '@/services/production_service/standardProductAreaService'

const props = defineProps({
    visible: { type: Boolean, default: false },
})
const emits = defineEmits(['update:visible', 'saved'])

const saving = ref(false)
const form = reactive({ standard_area: null })

async function submit() {
    try {
        saving.value = true
        await standardProductAreaApi.create({ standard_area: form.standard_area })
        message.success('Đã lưu')
        emits('saved')
        emits('update:visible', false)
        form.standard_area = null
    } catch (e) {
        console.error(e)
        const msg = e?.response?.data?.message ||
            (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(', ')) ||
            e?.message || 'Lỗi khi lưu dữ liệu'
        message.error(msg)
    } finally {
        saving.value = false
    }
}
</script>
