<template>
    <a-table :data-source="data" :columns="columns" :pagination="pagination" rowKey="id"
        @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({ data: Array, pagination: Object,  canDelete: { type: Boolean, default: false }, canEdit: { type: Boolean, default: false },  })
const emit = defineEmits(['change', 'view', 'edit', 'delete'])

const columns = [
    { title: 'STT', key: 'stt', width: 80, customRender: ({ index }) => index + 1 },
    { title: 'Tên tổ', dataIndex: 'name' },
    { title: 'Mã tổ', dataIndex: 'code' },
    {
        title: 'Thuộc xưởng',
        key: 'workshop',
        customRender: ({ record }) => {
            // support cả hai: backend load('workshop') hoặc FE map sẵn workshop_name
            return record?.workshop?.name || record?.workshop_name || ''
        },
    },
    {
        title: 'Thao tác',
        key: 'actions',
        width: 160,
        customRender: ({ record }) =>
            h(TableActionButtons, {
                showView: false,
                showEdit: props.canEdit,       // ⬅️ dùng quyền
                showDelete: props.canDelete,   // ⬅️ dùng quyền
                confirmOnDelete: true,
                onEdit: () => emit('edit', record),
                onDelete: () => emit('delete', record.id),
            }),
    },
]
</script>
