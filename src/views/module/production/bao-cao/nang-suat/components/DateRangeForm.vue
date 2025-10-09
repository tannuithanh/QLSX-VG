<template>
    <a-form layout="inline" @submit.prevent="emitSubmit">
        <a-form-item label="Từ ngày" required>
            <a-date-picker v-model:value="from" :disabled="loading" format="YYYY-MM-DD" valueFormat="YYYY-MM-DD"
                placeholder="YYYY-MM-DD" />
        </a-form-item>

        <a-form-item label="Đến ngày" required>
            <a-date-picker v-model:value="to" :disabled="loading" format="YYYY-MM-DD" valueFormat="YYYY-MM-DD"
                placeholder="YYYY-MM-DD" />
        </a-form-item>

        <a-form-item>
            <a-button type="primary" :loading="loading" @click="emitSubmit">Xem báo cáo</a-button>
        </a-form-item>
    </a-form>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'

const props = defineProps({
    loading: { type: Boolean, default: false },
})
const emits = defineEmits(['submit'])

const from = ref('')
const to = ref('')

function emitSubmit() {
    if (!from.value || !to.value) {
        message.warning('Vui lòng chọn đầy đủ từ ngày và đến ngày.')
        return
    }
    if (dayjs(from.value).isAfter(dayjs(to.value))) {
        message.warning('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.')
        return
    }
    emits('submit', { dateFrom: from.value, dateTo: to.value })
}
</script>
