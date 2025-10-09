<template>
    <a-table :data-source="normalizedData" :columns="columns" :pagination="pagination" rowKey="id"
        @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h, computed } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    data: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
    canDelete: { type: Boolean, default: false }, canEdit: { type: Boolean, default: false }
})
const emit = defineEmits(['change', 'edit', 'delete'])

const normalizedData = computed(() => props.dataSource?.length ? props.dataSource : props.data)

const sttRender = ({ index }) => {
    const { current = 1, pageSize = 10 } = props.pagination || {}
    return (current - 1) * pageSize + index + 1
}

const columns = [
    { title: 'STT', key: 'stt', width: 80, customRender: sttRender },
    { title: 'Tên công đoạn', dataIndex: 'name' },
    { title: 'Mã công đoạn', dataIndex: 'code' },
    {
        title: 'Thao tác',
        key: 'actions',
        width: 160,
        customRender: (opt) => {
            const rec = opt.record
            if (!rec) return null
            const plain = { id: rec.id, name: rec.name, code: rec.code }
            return h(TableActionButtons, {
                showView: false,
                showEdit: props.canEdit,       // ⬅️ dùng quyền
                showDelete: props.canDelete,   // ⬅️ dùng quyền
                confirmOnDelete: true,
                onEdit: () => emit('edit', plain),
                onDelete: () => emit('delete', plain.id),
            })
        },
    },
]
</script>
