<template>
    <div class="stack">
        <HeSoChuanFilter v-model="filters" @search="applyFilters" />

        <div class="actions">
            <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm hệ số chuẩn</a-button>
        </div>

        <HeSoChuanTable :data-source="pagedData" :pagination="pagination" @change="onTableChange" @edit="openEdit"
            @delete="onDelete" :can-edit="canEdit" :can-delete="canDelete" />

        <HeSoChuanModal v-model:visible="modalOpen" :initial="editing" @submit="onSubmit"
            @cancel="() => (modalOpen = false)" />
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import HeSoChuanFilter from './components/HeSoChuanFilter.vue'
import HeSoChuanTable from './components/HeSoChuanTable.vue'
import HeSoChuanModal from './components/HeSoChuanModal.vue'
import { standardCoefficientApi } from '@/services/production_service/standardCoefficientService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('HSC-ADD'))
const canEdit = computed(() => can('HSC-EDIT'))
const canDelete = computed(() => can('HSC-DELETE'))

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
        const list = await standardCoefficientApi.listAll()
        // sắp xếp theo item_code (vi + numeric)
        list.sort((a, b) => String(a.item_code).localeCompare(String(b.item_code), 'vi', { numeric: true }))
        allRows.value = list
        pagination.total = list.length
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không tải được hệ số chuẩn')
    }
}

const filtered = computed(() => {
    const k = (filters.value.keyword || '').trim().toLowerCase()
    if (!k) return allRows.value
    return allRows.value.filter(r =>
        String(r.item_code || '').toLowerCase().includes(k) ||
        String(r.coefficient ?? '').toLowerCase().includes(k)
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
    editing.value = { id: r.id, item_code: r.item_code, coefficient: r.coefficient }
    modalOpen.value = true
}

async function onSubmit(payload) {
    try {
        const body = {
            item_code: (payload.item_code || '').trim(),
            coefficient: Number(payload.coefficient),
        }
        if (!body.item_code || isNaN(body.coefficient)) {
            message.error('Vui lòng nhập mã hàng và hệ số hợp lệ')
            return
        }

        if (editing.value?.id) {
            await standardCoefficientApi.update(editing.value.id, body)
            message.success('Cập nhật hệ số chuẩn thành công')
        } else {
            await standardCoefficientApi.create(body)
            message.success('Thêm hệ số chuẩn thành công')
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
            e?.message || 'Lỗi khi lưu hệ số chuẩn'
        message.error(msg)
    }
}

async function onDelete(id) {
    try {
        await standardCoefficientApi.remove(id)
        message.success('Xoá hệ số chuẩn thành công')

        const before = pagedData.value.length
        await fetchAll()
        const after = pagedData.value.length
        if (before === 1 && pagination.current > 1 && after === 0) pagination.current -= 1
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không xoá được hệ số chuẩn')
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
