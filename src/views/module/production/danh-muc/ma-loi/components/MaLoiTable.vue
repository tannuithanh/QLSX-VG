<template>
    <a-table :data-source="data" :columns="columns" :pagination="pagination" rowKey="id"
        @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
  // ⬇️ nhận quyền từ parent
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
})

const emit = defineEmits(['change', 'edit', 'delete'])

const sttRender = ({ index }) => {
  const { current = 1, pageSize = 10 } = props.pagination || {}
  return (current - 1) * pageSize + index + 1
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

