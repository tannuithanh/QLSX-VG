<template>
    <div v-if="isMobile" class="mobile-card-list">
        <a-card v-for="(record, index) in normalizedData" :key="record.id" class="mobile-card" size="small">
            <template #title>
                <div class="card-title">
                    <span class="stt">#{{ getSTT(index) }}</span>
                    <span class="name">{{ record.name }}</span>
                </div>
            </template>
            <template #extra>
                <TableActionButtons :showView="false" :showEdit="canEdit" :showDelete="canDelete" :confirmOnDelete="true"
                    @edit="emit('edit', { id: record.id, name: record.name, code: record.code })"
                    @delete="emit('delete', record.id)" />
            </template>

            <div class="card-content">
                <div class="info-row">
                    <span class="label">Mã công đoạn:</span>
                    <span class="value">{{ record.code }}</span>
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
    canEdit: { type: Boolean, default: false }
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

const normalizedData = computed(() => props.dataSource?.length ? props.dataSource : props.data)

function getSTT(index) {
    const { current = 1, pageSize = 10 } = props.pagination || {}
    return (current - 1) * pageSize + index + 1
}

const sttRender = ({ index }) => {
    return getSTT(index)
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
                showEdit: props.canEdit,
                showDelete: props.canDelete,
                confirmOnDelete: true,
                onEdit: () => emit('edit', plain),
                onDelete: () => emit('delete', plain.id),
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

.name {
    font-weight: 700;
    color: white;
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
    color: #c06252;
    font-weight: 600;
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
