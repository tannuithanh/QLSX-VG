<template>
    <a-modal :visible="visible" :title="isEdit ? 'Cập nhật năng suất chuẩn' : 'Thêm năng suất chuẩn'"
        :confirmLoading="saving" @ok="submit" @cancel="$emit('update:visible', false)" okText="Lưu" cancelText="Hủy"
        destroyOnClose>
        <div class="grid">
            <div>
                <div class="lbl">Tổ</div>
                <a-select class="w-100" v-model:value="form.team_id" :options="teamOptions" show-search allow-clear
                    :filter-option="filterOption" placeholder="Chọn tổ" :disabled="isEdit" />
            </div>
            <div>
                <div class="lbl">Số lượng chuẩn</div>
                <a-input-number v-model:value="form.std_qty" :precision="4" :step="0.0001" class="w-100"
                    placeholder="Nhập số lượng chuẩn" />
            </div>
        </div>
    </a-modal>
</template>

<script setup>
import { computed, reactive, watch, ref } from 'vue'
import { message } from 'ant-design-vue'
import { standardDailyProductivityApi } from '@/services/production_service/standardDailyProductivityService'

const props = defineProps({
    visible: { type: Boolean, default: false },
    teams: { type: Array, default: () => [] },
    initial: { type: Object, default: null },
    usedTeamIds: { type: Array, default: () => [] },   // NEW
})
const emits = defineEmits(['update:visible', 'saved'])
const saving = ref(false)

const isEdit = computed(() => !!props.initial)

// Option sẽ disabled nếu team_id nằm trong usedTeamIds (khi tạo mới)
const teamOptions = computed(() => {
    const used = new Set(props.usedTeamIds || [])
    const currentId = props.initial?.team_id ?? null
    return (props.teams || []).map(t => ({
        label: `${t.name} (${t.code})`,
        value: t.id,
        // Chỉ disable nếu: đang TẠO MỚI (không phải edit) và id đã có dữ liệu
        disabled: !isEdit.value && used.has(t.id),
    }))
})

function filterOption(input, option) {
    return String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

const form = reactive({ team_id: null, std_qty: null })

watch(
    () => props.initial,
    (val) => {
        form.team_id = val?.team_id ?? null
        form.std_qty = val?.std_qty ?? null
    },
    { immediate: true }
)

async function submit() {
    if (!form.team_id) {
        message.warning('Vui lòng chọn tổ.')
        return
    }
    try {
        saving.value = true
        await standardDailyProductivityApi.upsert({
            team_id: form.team_id,
            std_qty: form.std_qty,
        })
        message.success('Đã lưu.')
        emits('saved')
        emits('update:visible', false)
    } catch (e) {
        console.error(e)
        message.error('Lưu thất bại.')
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
}

.lbl {
    margin-bottom: 6px;
    font-weight: 600;
}

.w-100 {
    width: 100%;
}
</style>
