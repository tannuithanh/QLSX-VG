<!-- pages/.../index.vue -->
<template>
    <div class="stack">
        <LayoutCoeffFilter v-model="filters" @search="applyFilters" />

        <div class="actions" v-if="canAdd">
            <a-button @click="openPreview" :loading="previewLoading">Tạo mã theo bộ S (xem trước)</a-button>
            <a-button :loading="calcCoeffLoading" @click="calcCoefficient">Tính Diện tích sản phẩm chuẩn</a-button>
            <a-button :loading="recalcLoading" @click="recalculate">Tính lại hệ số layout</a-button>
            <a-button type="primary" @click="openCreate" class="ml-8">Thêm hệ số layout</a-button>
        </div>

        <LayoutCoeffTable :data-source="pagedData" :pagination="pagination" @change="onTableChange" @edit="openEdit"
            @delete="onDelete" :can-edit="canEdit" :can-delete="canDelete" />

        <LayoutCoeffModal v-model:visible="modalOpen" :initial="editing" @submit="onSubmit"
            @cancel="() => (modalOpen = false)" />

        <GeneratePreviewModal v-model:visible="previewOpen" :data="previewData" :applying="applyLoading"
            @apply="applyPreview" @cancel="(() => (previewOpen = false))" />
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import LayoutCoeffFilter from './components/LayoutCoeffFilter.vue'
import LayoutCoeffTable from './components/LayoutCoeffTable.vue'
import LayoutCoeffModal from './components/LayoutCoeffModal.vue'
import GeneratePreviewModal from './components/GeneratePreviewModal.vue'
import { layoutCoefficientApi } from '@/services/production_service/layoutCoefficientService'
import { standardProductAreaApi } from '@/services/production_service/standardProductAreaService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('HSL-ADD'))
const canEdit = computed(() => can('HSL-EDIT'))
const canDelete = computed(() => can('HSL-DELETE'))

const allRows = ref([])
const filters = ref({ keyword: '' })
const globalStandardArea = ref(null)

const previewOpen = ref(false)
const previewData = ref({ to_create: [], to_update: [], errors: [] })
const previewLoading = ref(false)
const applyLoading = ref(false)

async function openPreview() {
    try {
        previewLoading.value = true
        const { data } = await layoutCoefficientApi.generateFromSPreview()
        previewData.value = data
        previewOpen.value = true
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không lấy được bản xem trước')
    } finally {
        previewLoading.value = false
    }
}

async function applyPreview() {
    try {
        applyLoading.value = true
        const { data } = await layoutCoefficientApi.generateFromSApply()
        const c = data?.created_count ?? 0
        const u = data?.updated_count ?? 0
        const err = data?.errors_count ?? 0
        message.success(`Áp dụng xong: ${c} mới, ${u} ghi đè${err ? `, ${err} lỗi` : ''}`)
        previewOpen.value = false
        await fetchAll()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Áp dụng thất bại')
    } finally {
        applyLoading.value = false
    }
}

const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
})

async function fetchAll() {
    try {
        const [list, spa] = await Promise.all([
            layoutCoefficientApi.listAll(),
            standardProductAreaApi.listAll().catch(() => []),
        ])

        list.sort((a, b) => String(a.item_code).localeCompare(String(b.item_code), 'vi', { numeric: true }))
        allRows.value = list

        const first = Array.isArray(spa) ? spa[0] : null
        globalStandardArea.value = first?.standard_area != null ? Number(first.standard_area) : null

        pagination.total = list.length
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không tải được hệ số layout/diện tích chuẩn')
    }
}

const filtered = computed(() => {
    const k = (filters.value.keyword || '').trim().toLowerCase()
    if (!k) return allRows.value
    return allRows.value.filter(r =>
        String(r.item_code || '').toLowerCase().includes(k) ||
        String(r.coefficient ?? '').toLowerCase().includes(k) ||
        String(r.L ?? '').toLowerCase().includes(k) ||
        String(r.W ?? '').toLowerCase().includes(k) ||
        String(r.H ?? '').toLowerCase().includes(k)
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
    editing.value = {
        id: r.id,
        item_code: r.item_code,
        L: r.L,
        W: r.W,
        H: r.H,
        coefficient: r.coefficient,
        layout_ratio: r.layout_ratio,
    }
    modalOpen.value = true
}

async function onSubmit(payload) {
    try {
        const toNum3OrNull = v => {
            const s = String(v ?? '').trim()
            if (s === '' || Number.isNaN(Number(s))) return null
            return Number.parseFloat(Number(s).toFixed(3)) // mm: tối đa 3 số lẻ
        }

        const toDec4OrNull = v => {
            const s = String(v ?? '').trim()
            return s === '' || Number.isNaN(Number(s))
                ? null
                : Number.parseFloat(Number(s).toFixed(4))
        }

        const code = String(payload.item_code || '').trim().toUpperCase()
        const allowDims = (code[9] === '0') || (code.slice(9, 11) === 'S1') // 1-based: ký tự thứ 10

        if (!code) {
            message.error('Vui lòng nhập mã hàng')
            return
        }

        let body = { item_code: code }

        if (allowDims) {
            const L = toNum3OrNull(payload.L)
            const W = toNum3OrNull(payload.W)
            const H = toNum3OrNull(payload.H)
            if ([L, W, H].some(v => v === null)) {
                message.error('Vui lòng nhập đủ L, W, H (số thập phân, mm)')
                return
            }
            body = { ...body, l: L, w: W, h: H } // 👈 gửi l/w/h
        } else {
            const coefficient = toDec4OrNull(payload.coefficient)
            if (coefficient === null) {
                message.error('Vui lòng nhập hệ số (dạng số, tối đa 4 số thập phân)')
                return
            }
            body = { ...body, coefficient }
        }

        if (payload.layout_ratio !== undefined) {
            const layout_ratio = toDec4OrNull(payload.layout_ratio)
            if (layout_ratio !== null) body.layout_ratio = layout_ratio
        }

        if (editing.value?.id) {
            await layoutCoefficientApi.update(editing.value.id, body)
            message.success('Cập nhật thành công')
        } else {
            await layoutCoefficientApi.create(body)
            message.success('Thêm thành công')
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
            e?.message || 'Lỗi khi lưu'
        message.error(msg)
    }
}

async function onDelete(id) {
    try {
        await layoutCoefficientApi.remove(id)
        message.success('Xoá thành công')
        const before = pagedData.value.length
        await fetchAll()
        const after = pagedData.value.length
        if (before === 1 && pagination.current > 1 && after === 0) pagination.current -= 1
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không xoá được')
    }
}

// ===== NÚT TÍNH LẠI HỆ SỐ LAYOUT =====
const recalcLoading = ref(false)
async function recalculate() {
    try {
        recalcLoading.value = true
        await layoutCoefficientApi.recalculate() // BE dùng standard_area mặc định
        message.success('Đã tính lại hệ số layout')
        await fetchAll()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không tính lại được hệ số layout')
    } finally {
        recalcLoading.value = false
    }
}

// ===== ✅ NÚT TÍNH DIỆN TÍCH SẢN PHẨM CHUẨN (ghi vào coefficient) =====
// BE đã ROUND(..., 4)
const calcCoeffLoading = ref(false)
async function calcCoefficient() {
    try {
        calcCoeffLoading.value = true
        await layoutCoefficientApi.calcCoefficient()
        message.success('Đã tính Diện tích sản phẩm chuẩn (m²) = ROUND(L×W/10000, 4)')
        await fetchAll()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không tính được Diện tích sản phẩm chuẩn')
    } finally {
        calcCoeffLoading.value = false
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
    gap: 8px;
    flex-wrap: wrap;
}

.ml-8 {
    margin-left: 8px;
}
</style>
