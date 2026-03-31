<template>
    <a-form layout="inline" @submit.prevent>
        <a-form-item label="Đơn hàng">
            <a-input v-model:value="model.order_no" allowClear style="width:220px" placeholder="Nhập đơn hàng" />
        </a-form-item>

        <a-form-item label="Mã hàng">
            <a-input v-model:value="model.item_code" allowClear style="width:200px" placeholder="Nhập mã hàng" />
        </a-form-item>

        <a-form-item label="Xưởng">
            <a-select v-model:value="selectedWorkshopId" allowClear style="width:220px" placeholder="Chọn xưởng"
                :loading="loadingLookups" show-search :filter-option="selectFilter">
                <a-select-option v-for="w in workshops" :key="w.id" :value="w.id">
                    {{ w.name }} ({{ w.code }})
                </a-select-option>
            </a-select>
        </a-form-item>

        <a-form-item label="Tổ/nhóm">
            <a-select v-model:value="selectedTeamId" allowClear style="width:220px" placeholder="Chọn tổ/nhóm"
                :disabled="!model.workshop_id" :loading="loadingLookups" show-search :filter-option="selectFilter">
                <a-select-option v-for="t in teamsByWorkshop" :key="t.id" :value="t.id">
                    {{ t.name }} ({{ t.code }})
                </a-select-option>
            </a-select>
        </a-form-item>

        <a-form-item label="Từ ngày">
            <a-date-picker v-model:value="fromObj" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                placeholder="Chọn từ ngày" style="width:150px" />
        </a-form-item>

        <a-form-item label="Đến ngày">
            <a-date-picker v-model:value="toObj" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                placeholder="Chọn đến ngày" style="width:150px" />
        </a-form-item>

        <a-form-item>
            <a-space>
                <a-button type="primary" @click="$emit('search')">Lọc</a-button>
                <a-button @click="reset">Xoá lọc</a-button>
            </a-space>
        </a-form-item>
    </a-form>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { workshopApi } from '@/services/production_service/workshopService'
import { teamApi } from '@/services/production_service/teamService'

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({
            order_no: '',
            item_code: '',
            workshop_id: null,
            team_id: null,
            date_from: null,
            date_to: null,
        })
    }
})
const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const model = computed({
    get: () => props.modelValue,
    set: v => emit('update:modelValue', v)
})

const workshops = ref([])
const teams = ref([])
const loadingLookups = ref(false)

async function loadLookups() {
    loadingLookups.value = true
    try {
        const [ws, ts] = await Promise.all([
            workshopApi.listAll(),
            teamApi.listAll(),
        ])
        workshops.value = Array.isArray(ws) ? ws : []
        teams.value = Array.isArray(ts) ? ts : []
    } finally {
        loadingLookups.value = false
    }
}

const selectFilter = (input, option) =>
    (option?.children ?? option?.label ?? '')
        .toString()
        .toLowerCase()
        .includes((input ?? '').toLowerCase())

const teamsByWorkshop = computed(() => {
    if (!model.value.workshop_id) return []
    return teams.value.filter(t => Number(t.workshop_id) === Number(model.value.workshop_id))
})

const selectedWorkshopId = computed({
    get: () => model.value.workshop_id ?? null,
    set: v => {
        const nextWorkshopId = v ?? null
        const currentTeamId = model.value.team_id ?? null

        let nextTeamId = currentTeamId
        if (nextTeamId) {
            const found = teams.value.find(t => Number(t.id) === Number(nextTeamId))
            if (!found || Number(found.workshop_id) !== Number(nextWorkshopId)) {
                nextTeamId = null
            }
        }

        model.value = {
            ...model.value,
            workshop_id: nextWorkshopId,
            team_id: nextTeamId,
        }
    }
})

const selectedTeamId = computed({
    get: () => model.value.team_id ?? null,
    set: v => {
        model.value = { ...model.value, team_id: v ?? null }
    }
})

const fromObj = computed({
    get: () => model.value.date_from || null,
    set: v => { model.value = { ...model.value, date_from: v || null } }
})

const toObj = computed({
    get: () => model.value.date_to || null,
    set: v => { model.value = { ...model.value, date_to: v || null } }
})

function reset() {
    model.value = {
        order_no: '',
        item_code: '',
        workshop_id: null,
        team_id: null,
        date_from: null,
        date_to: null,
    }
    emit('reset')
}

onMounted(loadLookups)
</script>