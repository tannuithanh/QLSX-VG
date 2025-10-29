<template>
    <div class="toolbar">
        <div class="left">
            <!-- Khoảng ngày -->
            <a-range-picker class="ml" v-model:value="range" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                placeholder="Chọn khoảng ngày" :disabled="loading" :allow-clear="true" />

            <!-- Xưởng -->
            <a-select class="ml sel" v-model:value="workshopId" :options="workshopOptions" allow-clear
                placeholder="Chọn xưởng" show-search :filter-option="filterOption" :disabled="loading"
                @change="onWorkshopChange" />

            <!-- Tổ (lọc theo xưởng) -->
            <a-select class="ml sel" v-model:value="teamId" :options="teamOptionsFiltered" allow-clear
                placeholder="Chọn tổ" show-search :filter-option="filterOption" :disabled="loading"
                @change="onTeamChange" />

            <!-- Mã hàng -->
            <a-input class="ml search" v-model:value="kw" :disabled="loading" allow-clear
                placeholder="Tìm theo mã (item_code)" @pressEnter="emitSubmit" />

            <a-button type="primary" class="ml" :loading="loading" @click="emitSubmit">Xem báo cáo</a-button>
            <a-button class="ml" :loading="loading" @click="$emit('reload')">Tải lại</a-button>
        </div>
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
.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
}

.left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.ml {
    margin-left: 8px;
}

.sel {
    min-width: 220px;
}

.search {
    width: 240px;
}
</style>
