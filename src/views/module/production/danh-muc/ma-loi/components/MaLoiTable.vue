<template>
  <div v-if="isMobile" class="mobile-card-list">
    <a-card v-for="(record, index) in data" :key="record.id" class="mobile-card" size="small">
      <template #title>
        <div class="card-title">
          <span class="stt">#{{ getSTT(index) }}</span>
          <span class="code">{{ record.code }}</span>
        </div>
      </template>
      <template #extra>
        <TableActionButtons :showView="false" :showEdit="canEdit" :showDelete="canDelete" :confirmOnDelete="true"
          @edit="emit('edit', record)" @delete="emit('delete', record.id)" />
      </template>

      <div class="card-content">
        <div class="info-row">
          <span class="label">Dạng lỗi:</span>
          <span class="value">{{ record.name }}</span>
        </div>
      </div>
    </a-card>

    <div v-if="data.length === 0" class="empty-state">
      <a-empty description="Không có dữ liệu" />
    </div>

    <div class="mobile-pagination mt-4" v-if="pagination.total > pagination.pageSize">
      <a-pagination v-model:current="pagination.current" :total="pagination.total" :page-size="pagination.pageSize"
        size="small" :show-size-changer="false" @change="(p) => $emit('change', { ...pagination, current: p })" />
    </div>
  </div>

  <a-table v-else :data-source="data" :columns="columns" :pagination="pagination" rowKey="id"
    @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h, ref, onMounted, onUnmounted } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
  // ⬇️ nhận quyền từ parent
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
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

function getSTT(index) {
  const { current = 1, pageSize = 10 } = props.pagination || {}
  return (current - 1) * pageSize + index + 1
}

const sttRender = ({ index }) => {
  return getSTT(index)
}

const columns = [
  { title: 'STT', key: 'stt', width: 80, customRender: sttRender },
  { title: 'Mã lỗi', dataIndex: 'code' },
  { title: 'Dạng lỗi', dataIndex: 'name' },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 160,
    customRender: ({ record }) =>
      h(TableActionButtons, {
        showView: false,
        showEdit: props.canEdit,       // ⬅️ theo quyền
        showDelete: props.canDelete,   // ⬅️ theo quyền
        confirmOnDelete: true,
        onEdit: () => emit('edit', record),
        onDelete: () => emit('delete', record.id),
      }),
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

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-row .label {
  color: #8c8c8c;
}

.info-row .value {
  color: #262626;
  font-weight: 500;
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

