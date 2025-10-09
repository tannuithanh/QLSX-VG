<template>
    <div class="stack">
        <div class="actions" v-if="canAdd">
            <h2 style="margin:0">Quản lý năng suất</h2>
            <a-space>
                <a-button @click="openImport">Import Excel</a-button>
                <a-button :loading="savingAll" @click="saveAllCalcs">Lưu tính TẤT CẢ</a-button>
                <a-button type="primary" @click="openCreate">Thêm năng suất</a-button>
            </a-space>
        </div>

        <ProductivityFilter v-model="filters" :workshops="workshops" :teams="teams" @search="applyFilters" />

        <!-- Truyền layoutMap để Table có thể hiển thị SL theo SP Layout khi record chưa có giá trị đã lưu -->
        <ProductivityTable :data-source="pagedData" :pagination="pagination" :layout-map="layoutRatioMap"
            @change="onTableChange" @edit="openEdit" @delete="onDelete" @save-one="saveOneCalcs"  :can-edit="canEdit" :can-delete="canDelete" />

        <ProductivityModal v-model:visible="modalVisible" :workshops="workshops" :teams="teams" :initial="editing"
            @submit="handleSubmit" @cancel="() => (modalVisible = false)" />

        <ImportExcelModal v-model:visible="importVisible" @done="onImported" @cancel="() => (importVisible = false)" />
    </div>
</template>

<script setup>
/**
 * Trang quản lý năng suất — tính “SL theo SP Layout” = qty_actual * layout_ratio
 * - layout_ratio tra theo 11 ký tự đầu của item_code (substr(0, 11)), uppercase + trim
 * - Nếu không tìm thấy: cảnh báo rõ lý do cho người dùng
 * - “Lưu tất cả” tổng hợp cảnh báo; “Lưu 1 dòng” báo cụ thể
 */

import { onMounted, reactive, ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

import ProductivityFilter from './components/ProductivityFilter.vue'
import ProductivityTable from './components/ProductivityTable.vue'
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
/* =========================
 * Utils cơ bản
 * ========================= */

/** Chuẩn hoá mã hàng: trim + uppercase */
const toCode = (s) => String(s || '').trim().toUpperCase()

/** Lấy “mã tra cứu layout” = 11 ký tự đầu của mã (sau khi chuẩn hoá) */
const toLayoutKey = (s) => toCode(s).substring(0, 11)

/** Làm tròn về số nguyên (phù hợp với cách lưu trước đây) */
const toIntOrNull = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : null

/* =========================
 * Master data: xưởng / tổ
 * ========================= */
const workshops = ref([])
const teams = ref([])

/** Tải danh mục xưởng/tổ */
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

/* =========================
 * Hệ số chuẩn (để tính cột “SL theo SP chuẩn” khi hiển thị)
 * ========================= */
const stdCoeffMap = ref(new Map())

/** Tải hệ số chuẩn và build Map { item_code => coefficient } */
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

/* =========================
 * layout_ratio (để tính/hiển thị cột “SL theo SP Layout”)
 * ========================= */
const layoutRatioMap = ref(new Map())

/** Tải hệ số layout và build Map theo 11 ký tự đầu của mã */
async function fetchLayoutRatios() {
    try {
        const list = await layoutCoefficientApi.listAll()

        console.log('[LAYOUT] sample API rows:',
            (list || []).slice(0, 5).map(r => ({
                item_code: r?.item_code, layout_ratio: r?.layout_ratio, typeof_layout_ratio: typeof r?.layout_ratio,
            }))
        )

        const map = new Map()
        for (const r of Array.isArray(list) ? list : []) {
            const key11 = toLayoutKey(r?.item_code)
            const raw = r?.layout_ratio
            const num = (raw === '' || raw == null) ? null : Number(raw)
            if (!key11) continue
            if (Number.isFinite(num)) {
                map.set(key11, num)
            } else {
                console.warn('[LAYOUT] bad ratio row:', { item_code: r?.item_code, key11, layout_ratio: raw })
            }
        }
        layoutRatioMap.value = map
        console.log('[LAYOUT] layoutRatioMap size =', map.size)
    } catch (e) {
        console.error(e)
        message.warn('Không tải được layout_ratio, cột layout có thể trống')
    }
}

/* =========================
 * Danh sách năng suất
 * ========================= */
const allRows = ref([])

/** Tải danh sách năng suất và gắn sẵn “SL theo SP chuẩn” để hiển thị */
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

/* =========================
 * Bộ lọc + phân trang
 * ========================= */
const filters = ref({
    dateRange: [],
    workshop_id: null,
    team_id: null,
    order_no: '',
    item_code: '',
})

const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
})

/** Áp dụng các filter để tạo danh sách đã lọc */
const filtered = computed(() => {
    const r = filters.value
    let rows = allRows.value

    if (Array.isArray(r.dateRange) && r.dateRange.length === 2) {
        const [from, to] = r.dateRange
        rows = rows.filter(x => {
            const d = String(x.production_date || '')
            return (!from || d >= from) && (!to || d <= to)
        })
    }
    if (r.workshop_id) rows = rows.filter(x => Number(x.workshop_id) === Number(r.workshop_id))
    if (r.team_id) rows = rows.filter(x => Number(x.team_id) === Number(r.team_id))
    if (r.order_no?.trim()) {
        const q = r.order_no.trim().toLowerCase()
        rows = rows.filter(x => String(x.order_no || '').toLowerCase().includes(q))
    }
    if (r.item_code?.trim()) {
        const q = r.item_code.trim().toLowerCase()
        rows = rows.filter(x => String(x.item_code || '').toLowerCase().includes(q))
    }
    return rows
})

/** Dữ liệu hiển thị theo trang */
const pagedData = computed(() => {
    pagination.total = filtered.value.length
    const start = (pagination.current - 1) * pagination.pageSize
    return filtered.value.slice(start, start + pagination.pageSize)
})

/** Khi nhấn “Tìm” → quay lại trang 1 */
function applyFilters() { pagination.current = 1 }

/** Khi đổi trang/kích thước */
function onTableChange(p) {
    pagination.current = Number(p.current || 1)
    pagination.pageSize = Number(p.pageSize || pagination.pageSize)
}

/* =========================
 * Tính “SL theo SP Layout” + log & lý do
 * ========================= */

/**
 * Tính SL theo SP Layout cho 1 dòng:
 * - Lấy key 11 ký tự đầu: key11 = toLayoutKey(item_code)
 * - Nếu không tìm thấy ratio -> trả null, đồng thời trả reason (để hiển thị cho user)
 * - Nếu tìm thấy -> qty_layout_output = round(qty_actual * ratio)
 * @returns { rounded: number|null, ratio: number|undefined, reason: string|null, key11: string }
 */
function computeLayoutOne(row) {
    const codeRaw = row?.item_code
    const key11 = toLayoutKey(codeRaw)
    const qty = Number(row?.qty_actual)
    const ratio = layoutRatioMap.value.get(key11)

    let rounded = null
    let reason = null

    if (!Number.isFinite(qty)) {
        reason = 'Số lượng thực tế không hợp lệ'
    } else if (!layoutRatioMap.value.has(key11)) {
        reason = `Không tìm thấy hệ số layout cho mã (11 ký tự): ${key11}`
    } else if (!Number.isFinite(Number(ratio))) {
        reason = `Giá trị Hệ số layout không hợp lệ cho mã: ${key11}`
    } else {
        const product = Number(ratio) * qty
        rounded = toIntOrNull(product) // đổi sang toFixed(2) nếu muốn lưu 2 chữ số
    }

    console.log('[LAYOUT:ROW]', {
        id: row?.id, item_code: codeRaw, key11, qty, ratio, rounded, reason: reason || 'ok',
    })

    return { rounded, ratio, reason, key11 }
}

/* =========================
 * Lưu TẤT CẢ
 * ========================= */
const savingAll = ref(false)

async function saveAllCalcs() {
    try {
        savingAll.value = true

        const rows = allRows.value.map(r => {
            // SP chuẩn (giữ nguyên cách tính)
            const qty = Number(r?.qty_actual ?? 0)
            const coe = Number(r?._std_coefficient ?? null)
            const stdQty = Number.isFinite(coe) ? qty * coe : null

            // SP Layout theo key11
            const { rounded, reason, key11 } = computeLayoutOne(r)

            return {
                id: r.id,
                qty_standard_product: toIntOrNull(stdQty),
                qty_layout_output: rounded,
                __reason: reason,
                __key11: key11,
            }
        })

        // Log bảng kiểm tra trước khi gửi
        console.table(rows.map(x => ({
            id: x.id, key11: x.__key11, std: x.qty_standard_product, layout: x.qty_layout_output, reason: x.__reason || ''
        })))

        // Tổng hợp cảnh báo khi có lý do
        const failed = rows.filter(x => x.__reason)
        if (failed.length) {
            const sample = failed.slice(0, 5).map(x => `#${x.id} (${x.__key11}): ${x.__reason}`).join(' | ')
            message.warning(`Một số dòng không thể tính layout: ${failed.length} dòng. Ví dụ: ${sample}`)
        }

        const compact = rows
            .filter(x => x.qty_standard_product != null || x.qty_layout_output != null)
            .map(({ __reason, __key11, ...rest }) => rest)

        if (!compact.length) {
            message.info('Không có dữ liệu để lưu')
            return
        }

        // Gửi theo lô
        const size = 200
        for (let i = 0; i < compact.length; i += size) {
            const slice = compact.slice(i, i + size)
            console.log(`[LAYOUT] sending bulk ${i}..${i + slice.length - 1}`, slice)
            await productivityEntryApi.saveCalcsBulk(slice)
        }

        message.success(`Đã tính & lưu cho ${compact.length} bản ghi.`)
        await fetchEntries()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Lỗi khi tính & lưu tất cả')
    } finally {
        savingAll.value = false
    }
}

/* =========================
 * Lưu 1 dòng
 * ========================= */
async function saveOneCalcs(row) {
    try {
        const qty = Number(row?.qty_actual ?? 0)
        const coe = Number(row?._std_coefficient ?? null)
        const stdQty = Number.isFinite(coe) ? qty * coe : null

        const { rounded, reason, key11 } = computeLayoutOne(row)

        if (reason) {
            message.warning(`(#${row.id}) ${reason}`)
        }

        await productivityEntryApi.saveCalcs(row.id, {
            qty_standard_product: toIntOrNull(stdQty),
            qty_layout_output: rounded,
        })

        message.success(`Đã tính & lưu cho mã hàng: ${row.item_code} (key: ${key11})`)
        await fetchEntries()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Lỗi khi tính & lưu mã này')
    }
}

/* =========================
 * CRUD & Import (giữ nguyên)
 * ========================= */
const modalVisible = ref(false)
const editing = ref(null)
function openCreate() { editing.value = null; modalVisible.value = true }
function openEdit(r) { editing.value = { ...r }; modalVisible.value = true }

const importVisible = ref(false)
function openImport() { importVisible.value = true }
async function onImported() { importVisible.value = false; await fetchEntries(); message.success('Đã cập nhật danh sách sau khi import') }

async function onDelete(id) {
    try {
        await productivityEntryApi.remove(id)
        message.success('Đã xoá bản ghi')
        await fetchEntries()
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || e?.message || 'Không xoá được bản ghi')
    }
}

/** Submit modal tạo/sửa */
async function handleSubmit(payload) {
    const finalPayload = {
        production_date: payload.production_date ? dayjs(payload.production_date).format('YYYY-MM-DD') : null,
        workshop_id: payload.workshop_id || payload.workshop?.id || null,
        team_id: payload.team_id || payload.team?.id || null,
        order_no: payload.order_no || '',
        item_code: payload.item_code || '',
        qty_actual: Number(payload.qty_actual ?? 0),
    }

    if (!finalPayload.production_date || !finalPayload.workshop_id || !finalPayload.team_id) {
        message.error('Thiếu thông tin bắt buộc: Ngày, Xưởng hoặc Tổ!')
        return
    }

    try {
        if (editing.value?.id) {
            await productivityEntryApi.update(editing.value.id, finalPayload)
            message.success('Cập nhật năng suất thành công!')
        } else {
            await productivityEntryApi.create(finalPayload)
            message.success('Thêm năng suất thành công!')
        }
        modalVisible.value = false
        await fetchEntries()
    } catch (e) {
        console.error(e)
        const msg =
            e?.response?.data?.message ||
            (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(', ')) ||
            e?.message || 'Lỗi khi lưu dữ liệu'
        message.error(msg)
    }
}

/* =========================
 * Khởi động
 * ========================= */
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
