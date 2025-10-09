<template>
    <div class="page">
        <PositionToolbar v-model:search="search" :loading="loading" @reload="reload" @create="openModal()" />

        <PositionTable :rows="filteredRows" :loading="loading" :pagination="pagination" @change="onTableChange"
            @edit="openModal" @delete="onDelete" />

        <PositionFormModal v-model:visible="open" :mode="isEdit ? 'edit' : 'create'" :initial="isEdit ? editingRow : null"
            @cancel="onClose" @submit="onSave" />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, notification } from 'ant-design-vue'
import PositionToolbar from '@/views/settings/pages/positionSetting/components/PositionToolbar.vue'
import PositionTable from '@/views/settings/pages/positionSetting/components/PositionTable.vue'
import PositionFormModal from '@/views/settings/pages/positionSetting/components/PositionFormModal.vue'
import { positionApi } from '@/services/user_service/positionService'

const loading = ref(false)
const open = ref(false)
const isEdit = ref(false)
const editingRow = ref(null)

const search = ref('')
const pagination = reactive({ current: 1, pageSize: 10, showSizeChanger: false })
function onTableChange(pag) { if (pag?.current) pagination.current = pag.current }

const dataSource = ref([])

function toRow(p) {
    return { id: p.id, name: p.name }
}

async function loadPositions() {
    loading.value = true
    try {
        const { data } = await positionApi.list()
        dataSource.value = Array.isArray(data) ? data.map(toRow) : []
    } catch (e) {
        message.error(e?.response?.data?.message || 'Không tải được danh sách chức vụ')
    } finally {
        loading.value = false
    }
}

const filteredRows = computed(() => {
    const q = (search.value || '').trim().toLowerCase()
    if (!q) return dataSource.value
    return dataSource.value.filter(r => r.name?.toLowerCase().includes(q))
})

function openModal(record) {
    if (record) {
        isEdit.value = true
        editingRow.value = { ...record }
    } else {
        isEdit.value = false
        editingRow.value = null
    }
    open.value = true
}
function onClose() { open.value = false }

async function onSave(payload) {
    try {
        if (isEdit.value && editingRow.value?.id) {
            await positionApi.update(editingRow.value.id, payload)
            await loadPositions()
            notification.success({ message: 'Đã cập nhật chức vụ' })
        } else {
            const { data } = await positionApi.create(payload)
            dataSource.value.unshift(toRow(data?.position || data))
            notification.success({ message: 'Đã tạo chức vụ' })
        }
        onClose()
    } catch (e) {
        message.error(e?.response?.data?.message || 'Lưu không thành công')
        console.warn(e?.response?.data?.errors)
    }
}

async function onDelete(id) {
    try {
        await positionApi.remove(id)
        dataSource.value = dataSource.value.filter(r => r.id !== id)
        message.success('Đã xoá')
    } catch (e) {
        message.error(e?.response?.data?.message || 'Xoá không thành công')
    }
}

async function reload() { await loadPositions() }
onMounted(loadPositions)
</script>

<style scoped>
.page {
    min-width: 0
}
</style>
