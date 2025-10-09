<template>
    <div class="toolbar">
        <div class="left">
            <!-- Chọn 1 ngày duy nhất -->
            <a-date-picker class="ml" v-model:value="oneDay" format="YYYY-MM-DD" valueFormat="YYYY-MM-DD"
                placeholder="Chọn ngày" :disabled="loading" />

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

const props = defineProps({
    loading: Boolean,
    dateFrom: String, // giữ để tương thích với parent
    dateTo: String,   // giữ để tương thích với parent

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

// Chỉ 1 ngày: ưu tiên dùng dateFrom; fallback dateTo
const oneDay = ref(props.dateFrom || props.dateTo || '')
watch(() => props.dateFrom, v => {
    if (v) oneDay.value = v
})
watch(() => props.dateTo, v => {
    if (!oneDay.value && v) oneDay.value = v
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
    if (!oneDay.value) {
        message.warning('Vui lòng chọn ngày.')
        return
    }
    // Gửi cùng 1 ngày cho cả from/to để tương thích với parent
    emits('submit', { dateFrom: oneDay.value, dateTo: oneDay.value })
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
