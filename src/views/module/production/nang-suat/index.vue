<!-- ProductivityPage.vue -->
<template>
  <div class="stack">
    <div class="actions" v-if="canAdd">
      <h2 style="margin:0">Quản lý năng suất</h2>
      <a-space>
        <a-button @click="openImport">Import Excel</a-button>

        <a-tooltip :title="exportTooltip">
          <span>
            <a-button :loading="exporting" :disabled="!exportFilterOk || exporting" @click="exportExcel">
              Xuất Excel
            </a-button>
          </span>
        </a-tooltip>

        <a-tooltip :title="saveAllTooltip">
          <span>
            <a-button :loading="savingAll" :disabled="!saveAllEnabled || savingAll" @click="saveAllCalcs">
              Lưu tính tất cả
            </a-button>
          </span>
        </a-tooltip>

        <a-button type="primary" @click="openCreate">Thêm năng suất</a-button>
      </a-space>
    </div>

    <ProductivityFilter
      v-model="filters"
      :workshops="workshops"
      :teams="teams"
      @search="applyFilters"
    />

    <ProductivityTable
      :data-source="pagedData"
      :pagination="pagination"
      :layout-map="layoutRatioMap"
      @change="onTableChange"
      @edit="openEdit"
      @delete="onDelete"
      @save-one="saveOneCalcs"
      :can-edit="canEdit"
      :can-delete="canDelete"
      :is-admin="isAdmin"
    />

    <ProductivityIssuesPanel
      :std-missing-list="stdMissingList"
      :layout-issue-list="layoutIssueList"
    />

    <ProductivityModal
      v-model:visible="modalVisible"
      :workshops="workshops"
      :teams="teams"
      :initial="editing"
      @submit="handleSubmit"
      @cancel="() => (modalVisible = false)"
      :created-by-name="editing?.created_by_name || user.value?.name"
    />

    <ImportExcelModal
      v-model:visible="importVisible"
      @done="onImported"
      @cancel="() => (importVisible = false)"
    />
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

const todayYmd = () => dayjs().format('YYYY-MM-DD')

/* ===== Utils ===== */
const toCode = (s) => String(s || '').trim().toUpperCase()
const toLayoutKey = (s) => toCode(s).substring(0, 11)
const toIntOrNull = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : null

function coerceDay(val) {
  const d1 = dayjs(val)
  if (d1.isValid()) return d1
  const s = String(val || '')
  const d2 = dayjs(s.slice(0, 10))
  if (d2.isValid()) return d2
  const d3 = dayjs(s.slice(0, 10).replace(/\//g, '-'))
  return d3.isValid() ? d3 : null
}

/* ===== Master data ===== */
const workshops = ref([])
const teams = ref([])

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

/* ===== Filters + pagination ===== */
const filters = ref({
  dateRange: [],
  workshop_id: null,
  team_id: null,
  order_no: '',
  item_code: '',
  created_by_name: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100']
})

const exportFilterOk = computed(() => {
  const r = filters.value
  return Array.isArray(r.dateRange) && r.dateRange.length === 2 && r.dateRange[0] && r.dateRange[1]
})

const exportTooltip = computed(() => {
  return exportFilterOk.value
    ? 'Xuất toàn bộ dữ liệu đang được lọc.'
    : 'Chọn khoảng ngày (từ ngày & đến ngày) trước khi xuất.'
})

const saveAllEnabled = computed(() => exportFilterOk.value)

const saveAllTooltip = computed(() => {
  return saveAllEnabled.value
    ? 'Tính & lưu cho toàn bộ dữ liệu theo bộ lọc hiện tại (chạy theo lô).'
    : 'Chọn khoảng ngày (từ ngày & đến ngày) trước khi “Lưu tính tất cả”.'
})

/* ===== Danh sách năng suất ===== */
const allRows = ref([])

function buildQueryParamsFromFilters() {
  const r = filters.value
  const params = {}

  if (Array.isArray(r.dateRange) && r.dateRange.length === 2) {
    const [fromStr, toStr] = r.dateRange
    if (fromStr) params.date_from = dayjs(fromStr).format('YYYY-MM-DD')
    if (toStr) params.date_to = dayjs(toStr).format('YYYY-MM-DD')
  }

  if (r.workshop_id) params.workshop_id = r.workshop_id
  if (r.team_id) params.team_id = r.team_id
  if (r.order_no?.trim()) params.order_no = r.order_no.trim()
  if (r.item_code?.trim()) params.item_code = r.item_code.trim()
  if (r.created_by_name?.trim()) params.created_by_name = r.created_by_name.trim()

  params._ts = Date.now()
  return params
}

async function fetchEntries() {
  try {
    const params = buildQueryParamsFromFilters()
    const list = await productivityEntryApi.listAll(params)

    const mapped = (Array.isArray(list) ? list : []).map(row => {
      const qty = Number(row.qty_actual ?? 0)
      const coe = stdCoeffMap.value.get(toCode(row.item_code))
      const qtyStandard = (coe != null && Number.isFinite(coe)) ? qty * coe : null

      const d = coerceDay(row.production_date)
      const ts = d ? d.valueOf() : NaN

      return {
        ...row,
        _std_coefficient: coe ?? null,
        qty_standard_product: qtyStandard,
        _prod_ts: ts,
      }
    })

    mapped.sort((a, b) => {
      const diff = (b._prod_ts || 0) - (a._prod_ts || 0)
      return diff !== 0 ? diff : (b.id - a.id)
    })

    allRows.value = mapped
    pagination.total = mapped.length
  } catch (e) {
    console.error(e)
    message.error('Không tải được danh sách năng suất')
  }
}

/* ===== Client-side filter ===== */
const filtered = computed(() => {
  const r = filters.value
  let rows = allRows.value

  if (Array.isArray(r.dateRange) && r.dateRange.length === 2) {
    const [fromStr, toStr] = r.dateRange
    const fromMs = fromStr ? dayjs(fromStr).startOf('day').valueOf() : -Infinity
    const toMs = toStr ? dayjs(toStr).endOf('day').valueOf() : +Infinity
    rows = rows.filter(x => {
      const t = Number(x._prod_ts)
      return Number.isFinite(t) && t >= fromMs && t <= toMs
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

  if (r.created_by_name?.trim()) {
    const q = r.created_by_name.trim().toLowerCase()
    rows = rows.filter(x => String(x.created_by_name || '').toLowerCase().includes(q))
  }

  return rows
})

const pagedData = computed(() => {
  pagination.total = filtered.value.length
  const s = (pagination.current - 1) * pagination.pageSize
  return filtered.value.slice(s, s + pagination.pageSize)
})

async function applyFilters() {
  pagination.current = 1
  await fetchEntries()
}

function onTableChange(p) {
  pagination.current = Number(p.current || 1)
  pagination.pageSize = Number(p.pageSize || pagination.pageSize)
}

/* ===== Tính layout ===== */
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
    rounded = Number.isFinite(product)
      ? (product > 0 ? Math.max(1, Math.round(product)) : Math.round(product))
      : null
  }

  return { rounded, ratio, reason, key11 }
}

/* ===== Lưu TẤT CẢ ===== */
const savingAll = ref(false)
const BATCH_SIZE = 300

async function saveAllCalcs() {
  if (!saveAllEnabled.value) {
    message.warning('Chọn khoảng ngày (từ ngày & đến ngày) trước khi “Lưu tính tất cả”.')
    return
  }

  try {
    savingAll.value = true

    const baseRows = filtered.value

    const rows = baseRows.map(r => {
      const qty = Number(r?.qty_actual ?? 0)
      const coe = Number(r?._std_coefficient ?? null)
      const stdQty = Number.isFinite(coe) ? qty * coe : null
      const { rounded, reason, key11 } = computeLayoutOne(r)

      return {
        id: r.id,
        qty_standard_product: toIntOrNull(stdQty),
        qty_layout_output: rounded,
        __reason: reason,
        __key11: key11
      }
    })

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

    const msgKey = 'saveAllProgress'
    message.loading({ content: `Đang lưu 0/${compact.length}...`, key: msgKey, duration: 0 })

    await productivityEntryApi.saveCalcsBulkChunked(compact, BATCH_SIZE, ({ done, total, batchIndex, batchTotal }) => {
      message.loading({
        content: `Đang lưu ${done}/${total} (lô ${batchIndex}/${batchTotal})...`,
        key: msgKey,
        duration: 0
      })
    })

    message.success({ content: `Đã tính & lưu cho ${compact.length} bản ghi.`, key: msgKey })
    await fetchEntries()
  } catch (e) {
    console.error(e)
    message.error(e?.response?.data?.message || e?.message || 'Lỗi khi tính & lưu tất cả')
  } finally {
    savingAll.value = false
  }
}

/* ===== Lưu 1 dòng ===== */
async function saveOneCalcs(row) {
  try {
    const qty = Number(row?.qty_actual ?? 0)
    const coe = Number(row?._std_coefficient ?? null)
    const stdQty = Number.isFinite(coe) ? qty * coe : null
    const { rounded, reason, key11 } = computeLayoutOne(row)
    if (reason) message.warning(`(#${row.id}) ${reason}`)

    await productivityEntryApi.saveCalcs(row.id, {
      qty_standard_product: toIntOrNull(stdQty),
      qty_layout_output: rounded
    })

    message.success(`Đã tính & lưu cho mã hàng: ${row.item_code} (key: ${key11})`)
    await fetchEntries()
  } catch (e) {
    console.error(e)
    message.error(e?.response?.data?.message || e?.message || 'Lỗi khi tính & lưu mã này')
  }
}

/* ===== Export Excel ===== */
const exporting = ref(false)

const exportHeaders = [
  'ID',
  'Ngày',
  'Xưởng',
  'Tổ',
  'Đơn hàng',
  'Mã hàng',
  'SL thực tế',
  'SL theo SP chuẩn',
  'SL theo SP Layout (hiển thị)',
  'Người tạo',
  'Ngày tạo',
]

function findWorkshopName(id) {
  const w = workshops.value.find(x => Number(x.id) === Number(id))
  return w?.name || String(id || '')
}

function findTeamName(id) {
  const t = teams.value.find(x => Number(x.id) === Number(id))
  return t?.name || String(id || '')
}

function layoutDisplay(row) {
  const saved = Number(row?.qty_layout_output)
  if (Number.isFinite(saved)) return saved > 0 ? Math.max(1, Math.round(saved)) : Math.round(saved)
  const { rounded } = computeLayoutOne(row)
  return Number.isFinite(rounded) ? rounded : null
}

function buildExportRows() {
  const rows = filtered.value
  return rows.map(r => {
    const d = coerceDay(r.production_date)
    return {
      'ID': r.id,
      'Ngày': d ? d.format('YYYY-MM-DD') : '',
      'Xưởng': r?.workshop?.name || findWorkshopName(r.workshop_id),
      'Tổ': r?.team?.name || findTeamName(r.team_id),
      'Đơn hàng': r.order_no || '',
      'Mã hàng': r.item_code || '',
      'SL thực tế': Number(r.qty_actual ?? 0),
      'SL theo SP chuẩn': Number.isFinite(Number(r.qty_standard_product)) ? Math.round(Number(r.qty_standard_product)) : null,
      'SL theo SP Layout (hiển thị)': layoutDisplay(r),
      'Người tạo': r.created_by_name || '',
      'Ngày tạo': r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss') : '',
    }
  })
}

function fileNameFromFilters() {
  const [fromStr, toStr] = filters.value.dateRange || []
  const from = dayjs(fromStr).isValid() ? dayjs(fromStr).format('YYYYMMDD') : 'from'
  const to = dayjs(toStr).isValid() ? dayjs(toStr).format('YYYYMMDD') : 'to'
  const ws = filters.value.workshop_id ? `-W${filters.value.workshop_id}` : ''
  const tm = filters.value.team_id ? `-T${filters.value.team_id}` : ''
  return `Nang_suat_${from}_to_${to}${ws}${tm}.xlsx`
}

async function exportExcel() {
  if (!exportFilterOk.value) {
    message.warning('Vui lòng chọn khoảng ngày (từ ngày & đến ngày) trước khi xuất.')
    return
  }

  const data = buildExportRows()
  if (!data.length) {
    message.info('Không có dữ liệu để xuất theo bộ lọc hiện tại.')
    return
  }

  exporting.value = true
  try {
    let XLSX
    try {
      XLSX = await import('xlsx')
    } catch {
      XLSX = null
    }

    const rowsArr = data.map(obj => exportHeaders.map(h => obj[h] ?? ''))
    const aoa = [exportHeaders, ...rowsArr]

    if (XLSX && XLSX.utils && XLSX.writeFile) {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      XLSX.utils.book_append_sheet(wb, ws, 'Nang_suat')
      XLSX.writeFile(wb, fileNameFromFilters())
    } else {
      const csvRows = aoa.map(cols => cols.map(v => {
        const s = (v == null ? '' : String(v)).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      }).join(','))

      const csv = '\uFEFF' + csvRows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileNameFromFilters().replace(/\.xlsx$/, '.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    message.success('Xuất file thành công.')
  } catch (e) {
    console.error(e)
    message.error('Không thể xuất file. Vui lòng thử lại.')
  } finally {
    exporting.value = false
  }
}

/* ===== CRUD & Import ===== */
const modalVisible = ref(false)
const editing = ref(null)

function openCreate() {
  editing.value = null
  modalVisible.value = true
}

function openEdit(r) {
  editing.value = { ...r }
  modalVisible.value = true
}

const importVisible = ref(false)

function openImport() {
  importVisible.value = true
}

async function onImported() {
  importVisible.value = false
  await fetchEntries()
  message.success('Đã cập nhật danh sách sau khi import')
}

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

async function handleSubmit(payload) {
  const finalPayload = {
    production_date: payload.production_date ? dayjs(payload.production_date).format('YYYY-MM-DD') : null,
    workshop_id: payload.workshop_id || payload.workshop?.id || null,
    team_id: payload.team_id || payload.team?.id || null,
    order_no: payload.order_no || '',
    item_code: payload.item_code || '',
    qty_actual: Number(payload.qty_actual ?? 0),
    created_by_name: editing.value?.created_by_name || payload.created_by_name || user.value?.name || '',
  }

  if (!finalPayload.production_date || !finalPayload.workshop_id || !finalPayload.team_id) {
    message.error('Thiếu thông tin bắt buộc: Ngày, Xưởng hoặc Tổ!')
    return
  }

  if (finalPayload.production_date > todayYmd()) {
    message.error('Ngày sản xuất không được lớn hơn ngày hiện tại')
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
    const msg =
      e?.response?.data?.message ||
      (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(', ')) ||
      e?.message ||
      'Lỗi khi lưu dữ liệu'
    message.error(msg)
  }
}

/* ===== Panel thiếu hệ số ===== */
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

/* ===== Init ===== */
onMounted(async () => {
  if (!exportFilterOk.value) {
    filters.value.dateRange = [
      dayjs().startOf('month').format('YYYY-MM-DD'),
      dayjs().endOf('month').format('YYYY-MM-DD'),
    ]
  }

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