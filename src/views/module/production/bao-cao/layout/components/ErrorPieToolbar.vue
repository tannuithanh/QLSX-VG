<template>
    <a-form :layout="isMobile ? 'vertical' : 'inline'" @submit.prevent :class="{ 'mobile-form': isMobile }">
        <a-form-item label="Xưởng" required :class="{ 'mb-2': isMobile }">
            <a-select v-model:value="innerWorkshopId" :loading="loading" :style="isMobile ? 'width: 100%' : 'min-width: 260px'"
                show-search :filter-option="filterOpt" placeholder="Chọn xưởng">
                <a-select-option v-for="w in workshops" :key="w.id" :value="w.id">
                    {{ w.name }} ({{ w.code }})
                </a-select-option>
            </a-select>
        </a-form-item>

        <a-form-item label="Từ ngày" required :class="{ 'mb-2': isMobile }">
            <a-date-picker v-model:value="innerDateFrom" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                placeholder="YYYY-MM-DD" :style="isMobile ? 'width: 100%' : ''" />
        </a-form-item>

        <a-form-item label="Đến ngày" required :class="{ 'mb-2': isMobile }">
            <a-date-picker v-model:value="innerDateTo" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                placeholder="YYYY-MM-DD" :style="isMobile ? 'width: 100%' : ''" />
        </a-form-item>

        <a-form-item :class="isMobile ? 'mt-2 mb-0' : ''">
            <a-space :style="isMobile ? 'width: 100%; justify-content: center' : ''">
                <a-button type="primary" :loading="loading" @click="submit" :block="isMobile">Xem báo cáo</a-button>
                <a-button :disabled="loading" @click="reset" :block="isMobile">Xoá lọc</a-button>
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
    isMobile: { type: Boolean, default: false }
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

<style scoped>
.mobile-form :deep(.ant-form-item) {
    margin-right: 0;
}

.mb-2 {
    margin-bottom: 8px;
}

.mt-2 {
    margin-top: 8px;
}

.mb-0 {
    margin-bottom: 0;
}
</style>
