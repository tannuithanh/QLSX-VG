<template>
    <div class="page">
        <DepartmentToolbar v-model:search="search" :loading="loading" @reload="reload" @create="openModal()" />

        <DepartmentTable :rows="filteredRows" :loading="loading" :pagination="pagination" @change="onTableChange"
            @edit="openModal" @delete="onDelete" />

        <DepartmentFormModal v-model:visible="open" :mode="isEdit ? 'edit' : 'create'"
            :initial="isEdit ? editingRow : null" @cancel="onClose" @submit="onSave" />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, notification } from 'ant-design-vue'
import DepartmentToolbar from '@/views/settings/pages/departmentSetting/components/DepartmentToolbar.vue'
import DepartmentTable from '@/views/settings/pages/departmentSetting/components/DepartmentTable.vue'
import DepartmentFormModal from '@/views/settings/pages/departmentSetting/components/DepartmentFormModal.vue'
import { departmentApi } from '@/services/user_service/departmentService'

const loading = ref(false)
const open = ref(false)
const isEdit = ref(false)
const editingRow = ref(null)

const search = ref('')
const pagination = reactive({ current: 1, pageSize: 10, showSizeChanger: false })
function onTableChange(pag) {
    if (pag?.current) pagination.current = pag.current
}

const dataSource = ref([])

function toRow(d) {
    return {
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description || '',
    }
}

async function loadDepartments() {
    loading.value = true
    try {
        const { data } = await departmentApi.list()
        dataSource.value = Array.isArray(data) ? data.map(toRow) : []
    } catch (e) {
        message.error(e?.response?.data?.message || 'Không tải được danh sách phòng ban')
    } finally {
        loading.value = false
    }
}

const filteredRows = computed(() => {
    const q = (search.value || '').trim().toLowerCase()
    if (!q) return dataSource.value
    return dataSource.value.filter(
        r =>
            r.name?.toLowerCase().includes(q) ||
            r.code?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)
    )
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
            await departmentApi.update(editingRow.value.id, payload)
            // load lại 1 record (nhẹ nhàng: gọi list lại cho đơn giản)
            await loadDepartments()
            notification.success({ message: 'Đã cập nhật phòng ban' })
        } else {
            const { data } = await departmentApi.create(payload)
            // đẩy vào đầu (hoặc gọi lại list)
            dataSource.value.unshift(toRow(data?.department || data))
            notification.success({ message: 'Đã tạo phòng ban' })
        }
        onClose()
    } catch (e) {
        message.error(e?.response?.data?.message || 'Lưu không thành công')
        console.warn(e?.response?.data?.errors)
    }
}

async function onDelete(id) {
    try {
        await departmentApi.remove(id)
        dataSource.value = dataSource.value.filter(r => r.id !== id)
        message.success('Đã xoá')
    } catch (e) {
        message.error(e?.response?.data?.message || 'Xoá không thành công')
    }
}

async function reload() {
    await loadDepartments()
}

onMounted(loadDepartments)
</script>

<style scoped>
.page {
    min-width: 0
}
</style>
