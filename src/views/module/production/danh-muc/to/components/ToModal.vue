<template>
    <a-modal v-model:visible="innerVisible" :title="isEdit ? 'Cập nhật tổ' : 'Thêm tổ'" @ok="submit"
        @cancel="$emit('cancel')" ok-text="Lưu" cancel-text="Huỷ" destroyOnClose>
        <a-form :model="form" layout="vertical">
            <a-form-item label="Tên tổ" required>
                <a-input v-model:value="form.name" />
            </a-form-item>
            <a-form-item label="Mã tổ" required>
                <a-input v-model:value="form.code" />
            </a-form-item>
            <a-form-item label="Thuộc xưởng" required>
                <a-select v-model:value="form.workshop_id" :options="workshopOptions" placeholder="Chọn xưởng"
                    :loading="loadingWorkshops" show-search option-filter-prop="label" />
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup>
import { computed, reactive, watch, ref, onMounted } from 'vue'
import { workshopApi } from '@/services/production_service/workshopService'

const props = defineProps({
    visible: { type: Boolean, default: false },
    initial: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const innerVisible = computed({
    get: () => props.visible,
    set: v => emit('update:visible', v),
})

const form = reactive({ name: '', code: '', workshop_id: null })
const isEdit = computed(() => !!(props.initial && props.initial.id))

watch(() => props.initial, (v) => {
    form.name = v?.name || ''
    form.code = v?.code || ''
    form.workshop_id = v?.workshop_id ?? null
}, { immediate: true })

const workshopOptions = ref([])
const loadingWorkshops = ref(false)
async function loadWorkshops() {
    loadingWorkshops.value = true
    try {
        const rows = await workshopApi.listAll()
        workshopOptions.value = workshopApi.toOptions(rows)
    } finally {
        loadingWorkshops.value = false
    }
}
onMounted(loadWorkshops)

function submit() {
    if (!form.name || !form.code || !form.workshop_id) return
    emit('submit', { name: form.name.trim(), code: form.code.trim(), workshop_id: form.workshop_id })
}
</script>
