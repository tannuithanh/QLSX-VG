<template>
    <a-table :data-source="rows" row-key="id" :loading="loading" :pagination="pagination" size="middle"
        @change="(pag, filters, sorter, extra) => $emit('change', pag, filters, sorter, extra)">
        <a-table-column title="Tên module" dataIndex="name" key="name" />
        <a-table-column title="Mã (code)" dataIndex="code" key="code" width="220" />
        <a-table-column key="action" width="110" align="center">
            <template #default="{ record }">
                <a-space>
                    <a-tooltip title="Sửa">
                        <a-button type="text" size="small" @click="$emit('edit', record)">
                            <template #icon>
                                <EditOutlined />
                            </template>
                        </a-button>
                    </a-tooltip>
                    <a-popconfirm title="Xoá module này?" ok-text="Xoá" ok-type="danger" cancel-text="Huỷ"
                        @confirm="$emit('delete', record.id)">
                        <a-button type="text" size="small" danger>
                            <template #icon>
                                <DeleteOutlined />
                            </template>
                        </a-button>
                    </a-popconfirm>
                </a-space>
            </template>
        </a-table-column>
    </a-table>
</template>

<script setup>
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

defineProps({
    rows: { type: Array, default: () => [] },
    loading: Boolean,
    // ✅ nhận pagination từ cha, KHÔNG gán false
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) }
})

defineEmits(['change', 'edit', 'delete'])
</script>
