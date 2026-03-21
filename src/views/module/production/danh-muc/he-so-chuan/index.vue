<template>
  <div class="stack">
    <!-- Bộ lọc -->
    <HeSoChuanFilter v-model="filters" @search="applyFilters" />

    <!-- Hành động -->
    <div class="actions">
      <a-button v-if="canAdd" type="primary" @click="openCreate">
        Thêm hệ số chuẩn
      </a-button>

      <a-badge :count="missingCount" :overflow-count="999" style="margin-left: 8px">
        <a-button :loading="loadingMissing" @click="() => checkMissing({ openModal: true, silent: false })">
          Danh sách mã thiếu
        </a-button>
      </a-badge>
    </div>

    <!-- Bảng -->
    <HeSoChuanTable
      :data-source="pagedData"
      :pagination="pagination"
      :can-edit="canEdit"
      :can-delete="canDelete"
      @change="onTableChange"
      @edit="openEdit"
      @delete="onDelete"
    />

    <!-- Modal thêm/sửa -->
    <HeSoChuanModal
      v-model:visible="modalOpen"
      :initial="editing"
      @submit="onSubmit"
      @cancel="() => (modalOpen = false)"
    />

    <!-- Modal mã thiếu -->
    <a-modal
      v-model:visible="missingOpen"
      title="Mã ở Năng suất nhưng chưa có trong Hệ số chuẩn"
      width="720px"
      :footer="null"
      destroyOnClose
    >
      <div class="missing-toolbar">
        <span class="muted">
          Có <b>{{ filteredMissing.length }}</b> / {{ missing.length }} mã thiếu
        </span>
        <a-input
          v-model:value="missingFilter"
          placeholder="Tìm mã…"
          allow-clear
          style="max-width: 280px; margin-left: auto"
        />
      </div>

      <a-table
        :data-source="filteredMissing"
        :columns="missingCols"
        rowKey="item_code"
        size="small"
        bordered
        :pagination="{ pageSize: 10, showSizeChanger: false }"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import HeSoChuanFilter from './components/HeSoChuanFilter.vue'
import HeSoChuanTable from './components/HeSoChuanTable.vue'
import HeSoChuanModal from './components/HeSoChuanModal.vue'
import { standardCoefficientApi } from '@/services/production_service/standardCoefficientService'
import { productivityEntryApi } from '@/services/production_service/productivityEntryService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

/* ========= Quyền ========= */
const auth = useAuthStore()
const { user } = storeToRefs(auth)
const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('HSC-ADD'))
const canEdit = computed(() => can('HSC-EDIT'))
const canDelete = computed(() => can('HSC-DELETE'))

/* ========= Dữ liệu & phân trang ========= */
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
    list.sort((a, b) => String(a.item_code).localeCompare(String(b.item_code), 'vi', { numeric: true }))
    allRows.value = list
    pagination.total = list.length
  } catch (e) {
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

/* ========= Modal thêm/sửa ========= */
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
      item_code: (payload.item_code || '').trim().toUpperCase(),
      coefficient: Number(payload.coefficient),
    }
    if (!body.item_code || Number.isNaN(body.coefficient)) {
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
    await checkMissing({ openModal: false, silent: true }) // Cập nhật badge ngay

    const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    if (pagination.current > maxPage) pagination.current = maxPage
  } catch (e) {
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
    await checkMissing({ openModal: false, silent: true }) // Cập nhật badge ngay
    const after = pagedData.value.length
    if (before === 1 && pagination.current > 1 && after === 0) pagination.current -= 1
  } catch (e) {
    message.error(e?.response?.data?.message || e?.message || 'Không xoá được hệ số chuẩn')
  }
}

/* ========= Mã thiếu từ Năng suất ========= */
const loadingMissing = ref(false)
const missingOpen = ref(false)
const missing = ref([]) // [{ item_code, count }]
const missingFilter = ref('')
const missingCount = computed(() => missing.value.length)

const missingCols = [
  { title: 'Mã hàng', dataIndex: 'item_code', key: 'item_code' },
  { title: 'Số lần xuất hiện (Năng suất)', dataIndex: 'count', key: 'count', width: 220, align: 'center' },
]

const filteredMissing = computed(() => {
  const k = (missingFilter.value || '').trim().toUpperCase()
  if (!k) return missing.value
  return missing.value.filter(x => x.item_code.includes(k))
})

function extractItemCode(row) {
  const tryKeys = ['item_code', 'itemCode', 'code', 'item', 'itemcode', 'product_code', 'productCode']
  for (const k of tryKeys) {
    const v = row?.[k]
    if (typeof v === 'string' && v.trim()) return v.trim().toUpperCase()
  }
  if (row?.item && typeof row.item === 'object') {
    const v = row.item.code || row.item.item_code || row.item.itemCode
    if (typeof v === 'string' && v.trim()) return v.trim().toUpperCase()
  }
  return ''
}

function normalizeList(payload) {
  if (!payload) return []
  const p1 = payload?.data !== undefined ? payload.data : payload
  if (Array.isArray(p1?.data)) return p1.data
  if (Array.isArray(p1?.items)) return p1.items
  if (Array.isArray(p1?.rows)) return p1.rows
  if (Array.isArray(p1)) return p1
  return []
}

/**
 * Kiểm tra mã thiếu
 * @param {{ openModal?: boolean, silent?: boolean }} opts
 */
async function checkMissing({ openModal = false, silent = false } = {}) {
  const hide = !silent ? message.loading('Đang kiểm tra mã thiếu…', 0) : () => {}
  loadingMissing.value = true
  try {
    const [prodRes, stdRes] = await Promise.all([
      productivityEntryApi.list(),
      standardCoefficientApi.listAll(),
    ])

    const prod = normalizeList(prodRes)
    const std  = normalizeList({ data: stdRes })

    const prodCodes = new Map()
    for (const r of prod) {
      const code = extractItemCode(r)
      if (!code) continue
      prodCodes.set(code, (prodCodes.get(code) || 0) + 1)
    }

    const stdSet = new Set(
      std
        .map(x => extractItemCode(x) || x?.item_code || x?.itemCode || x?.code || '')
        .map(s => String(s || '').trim().toUpperCase())
        .filter(Boolean)
    )

    const diff = []
    for (const [code, cnt] of prodCodes.entries()) {
      if (!stdSet.has(code)) diff.push({ item_code: code, count: cnt })
    }
    diff.sort((a, b) => a.item_code.localeCompare(b.item_code, 'vi', { numeric: true }))

    missing.value = diff
    missingFilter.value = ''
    if (openModal) missingOpen.value = true
  } catch (e) {
    if (!silent) message.error(e?.response?.data?.message || e?.message || 'Không kiểm tra được mã thiếu')
    if (openModal) missingOpen.value = false
  } finally {
    hide()
    loadingMissing.value = false
  }
}

/* ========= Lifecycle ========= */
onMounted(async () => {
  await fetchAll()
  // 🔹 Tải trước danh sách mã thiếu để badge hiển thị sẵn
  await checkMissing({ openModal: false, silent: true })
})
</script>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
}

.missing-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.muted {
  opacity: .75;
}
</style>
