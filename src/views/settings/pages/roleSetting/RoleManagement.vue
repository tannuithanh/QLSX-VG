<template>
    <div class="page">
        <RoleToolbar v-model:search="search" :loading="loading" @reload="reload" @create="openModal()" />

        <RoleTable :rows="filteredRows" :loading="loading" :pagination="pagination" @change="onTableChange"
            @edit="openModal" @delete="onDelete" />

        <RoleFormModal v-model:visible="open" :mode="isEdit ? 'edit' : 'create'" :initial="isEdit ? editingRow : null"
            @cancel="onClose" @submit="onSave" />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, notification } from 'ant-design-vue'

import RoleToolbar from '@/views/settings/pages/roleSetting/components/RoleToolbar.vue'
import RoleTable from '@/views/settings/pages/roleSetting/components/RoleTable.vue'
import RoleFormModal from '@/views/settings/pages/roleSetting/components/RoleFormModal.vue'

import { roleApi } from '@/services/user_service/roleService'

const loading = ref(false)
const open = ref(false)
const isEdit = ref(false)
const editingRow = ref(null)

const search = ref('')
const pagination = reactive({ current: 1, pageSize: 10, showSizeChanger: false })
function onTableChange(pag) { if (pag?.current) pagination.current = pag.current }

const dataSource = ref([])

function toRow(r) {
    return { id: r.id, name: r.name, code: r.code }
}

async function loadRoles() {
    loading.value = true
    try {
        const { data } = await roleApi.list()
        dataSource.value = Array.isArray(data) ? data.map(toRow) : []
    } catch (e) {
        message.error(e?.response?.data?.message || 'Không tải được danh sách chức năng')
    } finally {
        loading.value = false
    }
}

const filteredRows = computed(() => {
    const q = (search.value || '').trim().toLowerCase()
    if (!q) return dataSource.value
    return dataSource.value.filter(r =>
        r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q)
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
            await roleApi.update(editingRow.value.id, payload)
            await loadRoles()
            notification.success({ message: 'Đã cập nhật vai trò' })
        } else {
            const { data } = await roleApi.create(payload)
            // API trả { role: {...} } theo backend của bạn
            dataSource.value.unshift(toRow(data?.role || data))
            notification.success({ message: 'Đã tạo vai trò' })
        }
        onClose()
    } catch (e) {
        const msg = e?.response?.data?.message
        const errs = e?.response?.data?.errors
        message.error(msg || 'Lưu không thành công')
        if (errs) console.warn('Validation errors:', errs)
    }
}

async function onDelete(id) {
    try {
        await roleApi.remove(id)
        dataSource.value = dataSource.value.filter(r => r.id !== id)
        message.success('Đã xoá')
    } catch (e) {
        message.error(e?.response?.data?.message || 'Xoá không thành công')
    }
}

onMounted(loadRoles)
</script>

<style scoped>
.page {
    min-width: 0
}
</style>
