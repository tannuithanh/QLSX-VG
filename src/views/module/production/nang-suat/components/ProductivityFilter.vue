<template>
    <a-card size="small" style="margin-bottom:12px">
        <a-form layout="inline" @submit.prevent>
            <a-form-item label="Ngày">
                <a-range-picker
                    v-model:value="local.dateRange"
                    format="DD/MM/YYYY"
                    value-format="YYYY-MM-DD"
                    :allow-clear="true"
                    style="min-width: 260px"
                    @change="onDateChange"
                />
            </a-form-item>

            <a-form-item label="Xưởng">
                <a-select
                    v-model:value="local.workshop_id"
                    :options="workshopOptions"
                    allow-clear
                    placeholder="Chọn xưởng"
                    style="min-width: 200px"
                    show-search
                    :filter-option="filterOption"
                    @change="onWorkshopChange"
                />
            </a-form-item>

            <a-form-item label="Tổ">
                <a-select
                    v-model:value="local.team_id"
                    :options="teamOptionsFiltered"
                    allow-clear
                    placeholder="Chọn tổ"
                    style="min-width: 200px"
                    show-search
                    :filter-option="filterOption"
                    @change="onTeamChange"
                />
            </a-form-item>

            <a-form-item label="Đơn hàng">
                <a-input
                    v-model:value="local.order_no"
                    placeholder="VD: ABC"
                    allow-clear
                    style="min-width: 160px"
                />
            </a-form-item>

            <a-form-item label="Mã hàng">
                <a-input
                    v-model:value="local.item_code"
                    placeholder="VD: 66-00100-S1"
                    allow-clear
                    style="min-width: 180px"
                />
            </a-form-item>

            <a-form-item label="Người tạo">
                <a-input
                    v-model:value="local.created_by_name"
                    placeholder="Nhập người tạo"
                    allow-clear
                    style="min-width: 180px"
                />
            </a-form-item>
        </a-form>
    </a-card>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
    modelValue: { type: Object, default: () => ({}) },
    workshops: { type: Array, default: () => [] },
    teams: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'search'])

const local = reactive({
    dateRange: [],
    workshop_id: null,
    team_id: null,
    order_no: '',
    item_code: '',
    created_by_name: '',
})

watch(
    () => props.modelValue,
    v => Object.assign(local, {
        dateRange: [],
        workshop_id: null,
        team_id: null,
        order_no: '',
        item_code: '',
        created_by_name: '',
        ...(v || {}),
    }),
    { immediate: true, deep: true }
)

watch(local, v => {
    emit('update:modelValue', { ...v })
    emit('search')
}, { deep: true })

const workshopOptions = computed(() =>
    (props.workshops || []).map(w => ({ label: `${w.name} (${w.code})`, value: w.id }))
)

const teamOptions = computed(() =>
    (props.teams || []).map(t => ({
        label: `${t.name} (${t.code})`,
        value: t.id,
        workshop_id: t.workshop_id
    }))
)

const teamOptionsFiltered = computed(() =>
    local.workshop_id ? teamOptions.value.filter(t => t.workshop_id === local.workshop_id) : teamOptions.value
)

function onWorkshopChange(newWid) {
    const currTeam = teamOptions.value.find(t => t.value === local.team_id)
    if (currTeam && currTeam.workshop_id !== newWid) local.team_id = null
}

function onTeamChange(newTid) {
    const t = teamOptions.value.find(x => x.value === newTid)
    if (t && t.workshop_id) local.workshop_id = t.workshop_id
}

function onDateChange() {
    // dùng v-model + value-format => không cần xử lý thêm
}

function filterOption(input, option) {
    return String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}
</script>

<style scoped>
.ml-8 {
    margin-left: 8px;
}
</style>