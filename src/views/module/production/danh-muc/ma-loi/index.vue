<template>
    <div class="stack">
        <MaLoiFilter v-model="filters" @search="applyFilters" />

        <!-- Chỉ render actions khi đã có /me -->
        <div class="actions" v-if="ready">
            <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm mã lỗi</a-button>
        </div>

        <!-- Truyền quyền xuống table để ẩn/hiện nút Sửa/Xoá -->
        <MaLoiTable :data="pagedData" :pagination="pagination" :can-edit="canEdit" :can-delete="canDelete"
            @change="onTableChange" @edit="openEdit" @delete="onDelete" />

        <MaLoiModal v-model:visible="modalOpen" :initial="editing" @submit="onSubmit"
            @cancel="() => (modalOpen = false)" />
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { message } from 'ant-design-vue'
import MaLoiFilter from './components/MaLoiFilter.vue'
import MaLoiTable from './components/MaLoiTable.vue'
import MaLoiModal from './components/MaLoiModal.vue'
import { errorCodeApi } from '@/services/production_service/errorCodeService'

/* ---------- AUTH & PERMISSIONS ---------- */
const auth = useAuthStore()
const { user, meLoaded } = storeToRefs(auth)

// Chuẩn hoá code quyền: trim + upper-case để tránh lệch khoảng trắng/hoa-thường
const norm = (c) => String(c ?? '').trim().toUpperCase()

const isAdmin = computed(() => !!user.value?.is_admin)
console.log(isAdmin.value)
const moduleCodes = computed(
    () => new Set((user.value?.modules || []).map((m) => norm(m.code)))
)

const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd    = computed(() => can('ML-ADD'))
const canEdit   = computed(() => can('ML-EDIT'))    
const canDelete = computed(() => can('ML-DELETE'))  


// Chỉ render phần phụ thuộc quyền khi đã có /me
const ready = computed(() => meLoaded.value === true)

/* (tuỳ chọn) debug — bật khi cần soi quyền */
// const DEBUG = true
const DEBUG = false
watchEffect(() => {
    if (!DEBUG) return
    console.debug('[MaLoiIndex] perms', {
        isAdmin: isAdmin.value,
        codes: Array.from(moduleCodes.value),
        canAdd: canAdd.value,
        canEdit: canEdit.value,
        canDelete: canDelete.value,
        meLoaded: meLoaded.value
    })
})

/* ---------- STATE ---------- */
const allRows = ref([])

const filters = ref({ keyword: '' })

const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100']
})

/* ---------- DATA ---------- */
async function fetchAll() {
    try {
        const list = await errorCodeApi.listAll()
        list.sort((a, b) =>
            String(a.code).localeCompare(String(b.code), 'vi', { numeric: true })
        )
        allRows.value = list
        pagination.total = list.length
    } catch (e) {
        console.error(e)
        const msg =
            e?.response?.data?.message || e?.message || 'Không tải được danh sách mã lỗi'
        message.error(msg)
    }
}

const filtered = computed(() => {
    const k = (filters.value.keyword || '').trim().toLowerCase()
    if (!k) return allRows.value
    return allRows.value.filter(
        (r) =>
            String(r.code || '').toLowerCase().includes(k) ||
            String(r.name || '').toLowerCase().includes(k)
    )
})

const pagedData = computed(() => {
    pagination.total = filtered.value.length
    const start = (pagination.current - 1) * pagination.pageSize
    return filtered.value.slice(start, start + pagination.pageSize)
})

/* ---------- TABLE/SEARCH HANDLERS ---------- */
function applyFilters() {
    pagination.current = 1
}

function onTableChange(pag) {
    pagination.current = Number(pag.current || 1)
    pagination.pageSize = Number(pag.pageSize || pagination.pageSize)
}

/* ---------- MODAL & CRUD ---------- */
const modalOpen = ref(false)
const editing = ref(null)

function openCreate() {
    if (!canAdd.value) return message.warning('Bạn không có quyền thêm mã lỗi')
    editing.value = null
    modalOpen.value = true
}

function openEdit(rec) {
    if (!canEdit.value) return message.warning('Bạn không có quyền sửa mã lỗi')
    editing.value = { id: rec.id, code: rec.code, name: rec.name }
    modalOpen.value = true
}

async function onSubmit(payload) {
    try {
        if (editing.value?.id) {
            if (!canEdit.value) return message.warning('Bạn không có quyền sửa mã lỗi')
            await errorCodeApi.update(editing.value.id, payload)
            message.success('Cập nhật mã lỗi thành công')
        } else {
            if (!canAdd.value) return message.warning('Bạn không có quyền thêm mã lỗi')
            await errorCodeApi.create(payload)
            message.success('Thêm mã lỗi thành công')
        }

        modalOpen.value = false
        await fetchAll()

        const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
        if (pagination.current > maxPage) pagination.current = maxPage
    } catch (e) {
        console.error(e)
        const msg =
            e?.response?.data?.message ||
            (e?.response?.data?.errors &&
                Object.values(e.response.data.errors).flat().join(', ')) ||
            e?.message ||
            'Lỗi khi lưu mã lỗi'
        message.error(msg)
    }
}

async function onDelete(id) {
    if (!canDelete.value) return message.warning('Bạn không có quyền xoá mã lỗi')
    try {
        await errorCodeApi.remove(id)
        message.success('Xoá mã lỗi thành công')

        const beforeCount = pagedData.value.length
        await fetchAll()
        const afterCount = pagedData.value.length

        if (beforeCount === 1 && pagination.current > 1 && afterCount === 0) {
            pagination.current -= 1
        }
    } catch (e) {
        console.error(e)
        const msg = e?.response?.data?.message || e?.message || 'Không xoá được mã lỗi'
        message.error(msg)
    }
}

/* ---------- LIFECYCLE ---------- */
onMounted(async () => {
    // đảm bảo đã có thông tin /me trước khi render quyền
    if (auth.token && !meLoaded.value) {
        try {
            await auth.fetchMe()
        } catch (e) {
            console.error('fetchMe error', e)
        }
    }
    await fetchAll()
})
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