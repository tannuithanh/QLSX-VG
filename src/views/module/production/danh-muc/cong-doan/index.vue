<!-- src/views/congdoan/index.vue -->
<template>
    <div class="stack">
        <CongDoanFilter v-model="filters" @search="applyFilters" />
        <div class="actions"><a-button v-if="canAdd" type="primary" @click="openCreate">Thêm công đoạn</a-button></div>

        <CongDoanTable :data-source="pagedData" :pagination="pagination" @change="onTableChange" @edit="openEdit"
            @delete="onDelete" :can-edit="canEdit" :can-delete="canDelete" />

        <CongDoanModal v-model:visible="modalOpen" :initial="editing" @submit="onSubmit"
            @cancel="() => (modalOpen = false)" />
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import CongDoanFilter from './components/CongDoanFilter.vue'
import CongDoanTable from './components/CongDoanTable.vue'
import CongDoanModal from './components/CongDoanModal.vue'
import { stageApi } from '@/services/production_service/stageService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('CD-ADD'))
const canEdit = computed(() => can('CD-EDIT'))
const canDelete = computed(() => can('CD-DELETE'))


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
        const list = await stageApi.listAll()
        list.sort((a, b) => String(a.code).localeCompare(String(b.code), 'vi', { numeric: true }))
        allRows.value = list
        pagination.total = list.length
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không tải được danh sách công đoạn')
    }
}

const filtered = computed(() => {
    const k = (filters.value.keyword || '').trim().toLowerCase()
    if (!k) return allRows.value
    return allRows.value.filter(r =>
        [r.name, r.code].some(v => String(v || '').toLowerCase().includes(k))
    )
})

const pagedData = computed(() => {
    pagination.total = filtered.value.length
    const start = (pagination.current - 1) * pagination.pageSize
    return filtered.value.slice(start, start + pagination.pageSize)
})

function applyFilters() { pagination.current = 1 }
function onTableChange(p) {
    pagination.current = Number(p.current || 1)
    pagination.pageSize = Number(p.pageSize || pagination.pageSize)
}

const modalOpen = ref(false)
const editing = ref(null)

function openCreate() {
    editing.value = null
    modalOpen.value = true
}
function openEdit(r) {
    editing.value = { id: r.id, name: r.name, code: r.code }
    modalOpen.value = true
}

async function onSubmit(payload) {
    try {
        if (editing.value?.id) {
            await stageApi.update(editing.value.id, payload) // {name, code}
            message.success('Cập nhật công đoạn thành công')
        } else {
            await stageApi.create(payload)
            message.success('Thêm công đoạn thành công')
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
            e?.message || 'Lỗi khi lưu công đoạn'
        message.error(msg)
    }
}

async function onDelete(id) {
    try {
        await stageApi.remove(id)
        message.success('Xoá công đoạn thành công')

        const before = pagedData.value.length
        await fetchAll()
        const after = pagedData.value.length
        if (before === 1 && pagination.current > 1 && after === 0) {
            pagination.current -= 1
        }
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không xoá được công đoạn')
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
