<template>
    <a-table :columns="columns" :data-source="rows" row-key="id" :loading="loading" :pagination="pagination"
        :scroll="{ x: 1400 }" size="middle" @change="$emit('change', $event)">
        <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'stt'">
                {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
            </template>

            <template v-else-if="column.key === 'user'">
                <a-space>
                    <a-avatar :src="record.avatar" :size="32">
                        {{ record.name?.charAt(0)?.toUpperCase() }}
                    </a-avatar>
                    <div class="cell-name">
                        <div class="name">{{ record.name }}</div>
                        <div class="email">{{ record.email }}</div>
                    </div>
                </a-space>
            </template>

            <template v-else-if="column.dataIndex === 'isAdmin'">
                <a-tag :color="record.isAdmin ? 'green' : 'red'">{{ record.isAdmin ? 'Admin' : 'User' }}</a-tag>
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
                        <a-popconfirm title="Xoá người dùng này?" ok-text="Xoá" ok-type="danger" cancel-text="Huỷ"
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
    rows: { type: Array, default: () => [] },
    columns: { type: Array, required: true },
    loading: Boolean,
    pagination: { type: Object, required: true },
})
defineEmits(['change', 'edit', 'delete'])
</script>

<style scoped>
.cell-name .name {
    font-weight: 600;
    line-height: 1.1
}

.cell-name .email {
    font-size: 12px;
    color: var(--ant-color-text-tertiary)
}
</style>
