<template>
    <a-modal
        v-model:visible="innerVisible"
        :title="isEdit ? 'Cập nhật năng suất' : 'Thêm năng suất'"
        ok-text="Lưu"
        cancel-text="Huỷ"
        destroy-on-close
        @ok="submit"
        @cancel="$emit('cancel')"
        :width="isMobile ? '100%' : 720"
        :style="isMobile ? { top: '0', maxWidth: '100vw', padding: '0' } : { maxWidth: '95vw' }"
        :body-style="isMobile ? { height: 'calc(100vh - 108px)', overflowY: 'auto' } : {}"
    >
        <a-form :model="form" layout="vertical">
            <div class="grid grid-2">
                <a-form-item label="Ngày sản xuất" required>
                    <a-date-picker
                        v-model:value="form.production_date"
                        value-format="YYYY-MM-DD"
                        format="DD/MM/YYYY"
                        style="width:100%"
                        placeholder="Chọn ngày"
                        :disabled-date="disabledFutureDate"
                    />
                </a-form-item>

                <a-form-item label="Xưởng" required>
                    <a-select
                        v-model:value="form.workshop_id"
                        :options="workshopOptions"
                        placeholder="Chọn xưởng"
                        style="width:100%"
                        show-search
                        :filter-option="filterOption"
                        @change="onWorkshopChange"
                    />
                </a-form-item>

                <a-form-item label="Tổ" required>
                    <a-select
                        v-model:value="form.team_id"
                        :options="teamOptionsFiltered"
                        placeholder="Chọn tổ"
                        style="width:100%"
                        show-search
                        :filter-option="filterOption"
                        @change="onTeamChange"
                    />
                </a-form-item>

                <a-form-item label="Đơn hàng" required>
                    <a-input v-model:value="form.order_no" placeholder="VD: ABC" allow-clear />
                </a-form-item>

                <a-form-item label="Mã hàng" required>
                    <a-input v-model:value="form.item_code" placeholder="VD: 66-00100-S1" allow-clear />
                </a-form-item>

                <a-form-item label="SLSX thực tế" required>
                    <a-input-number v-model:value="form.qty_actual" :min="0" :step="1" style="width:100%" />
                </a-form-item>
            </div>
        </a-form>
    </a-modal>
</template>

<script setup>
import { computed, reactive, watch, ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'

const props = defineProps({
    visible: { type: Boolean, default: false },
    initial: { type: Object, default: null },
    workshops: { type: Array, default: () => [] },
    teams: { type: Array, default: () => [] },
    createdByName: { type: String, default: '' },
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const isMobile = ref(false)
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

const innerVisible = computed({
    get: () => props.visible,
    set: v => emit('update:visible', v),
})

const todayYmd = () => dayjs().format('YYYY-MM-DD')

const form = reactive({
    production_date: todayYmd(),
    workshop_id: null,
    team_id: null,
    order_no: '',
    item_code: '',
    qty_actual: 0,
    created_by_name: '',
})

const isEdit = computed(() => !!props.initial?.id)

const workshopOptions = computed(() =>
    (props.workshops || []).map(w => ({ label: `${w.name} (${w.code})`, value: w.id }))
)

const teamOptions = computed(() =>
    (props.teams || []).map(t => ({ label: `${t.name} (${t.code})`, value: t.id, workshop_id: t.workshop_id }))
)

const teamOptionsFiltered = computed(() =>
    form.workshop_id ? teamOptions.value.filter(t => t.workshop_id === form.workshop_id) : teamOptions.value
)

function filterOption(input, option) {
    return String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function onWorkshopChange(wid) {
    const team = teamOptions.value.find(t => t.value === form.team_id)
    if (team && team.workshop_id !== wid) form.team_id = null
}

function onTeamChange(tid) {
    const team = teamOptions.value.find(t => t.value === tid)
    if (team && team.workshop_id) form.workshop_id = team.workshop_id
}

function disabledFutureDate(current) {
    return current && current.endOf('day').isAfter(dayjs().endOf('day'))
}

watch(() => props.initial, (v) => {
    if (!v) {
        reset()
        return
    }

    form.production_date = v.production_date || todayYmd()
    form.workshop_id = v.workshop_id ?? null
    form.team_id = v.team_id ?? null
    form.order_no = v.order_no || ''
    form.item_code = v.item_code || ''
    form.qty_actual = Number(v.qty_actual ?? 0)
    form.created_by_name = v.created_by_name || props.createdByName || ''
}, { immediate: true })

function reset() {
    form.production_date = todayYmd()
    form.workshop_id = null
    form.team_id = null
    form.order_no = ''
    form.item_code = ''
    form.qty_actual = 0
    form.created_by_name = props.createdByName || ''
}

function submit() {
    if (!form.production_date || !form.workshop_id || !form.team_id) {
        message.error('Vui lòng chọn ngày, xưởng và tổ')
        return
    }

    if (form.production_date > todayYmd()) {
        message.error('Ngày sản xuất không được lớn hơn ngày hiện tại')
        return
    }

    if (!form.order_no.trim()) {
        message.error('Vui lòng nhập Đơn hàng')
        return
    }

    if (!form.item_code.trim()) {
        message.error('Vui lòng nhập Mã hàng')
        return
    }

    emit('submit', {
        production_date: form.production_date,
        workshop_id: Number(form.workshop_id),
        team_id: Number(form.team_id),
        order_no: form.order_no.trim(),
        item_code: form.item_code.trim(),
        qty_actual: Number(form.qty_actual || 0),
        created_by_name: form.created_by_name || props.createdByName || 'System',
    })
}
</script>

<style scoped>
.grid {
    display: grid;
    gap: 12px;
}

.grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 720px) {
    .grid-2 {
        grid-template-columns: 1fr;
    }
}
</style>