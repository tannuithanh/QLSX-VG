<template>
    <a-table :columns="columns" :data-source="rows" :loading="loading" row-key="id" :pagination="safePagination"
        size="middle" @change="(pag, filters, sorter, extra) => $emit('change', pag, filters, sorter, extra)">
        <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'stt'">
                {{ (safePagination.current - 1) * (safePagination.pageSize || 10) + index + 1 }}
            </template>

            <template v-else-if="column.key === 'action'">
                <TableActionButtons :showView="false" :showSave="false" :showCancel="false" :confirmOnDelete="true"
                    confirmTitle="Xoá chức năng này?" confirmOkText="Xoá" confirmCancelText="Huỷ"
                    @edit="$emit('edit', record)" @delete="$emit('delete', record.id)" />
            </template>
        </template>
    </a-table>
</template>

<script setup>
import { computed } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: Boolean,
    // KHÔNG truyền handler trong object này
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10 }) }
})

defineEmits(['change', 'edit', 'delete'])

// clone sạch, chỉ giữ các key hiển thị — tránh vô tình có onChange/onShowSizeChange
const safePagination = computed(() => {
    const p = props.pagination || {}
    return {
        current: Number(p.current) || 1,
        pageSize: Number(p.pageSize) || 10,
        total: Number(p.total) || (props.rows?.length || 0),
        showQuickJumper: p.showQuickJumper ?? true,
        showSizeChanger: p.showSizeChanger ?? true
    }
})

const columns = [
    { title: 'STT', key: 'stt', width: 80, align: 'center' },
    { title: 'Tên chức năng', dataIndex: 'name', width: 260 },
    { title: 'Mã chức năng', dataIndex: 'code', width: 200 },
    { title: 'Thao tác', key: 'action', width: 120 }
]
</script>
