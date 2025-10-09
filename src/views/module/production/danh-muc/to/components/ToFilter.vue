<template>
    <a-form layout="inline" @submit.prevent>
        <a-form-item label="Từ khoá">
            <a-input v-model:value="local.keyword" placeholder="Tìm tên/mã tổ..." allow-clear style="min-width:220px" />
        </a-form-item>
        <a-form-item label="Thuộc xưởng">
            <a-select v-model:value="local.workshop_id" :options="workshopOptions" allow-clear placeholder="Chọn xưởng"
                style="min-width:220px" :loading="loading" show-search option-filter-prop="label" />
        </a-form-item>
    </a-form>
</template>

<script setup>
import { reactive, watch, ref, onMounted } from 'vue'
import { workshopApi } from '@/services/production_service/workshopService'

const props = defineProps({ modelValue: Object })
const emit = defineEmits(['update:modelValue', 'search'])

const local = reactive({ keyword: '', workshop_id: null })
watch(() => props.modelValue, v => Object.assign(local, v || {}), { immediate: true, deep: true })
watch(local, v => emit('update:modelValue', { ...v }), { deep: true })

const workshopOptions = ref([])
const loading = ref(false)
onMounted(async () => {
    loading.value = true
    try {
        const rows = await workshopApi.listAll()
        workshopOptions.value = workshopApi.toOptions(rows)
    } finally {
        loading.value = false
    }
})

function reset() { Object.assign(local, { keyword: '', workshop_id: null }); emit('search') }
</script>

<style scoped>
.ml-8 {
    margin-left: 8px;
}
</style>
