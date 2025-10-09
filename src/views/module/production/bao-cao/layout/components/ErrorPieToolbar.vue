<template>
    <a-form layout="inline" @submit.prevent>
        <a-form-item label="Xưởng" required>
            <a-select v-model:value="innerWorkshopId" :loading="loading" style="min-width: 260px" show-search
                :filter-option="filterOpt" placeholder="Chọn xưởng">
                <a-select-option v-for="w in workshops" :key="w.id" :value="w.id">
                    {{ w.name }} ({{ w.code }})
                </a-select-option>
            </a-select>
        </a-form-item>

        <a-form-item label="Từ ngày" required>
            <a-date-picker v-model:value="innerDateFrom" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                placeholder="YYYY-MM-DD" />
        </a-form-item>

        <a-form-item label="Đến ngày" required>
            <a-date-picker v-model:value="innerDateTo" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                placeholder="YYYY-MM-DD" />
        </a-form-item>

        <a-form-item>
            <a-space>
                <a-button type="primary" :loading="loading" @click="submit">Xem báo cáo</a-button>
                <a-button :disabled="loading" @click="reset">Xoá lọc</a-button>
            </a-space>
        </a-form-item>
    </a-form>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    loading: { type: Boolean, default: false },
    workshops: { type: Array, default: () => [] },
    workshopId: { type: [Number, String, null], default: null },
    dateFrom: { type: [String, null], default: null },
    dateTo: { type: [String, null], default: null },
})
const emit = defineEmits(['update:workshopId', 'update:dateFrom', 'update:dateTo', 'submit', 'reset'])

const innerWorkshopId = computed({
    get: () => props.workshopId,
    set: v => emit('update:workshopId', v),
})
const innerDateFrom = computed({
    get: () => props.dateFrom,
    set: v => emit('update:dateFrom', v),
})
const innerDateTo = computed({
    get: () => props.dateTo,
    set: v => emit('update:dateTo', v),
})

const filterOpt = (input, option) =>
    (option?.children ?? '').toString().toLowerCase().includes((input ?? '').toLowerCase())

function submit() { emit('submit') }
function reset() { emit('reset') }
</script>
