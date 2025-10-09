<template>
    <div class="stack">
        <XuongFilter v-model="filters" @search="applyFilters" />

        <div class="actions">
            <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm xưởng</a-button>
        </div>

        <XuongTable :data-source="pagedData" :pagination="pagination" :can-edit="canEdit" :can-delete="canDelete"
            @change="onTableChange" @edit="openEdit" @delete="onDelete" />
        <XuongModal v-model:visible="modalOpen" :initial="editing" @submit="onSubmit"
            @cancel="() => (modalOpen = false)" />
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import XuongFilter from './components/XuongFilter.vue'
import XuongTable from './components/XuongTable.vue'
import XuongModal from './components/XuongModal.vue'
import { workshopApi } from '@/services/production_service/workshopService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('XUONG-ADD'))
const canEdit = computed(() => can('XUONG-EDIT'))
const canDelete = computed(() => can('XUONG-DELETE'))


const allRows = ref([])
const filters = ref({ keyword: '' })

const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
})

async function fetchAll() {
    try {
        const list = await workshopApi.listAll()
        list.sort((a, b) => String(a.code).localeCompare(String(b.code), 'vi', { numeric: true }))
        allRows.value = list
        pagination.total = list.length
    } catch (e) {
        console.error(e)
        const msg = e?.response?.data?.message || e?.message || 'Không tải được danh sách xưởng'
        message.error(msg)
    }
}

const filtered = computed(() => {
    const k = (filters.value.keyword || '').trim().toLowerCase()
    if (!k) return allRows.value
    return allRows.value.filter(r =>
        String(r.name || '').toLowerCase().includes(k) ||
        String(r.code || '').toLowerCase().includes(k)
    )
})

const pagedData = computed(() => {
    pagination.total = filtered.value.length
    const start = (pagination.current - 1) * pagination.pageSize
    return filtered.value.slice(start, start + pagination.pageSize)
})

function applyFilters() {
    pagination.current = 1
}

function onTableChange(pag) {
    pagination.current = Number(pag.current || 1)
    pagination.pageSize = Number(pag.pageSize || pagination.pageSize)
}

// Modal
const modalOpen = ref(false)   // 👈 đồng nhất với template
const editing = ref(null)

function openCreate() {
    editing.value = null
    modalOpen.value = true
}
function openEdit(rec) {
    editing.value = { id: rec.id, name: rec.name, code: rec.code }
    modalOpen.value = true
}

async function onSubmit(payload) {
    try {
        if (editing.value?.id) {
            await workshopApi.update(editing.value.id, payload)
            message.success('Cập nhật xưởng thành công')
        } else {
            await workshopApi.create(payload)
            message.success('Thêm xưởng thành công')
        }
        modalOpen.value = false

        await fetchAll()
        const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
        if (pagination.current > maxPage) pagination.current = maxPage
    } catch (e) {
        console.error(e)
        const msg =
            e?.response?.data?.message ||
            (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(', ')) ||
            e?.message || 'Lỗi khi lưu xưởng'
        message.error(msg)
    }
}

async function onDelete(id) {
    try {
        console.log(id)
        await workshopApi.remove(id)
        message.success('Xoá xưởng thành công')
        const before = pagedData.value.length
        await fetchAll()
        const after = pagedData.value.length
        if (before === 1 && pagination.current > 1 && after === 0) {
            pagination.current -= 1
        }
    } catch (e) {
        console.error(e)
        const msg = e?.response?.data?.message || e?.message || 'Không xoá được xưởng'
        message.error(msg)
    }
}


onMounted(fetchAll)
</script>

<style scoped>
.stack {
    display: grid;
    gap: 12px;
}

.actions {
    display: flex;
    justify-content: flex-end;
}
</style>
