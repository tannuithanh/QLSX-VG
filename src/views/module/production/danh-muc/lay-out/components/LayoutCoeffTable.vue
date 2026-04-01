<!-- components/LayoutCoeffTable.vue -->
<template>
  <div v-if="isMobile" class="mobile-card-list">
    <a-card v-for="(record, index) in normalizedData" :key="record.id" class="mobile-card" size="small">
      <template #title>
        <div class="card-title">
          <span class="stt">#{{ getSTT(index) }}</span>
          <span class="code">{{ record.item_code }}</span>
        </div>
      </template>
      <template #extra>
        <TableActionButtons :showView="false" :showEdit="canEdit" :showDelete="canDelete" :confirmOnDelete="true"
          @edit="emit('edit', getPlain(record))" @delete="emit('delete', record.id)" />
      </template>

      <div class="card-content">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">L:</span>
            <span class="value">{{ fmtDim(record.L) }}</span>
          </div>
          <div class="info-item">
            <span class="label">W:</span>
            <span class="value">{{ fmtDim(record.W) }}</span>
          </div>
          <div class="info-item">
            <span class="label">H:</span>
            <span class="value">{{ fmtDim(record.H) }}</span>
          </div>
          <div class="info-item">
            <span class="label">Bộ:</span>
            <span class="value">{{ record.bundle || '—' }}</span>
          </div>
        </div>
        <a-divider style="margin: 8px 0" />
        <div class="info-row">
          <span class="label">Diện tích (m²):</span>
          <span class="value highlight">{{ record.coefficient == null ? '—' : fmtNum(record.coefficient, 4) }}</span>
        </div>
        <div class="info-row">
          <span class="label">Hệ số layout:</span>
          <span class="value highlight">{{ record.layout_ratio == null ? '—' : fmtNum(record.layout_ratio, 4) }}</span>
        </div>
      </div>
    </a-card>

    <div v-if="normalizedData.length === 0" class="empty-state">
      <a-empty description="Không có dữ liệu" />
    </div>

    <div class="mobile-pagination mt-4" v-if="pagination.total > pagination.pageSize">
      <a-pagination v-model:current="pagination.current" :total="pagination.total" :page-size="pagination.pageSize"
        size="small" :show-size-changer="false" @change="(p) => $emit('change', { ...pagination, current: p })" />
    </div>
  </div>

  <a-table v-else :data-source="normalizedData" :columns="columns" :pagination="pagination" rowKey="id"
    @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h, computed, ref, onMounted, onUnmounted } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  dataSource: { type: Array, default: () => [] },
  pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
  canDelete: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'edit', 'delete'])

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const normalizedData = computed(() => (props.dataSource?.length ? props.dataSource : props.data))

function getSTT(index) {
  const { current = 1, pageSize = 10 } = props.pagination || {}
  return (current - 1) * pageSize + index + 1
}

function getPlain(rec) {
  return {
    id: rec.id,
    item_code: rec.item_code,
    bundle: rec.bundle,
    L: rec.L,
    W: rec.W,
    H: rec.H,
    coefficient: rec.coefficient,
    layout_ratio: rec.layout_ratio,
  }
}

// Hiển thị số: nguyên => nguyên; có phần lẻ => tối đa 4 số lẻ (hoặc 3 cho L/W/H)
function fmtNum(n, digits = 4) {
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  return Number.isInteger(num) ? num.toString() : num.toFixed(digits).replace(/\.?0+$/, '')
}
function fmtDim(n) {
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  return Number.isInteger(num) ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '')
}

const columns = [
  { title: 'STT', key: 'stt', width: 80, customRender: ({ index }) => getSTT(index), align: 'center' },
  { title: 'Mã hàng', dataIndex: 'item_code', align: 'center' },

  // Bộ (bundle) dạng text như cũ
  { title: 'Bộ', dataIndex: 'bundle', align: 'center', width: 80, customRender: ({ text }) => (text ?? '—') },

  // L/W/H giữ nhãn (cm) như giao diện cũ, nhưng hiển thị theo fmtDim (không ép int)
  { title: 'L (cm)', dataIndex: 'L', align: 'center', customRender: ({ text }) => fmtDim(text) },
  { title: 'W (cm)', dataIndex: 'W', align: 'center', customRender: ({ text }) => fmtDim(text) },
  { title: 'H (cm)', dataIndex: 'H', align: 'center', customRender: ({ text }) => fmtDim(text) },

  // Diện tích SP chuẩn (m²)
  {
    title: 'Diện tích sản phẩm (m²)',
    dataIndex: 'coefficient',
    align: 'center',
    customRender: ({ text }) => (text == null ? '—' : fmtNum(text, 4)),
  },

  // Hệ số layout
  {
    title: 'Hệ số layout',
    dataIndex: 'layout_ratio',
    key: 'layout_ratio',
    align: 'center',
    customRender: ({ text }) => (text == null ? '—' : fmtNum(text, 4)),
  },

  {
    title: 'Thao tác',
    key: 'actions',
    width: 160,
    customRender: (opt) => {
      const rec = opt.record
      if (!rec) return null
      return h(TableActionButtons, {
        showView: false,
        showEdit: props.canEdit,
        showDelete: props.canDelete,
        confirmOnDelete: true,
        onEdit: () => emit('edit', getPlain(rec)),
        onDelete: () => emit('delete', rec.id),
      })
    },
  },
]
</script>

<style scoped>
.mobile-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
}

.card-title {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stt {
  background: #8a2b1f;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.code {
  font-weight: 700;
  color: white;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.info-item .label {
  color: #8c8c8c;
  font-size: 10px;
  text-transform: uppercase;
}

.info-item .value {
  color: #333;
  font-weight: 600;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.info-row .label {
  color: #8c8c8c;
}

.info-row .value {
  color: #262626;
  font-weight: 500;
}

.info-row .value.highlight {
  color: #c06252;
  font-weight: 700;
}

.empty-state {
  padding: 32px 0;
  background: #fff;
  border-radius: 8px;
}

.mobile-pagination {
  display: flex;
  justify-content: center;
  padding: 8px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
