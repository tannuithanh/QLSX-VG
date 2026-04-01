<template>
    <a-card size="small" :class="['filter-card', { 'is-mobile': isMobile }]">
        <template #title v-if="isMobile">
            <div class="mobile-filter-header" @click="collapsed = !collapsed">
                <span><FilterOutlined /> Bộ lọc dữ liệu</span>
                <component :is="collapsed ? DownOutlined : UpOutlined" />
            </div>
        </template>
        <a-form v-show="!isMobile || !collapsed" layout="vertical" @submit.prevent>
            <a-row :gutter="[16, 16]">
                <a-col :xs="24" :sm="12" :md="8" :lg="6">
                    <a-form-item label="Ngày" style="margin-bottom: 0">
                        <a-range-picker v-model:value="local.dateRange" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                            :allow-clear="true" style="width: 100%" @change="onDateChange" />
                    </a-form-item>
                </a-col>

                <a-col :xs="24" :sm="12" :md="8" :lg="6">
                    <a-form-item label="Xưởng" style="margin-bottom: 0">
                        <a-select v-model:value="local.workshop_id" :options="workshopOptions" allow-clear
                            placeholder="Chọn xưởng" style="width: 100%" show-search :filter-option="filterOption"
                            @change="onWorkshopChange" />
                    </a-form-item>
                </a-col>

                <a-col :xs="24" :sm="12" :md="8" :lg="6">
                    <a-form-item label="Tổ" style="margin-bottom: 0">
                        <a-select v-model:value="local.team_id" :options="teamOptionsFiltered" allow-clear
                            placeholder="Chọn tổ" style="width: 100%" show-search :filter-option="filterOption"
                            @change="onTeamChange" />
                    </a-form-item>
                </a-col>

                <a-col :xs="12" :sm="12" :md="8" :lg="6">
                    <a-form-item label="Đơn hàng" style="margin-bottom: 0">
                        <a-input v-model:value="local.order_no" placeholder="VD: ABC" allow-clear style="width: 100%" />
                    </a-form-item>
                </a-col>

                <a-col :xs="12" :sm="12" :md="8" :lg="6">
                    <a-form-item label="Mã hàng" style="margin-bottom: 0">
                        <a-input v-model:value="local.item_code" placeholder="VD: 66-00100-S1" allow-clear
                            style="width: 100%" />
                    </a-form-item>
                </a-col>

                <a-col :xs="24" :sm="12" :md="8" :lg="6">
                    <a-form-item label="Người tạo" style="margin-bottom: 0">
                        <a-input v-model:value="local.created_by_name" placeholder="Nhập người tạo" allow-clear
                            style="width: 100%" />
                    </a-form-item>
                </a-col>
            </a-row>
        </a-form>
    </a-card>
</template>

<script setup>
import { computed, reactive, watch, ref, onMounted, onUnmounted } from 'vue'
import { FilterOutlined, DownOutlined, UpOutlined } from '@ant-design/icons-vue'

const props = defineProps({
    modelValue: { type: Object, default: () => ({}) },
    workshops: { type: Array, default: () => [] },
    teams: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'search'])

const isMobile = ref(false)
const collapsed = ref(true)
const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
})

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
.filter-card {
    margin-bottom: 12px;
}

.mobile-filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 4px 0;
    color: #c06252;
    font-weight: 600;
}

.is-mobile :deep(.ant-card-head) {
    border-bottom: none;
    min-height: auto;
    padding: 0 12px;
}

.is-mobile :deep(.ant-card-body) {
    padding: 12px;
}

.ml-8 {
    margin-left: 8px;
}
</style>