<template>
    <div class="toolbar-container">
        <a-row :gutter="[12, 12]" align="middle">
            <!-- Khoảng ngày -->
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
                <a-range-picker v-model:value="range" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                    placeholder="Chọn khoảng ngày" :disabled="loading" :allow-clear="true" style="width: 100%" />
            </a-col>

            <!-- Xưởng -->
            <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-select v-model:value="workshopId" :options="workshopOptions" allow-clear placeholder="Chọn xưởng"
                    show-search :filter-option="filterOption" :disabled="loading" @change="onWorkshopChange"
                    style="width: 100%" />
            </a-col>

            <!-- Tổ (lọc theo xưởng) -->
            <a-col :xs="24" :sm="12" :md="8" :lg="4">
                <a-select v-model:value="teamId" :options="teamOptionsFiltered" allow-clear placeholder="Chọn tổ"
                    show-search :filter-option="filterOption" :disabled="loading" @change="onTeamChange"
                    style="width: 100%" />
            </a-col>

            <!-- Mã hàng -->
            <a-col :xs="24" :sm="12" :md="8" :lg="5">
                <a-input v-model:value="kw" :disabled="loading" allow-clear placeholder="Tìm theo mã (item_code)"
                    @pressEnter="emitSubmit" style="width: 100%" />
            </a-col>

            <!-- Nút bấm -->
            <a-col :xs="24" :lg="5">
                <a-space :style="{ width: '100%', justifyContent: isMobile ? 'center' : 'flex-end' }">
                    <a-button type="primary" :loading="loading" @click="emitSubmit" class="full-width-xs">Xem</a-button>
                    <a-button :loading="loading" @click="$emit('reload')" class="full-width-xs">Tải lại</a-button>
                </a-space>
            </a-col>
        </a-row>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

const props = defineProps({
    loading: Boolean,
    dateFrom: String, // để sync từ parent nếu có
    dateTo: String,   // để sync từ parent nếu có

    // v-model
    reportType: { type: String, default: 'nang-suat' },
    search: { type: String, default: '' },

    // danh mục
    workshops: { type: Array, default: () => [] }, // [{id, name, code}]
    teams: { type: Array, default: () => [] },     // [{id, name, code, workshop_id}]

    // filter theo ID
    workshopId: [String, Number],
    teamId: [String, Number],
    isMobile: Boolean,
})

const emits = defineEmits([
    'submit', 'reload',
    'update:reportType', 'update:search',
    'update:workshopId', 'update:teamId'
])

// Range nội bộ: ['YYYY-MM-DD', 'YYYY-MM-DD']
const range = ref([props.dateFrom || '', props.dateTo || ''])
watch(() => [props.dateFrom, props.dateTo], ([df, dt]) => {
    // đồng bộ từ parent -> child
    range.value = [df || '', dt || '']
})

const rt = computed({
    get: () => props.reportType,
    set: v => emits('update:reportType', v),
})
const kw = computed({
    get: () => props.search,
    set: v => emits('update:search', v || ''),
})

const workshopId = computed({
    get: () => props.workshopId ?? null,
    set: v => emits('update:workshopId', v ?? null),
})
const teamId = computed({
    get: () => props.teamId ?? null,
    set: v => emits('update:teamId', v ?? null),
})

const workshopOptions = computed(() =>
    (props.workshops || []).map(w => ({ label: `${w.name} (${w.code})`, value: w.id }))
)
const teamOptions = computed(() =>
    (props.teams || []).map(t => ({ label: `${t.name} (${t.code})`, value: t.id, workshop_id: t.workshop_id }))
)
const teamOptionsFiltered = computed(() =>
    workshopId.value ? teamOptions.value.filter(t => Number(t.workshop_id) === Number(workshopId.value)) : teamOptions.value
)

function onWorkshopChange(newWid) {
    const currTeam = teamOptions.value.find(t => t.value === teamId.value)
    if (currTeam && Number(currTeam.workshop_id) !== Number(newWid)) teamId.value = null
}
function onTeamChange(newTid) {
    const t = teamOptions.value.find(x => x.value === newTid)
    if (t && t.workshop_id) workshopId.value = t.workshop_id
}

function filterOption(input, option) {
    return String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function emitSubmit() {
    const [df, dt] = range.value || []
    if (!df || !dt) {
        message.warning('Vui lòng chọn khoảng ngày (từ ngày & đến ngày).')
        return
    }
    const a = dayjs(df), b = dayjs(dt)
    if (!a.isValid() || !b.isValid()) {
        message.warning('Ngày không hợp lệ.')
        return
    }
    // auto-sắp xếp if user chọn ngược
    const from = a.isAfter(b) ? b.format('YYYY-MM-DD') : a.format('YYYY-MM-DD')
    const to = a.isAfter(b) ? a.format('YYYY-MM-DD') : b.format('YYYY-MM-DD')

    emits('submit', { dateFrom: from, dateTo: to })
}
</script>

<style scoped>
.toolbar-container {
    width: 100%;
}

@media (max-width: 576px) {
  .full-width-xs {
    width: 100%;
  }
}
</style>
