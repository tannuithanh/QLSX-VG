<!-- ProductivityPage.vue -->
<template>
    <div class="stack">
        <div class="actions" v-if="canAdd">
            <h2 style="margin:0">Quản lý năng suất</h2>
            <a-space>
                <a-button @click="openImport">Import Excel</a-button>
                <a-button :loading="savingAll" @click="saveAllCalcs">Lưu tính tất cả</a-button>
                <a-button type="primary" @click="openCreate">Thêm năng suất</a-button>
            </a-space>
        </div>

        <ProductivityFilter v-model="filters" :workshops="workshops" :teams="teams" @search="applyFilters" />

        <ProductivityTable :data-source="pagedData" :pagination="pagination" :layout-map="layoutRatioMap"
            @change="onTableChange" @edit="openEdit" @delete="onDelete" @save-one="saveOneCalcs" :can-edit="canEdit"
            :can-delete="canDelete"  :is-admin="isAdmin" />

        <!-- Panel HỢP NHẤT: thiếu hệ số chuẩn / thiếu hệ số layout -->
        <ProductivityIssuesPanel :std-missing-list="stdMissingList" :layout-issue-list="layoutIssueList" />

        <ProductivityModal v-model:visible="modalVisible" :workshops="workshops" :teams="teams" :initial="editing"
            @submit="handleSubmit" @cancel="() => (modalVisible = false)" :created-by-name="user.value?.name" />

        <ImportExcelModal v-model:visible="importVisible" @done="onImported" @cancel="() => (importVisible = false)" />
    </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

import ProductivityFilter from './components/ProductivityFilter.vue'
import ProductivityTable from './components/ProductivityTable.vue'
import ProductivityIssuesPanel from './components/ProductivityIssuesPanel.vue'
import ProductivityModal from './components/ProductivityModal.vue'
import ImportExcelModal from './components/ImportExcelModal.vue'

import { productivityEntryApi } from '@/services/production_service/productivityEntryService'
import { workshopApi } from '@/services/production_service/workshopService'
import { teamApi } from '@/services/production_service/teamService'
import { standardCoefficientApi } from '@/services/production_service/standardCoefficientService'
import { layoutCoefficientApi } from '@/services/production_service/layoutCoefficientService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))
const canAdd = computed(() => can('DLNS-ADD'))
const canEdit = computed(() => can('DLNS-EDIT'))
const canDelete = computed(() => can('DLNS-DELETE'))

/* ===== Utils ===== */
const toCode = (s) => String(s || '').trim().toUpperCase()
const toLayoutKey = (s) => toCode(s).substring(0, 11)
const toIntOrNull = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : null

/* ===== Master data ===== */
const workshops = ref([]); const teams = ref([])
async function fetchMaster() {
    try {
        const [ws, ts] = await Promise.all([
            workshopApi.listAll?.() || (await workshopApi.list()).data,
            teamApi.listAll?.() || (await teamApi.list()).data,
        ])
        workshops.value = Array.isArray(ws) ? ws : []
        teams.value = Array.isArray(ts) ? ts : []
    } catch (e) {
        console.error(e)
        message.error('Không tải được danh mục xưởng/tổ')
    }
}

/* ===== Hệ số chuẩn ===== */
const stdCoeffMap = ref(new Map())
async function fetchStdCoefficients() {
    try {
        const list = await standardCoefficientApi.listAll().catch(() => [])
        const map = new Map()
        for (const r of Array.isArray(list) ? list : []) {
            const code = toCode(r?.item_code)
            const coe = r?.coefficient == null ? null : Number(r?.coefficient)
            if (code && Number.isFinite(coe)) map.set(code, coe)
        }
        stdCoeffMap.value = map
    } catch (e) {
        console.error(e)
        message.warn('Không tải được hệ số chuẩn')
    }
}

/* ===== layout_ratio (key11) ===== */
const layoutRatioMap = ref(new Map())
async function fetchLayoutRatios() {
    try {
        const list = await layoutCoefficientApi.listAll()
        const map = new Map()
        for (const r of Array.isArray(list) ? list : []) {
            const key11 = toLayoutKey(r?.item_code)
            const raw = r?.layout_ratio
            const num = (raw === '' || raw == null) ? null : Number(raw)
            if (!key11) continue
            if (Number.isFinite(num)) map.set(key11, num)
        }
        layoutRatioMap.value = map
    } catch (e) {
        console.error(e)
        message.warn('Không tải được layout_ratio, cột layout có thể trống')
    }
}

/* ===== Danh sách năng suất ===== */
const allRows = ref([])
async function fetchEntries() {
    try {
        const list = await productivityEntryApi.listAll()
        const mapped = (Array.isArray(list) ? list : []).map(row => {
            const qty = Number(row.qty_actual ?? 0)
            const coe = stdCoeffMap.value.get(toCode(row.item_code))
            const qtyStandard = (coe != null && Number.isFinite(coe)) ? qty * coe : null
            return { ...row, _std_coefficient: coe ?? null, qty_standard_product: qtyStandard }
        })
        mapped.sort((a, b) =>
            String(b.production_date).localeCompare(String(a.production_date)) || (b.id - a.id)
        )
        allRows.value = mapped
        pagination.total = mapped.length
    } catch (e) {
        console.error(e)
        message.error('Không tải được danh sách năng suất')
    }
}

/* ===== Bộ lọc + phân trang ===== */
const filters = ref({ dateRange: [], workshop_id: null, team_id: null, order_no: '', item_code: '' })
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] })

const filtered = computed(() => {
    const r = filters.value; let rows = allRows.value
    if (Array.isArray(r.dateRange) && r.dateRange.length === 2) {
        const [from, to] = r.dateRange
        rows = rows.filter(x => { const d = String(x.production_date || ''); return (!from || d >= from) && (!to || d <= to) })
    }
    if (r.workshop_id) rows = rows.filter(x => Number(x.workshop_id) === Number(r.workshop_id))
    if (r.team_id) rows = rows.filter(x => Number(x.team_id) === Number(r.team_id))
    if (r.order_no?.trim()) { const q = r.order_no.trim().toLowerCase(); rows = rows.filter(x => String(x.order_no || '').toLowerCase().includes(q)) }
    if (r.item_code?.trim()) { const q = r.item_code.trim().toLowerCase(); rows = rows.filter(x => String(x.item_code || '').toLowerCase().includes(q)) }
    return rows
})
const pagedData = computed(() => { pagination.total = filtered.value.length; const s = (pagination.current - 1) * pagination.pageSize; return filtered.value.slice(s, s + pagination.pageSize) })
function applyFilters() { pagination.current = 1 }
function onTableChange(p) { pagination.current = Number(p.current || 1); pagination.pageSize = Number(p.pageSize || pagination.pageSize) }

/* ===== Tính layout cho lưu ===== */
function computeLayoutOne(row) {
    const codeRaw = row?.item_code
    const key11 = toLayoutKey(codeRaw)
    const qty = Number(row?.qty_actual)
    const ratio = layoutRatioMap.value.get(key11)
    let rounded = null, reason = null

    if (!Number.isFinite(qty)) {
        reason = 'Số lượng thực tế không hợp lệ'
    } else if (!layoutRatioMap.value.has(key11)) {
        reason = `Không tìm thấy hệ số layout cho mã (11 ký tự): ${key11}`
    } else if (!Number.isFinite(Number(ratio))) {
        reason = `Giá trị Hệ số layout không hợp lệ cho mã: ${key11}`
    } else {
        const product = Number(ratio) * qty
        // Rule: >0 thì tối thiểu 1
        rounded = Number.isFinite(product)
            ? (product > 0 ? Math.max(1, Math.round(product)) : Math.round(product))
            : null
    }
    return { rounded, ratio, reason, key11 }
}

/* ===== Lưu TẤT CẢ ===== */
const savingAll = ref(false)
async function saveAllCalcs() {
    try {
        savingAll.value = true
        const rows = allRows.value.map(r => {
            const qty = Number(r?.qty_actual ?? 0)
            const coe = Number(r?._std_coefficient ?? null)
            const stdQty = Number.isFinite(coe) ? qty * coe : null
            const { rounded, reason, key11 } = computeLayoutOne(r)
            return { id: r.id, qty_standard_product: toIntOrNull(stdQty), qty_layout_output: rounded, __reason: reason, __key11: key11 }
        })

        const failed = rows.filter(x => x.__reason)
        if (failed.length) {
            const sample = failed.slice(0, 5).map(x => `#${x.id} (${x.__key11}): ${x.__reason}`).join(' | ')
            message.warning(`Một số dòng không thể tính layout: ${failed.length} dòng. Ví dụ: ${sample}`)
        }

        const compact = rows.filter(x => x.qty_standard_product != null || x.qty_layout_output != null).map(({ __reason, __key11, ...rest }) => rest)
        if (!compact.length) { message.info('Không có dữ liệu để lưu'); return }

        const size = 200
        for (let i = 0; i < compact.length; i += size) {
            await productivityEntryApi.saveCalcsBulk(compact.slice(i, i + size))
        }
        message.success(`Đã tính & lưu cho ${compact.length} bản ghi.`); await fetchEntries()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Lỗi khi tính & lưu tất cả')
    } finally { savingAll.value = false }
}

/* ===== Lưu 1 dòng ===== */
async function saveOneCalcs(row) {
    try {
        const qty = Number(row?.qty_actual ?? 0)
        const coe = Number(row?._std_coefficient ?? null)
        const stdQty = Number.isFinite(coe) ? qty * coe : null
        const { rounded, reason, key11 } = computeLayoutOne(row)
        if (reason) message.warning(`(#${row.id}) ${reason}`)
        await productivityEntryApi.saveCalcs(row.id, { qty_standard_product: toIntOrNull(stdQty), qty_layout_output: rounded })
        message.success(`Đã tính & lưu cho mã hàng: ${row.item_code} (key: ${key11})`); await fetchEntries()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Lỗi khi tính & lưu mã này')
    }
}

/* ===== CRUD & Import ===== */
const modalVisible = ref(false); const editing = ref(null)
function openCreate() { editing.value = null; modalVisible.value = true }
function openEdit(r) { editing.value = { ...r }; modalVisible.value = true }
const importVisible = ref(false)
function openImport() { importVisible.value = true }
async function onImported() { importVisible.value = false; await fetchEntries(); message.success('Đã cập nhật danh sách sau khi import') }
async function onDelete(id) { try { await productivityEntryApi.remove(id); message.success('Đã xoá bản ghi'); await fetchEntries() } catch (e) { console.error(e); message.error(e?.response?.data?.message || e?.message || 'Không xoá được bản ghi') } }
async function handleSubmit(payload) {
    console.log(user.value?.name)
    const finalPayload = {
        production_date: payload.production_date ? dayjs(payload.production_date).format('YYYY-MM-DD') : null,
        workshop_id: payload.workshop_id || payload.workshop?.id || null,
        team_id: payload.team_id || payload.team?.id || null,
        order_no: payload.order_no || '',
        item_code: payload.item_code || '',
        qty_actual: Number(payload.qty_actual ?? 0),
        created_by_name: user.value?.name, // 🆕 thêm dòng này
    }
    if (!finalPayload.production_date || !finalPayload.workshop_id || !finalPayload.team_id) { message.error('Thiếu thông tin bắt buộc: Ngày, Xưởng hoặc Tổ!'); return }
    try {
        if (editing.value?.id) { await productivityEntryApi.update(editing.value.id, finalPayload); message.success('Cập nhật năng suất thành công!') }
        else { await productivityEntryApi.create(finalPayload); message.success('Thêm năng suất thành công!') }
        modalVisible.value = false; await fetchEntries()
    } catch (e) {
        const msg = e?.response?.data?.message || (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(', ')) || e?.message || 'Lỗi khi lưu dữ liệu'
        message.error(msg)
    }
}

/* ===== DỮ LIỆU CHO PANEL THIẾU (reactive) ===== */
// Thiếu hệ số chuẩn: _std_coefficient không phải số
const stdMissingList = computed(() =>
    filtered.value
        .filter(r => !Number.isFinite(Number(r?._std_coefficient)))
        .map(r => ({
            item_code: r.item_code,
            layout_key11: toLayoutKey(r.item_code),
            _std_coefficient: r._std_coefficient,
            layout_ratio: Number(layoutRatioMap.value.get(toLayoutKey(r.item_code))) || null,
        }))
)

// Thiếu layout: thiếu layout_ratio theo key11 hoặc (tuỳ bạn) các case layout = 0
const layoutIssueList = computed(() => {
    return filtered.value.map(r => {
        const key11 = toLayoutKey(r.item_code)
        const ratio = Number(layoutRatioMap.value.get(key11))
        const saved = Number(r.qty_layout_output)
        const reason = !Number.isFinite(ratio)
            ? 'Thiếu hệ số layout'
            : (Number.isFinite(saved) && saved === 0 ? 'SL theo SP Layout = 0' : '')
        return {
            item_code: r.item_code,
            layout_key11: key11,
            layout_ratio: Number.isFinite(ratio) ? ratio : null,
            _std_coefficient: r._std_coefficient,
            reason,
        }
    }).filter(x => x.layout_ratio == null || x.reason === 'SL theo SP Layout = 0')
})

/* ===== Khởi động ===== */
onMounted(async () => {
    await Promise.all([fetchMaster(), fetchStdCoefficients(), fetchLayoutRatios()])
    await fetchEntries()
})
</script>

<style scoped>
.stack {
    display: grid;
    gap: 12px;
}

.actions {
    display: flex;
    justify-content: space-between;
}
</style>
