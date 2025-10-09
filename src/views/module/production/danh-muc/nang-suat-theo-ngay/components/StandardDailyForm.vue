<template>
    <div class="flex gap-2 wrap">
        <a-select class="w-64" v-model:value="teamId" :options="teamOptions" show-search allow-clear
            :filter-option="filterOption" placeholder="Chọn tổ" :disabled="loading || saving" />
        <a-input-number class="w-48" v-model:value="stdQty" :precision="4" :step="0.0001" placeholder="Số lượng chuẩn"
            :disabled="loading || saving" />
        <a-button type="primary" :loading="saving" :disabled="!teamId" @click="save">Lưu</a-button>
        <a-button :disabled="saving" @click="reset">Reset</a-button>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { standardDailyProductivityApi } from '@/services/production_service/standardDailyProductivityService'

const props = defineProps({
    teams: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
})
const emits = defineEmits(['saved'])

const teamId = ref(null)
const stdQty = ref(null)
const saving = ref(false)

const teamOptions = computed(() =>
    (props.teams || []).map(t => ({ label: `${t.name} (${t.code})`, value: t.id }))
)

function filterOption(input, option) {
    return String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function reset() {
    teamId.value = null
    stdQty.value = null
}

async function save() {
    if (!teamId.value) {
        message.warning('Vui lòng chọn tổ.')
        return
    }
    try {
        saving.value = true
        await standardDailyProductivityApi.upsert({
            team_id: teamId.value,
            std_qty: stdQty.value,
        })
        message.success('Đã lưu.')
        emits('saved')
        reset()
    } catch (e) {
        console.error(e)
        message.error('Lưu thất bại.')
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.flex {
    display: flex;
    align-items: center;
}

.gap-2 {
    gap: 8px;
}

.wrap {
    flex-wrap: wrap;
}

.w-64 {
    width: 260px;
}

.w-48 {
    width: 200px;
}
</style>
