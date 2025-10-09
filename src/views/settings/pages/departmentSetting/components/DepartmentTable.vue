<template>
    <a-table :columns="columns" :data-source="rows" :loading="loading" :pagination="pagination" :row-key="r => r.id"
        :scroll="{ x: 900 }" size="middle" @change="onChange">
        <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'stt'">
                {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
            </template>
            <template v-else-if="column.key === 'action'">
                <a-space>
                    <a-tooltip title="Sửa">
                        <a-button type="link" size="small" @click="$emit('edit', record)">
                            <template #icon>
                                <EditOutlined />
                            </template>
                        </a-button>
                    </a-tooltip>
                    <a-tooltip title="Xoá">
                        <a-popconfirm title="Xoá phòng ban này?" ok-text="Xoá" ok-type="danger" cancel-text="Huỷ"
                            @confirm="$emit('delete', record.id)">
                            <a-button type="link" danger size="small">
                                <template #icon>
                                    <DeleteOutlined />
                                </template>
                            </a-button>
                        </a-popconfirm>
                    </a-tooltip>
                </a-space>
            </template>
        </template>
    </a-table>
</template>

<script setup>
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

defineProps({
    rows: Array,
    loading: Boolean,
    pagination: Object,
})
const emit = defineEmits(['change', 'edit', 'delete'])

const columns = [
    { title: 'STT', key: 'stt', width: 70, align: 'center', fixed: 'left' },
    { title: 'Tên phòng ban', dataIndex: 'name', width: 220 },
    { title: 'Mã', dataIndex: 'code', width: 120 },
    { title: 'Mô tả', dataIndex: 'description', width: 400, ellipsis: true },
    { title: 'Thao tác', key: 'action', width: 110, align: 'center', fixed: 'right' },
]

function onChange(pag) { emit('change', pag) }
</script>
