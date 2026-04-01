<template>
    <div v-if="isMobile" class="mobile-card-list">
        <a-card v-for="(record, index) in rows" :key="record.team_id" class="mobile-card" size="small">
            <template #title>
                <div class="card-title">
                    <span class="stt">#{{ index + 1 }}</span>
                    <span class="name">{{ record?.team?.name ? `${record.team.name} (${record.team.code})` : record.team_id }}</span>
                </div>
            </template>
            <template #extra>
                <TableActionButtons :showView="false" :showEdit="canEdit" :showDelete="canDelete" :confirmOnDelete="true"
                    @edit="emits('edit', record)" @delete="emits('delete', record)" />
            </template>

            <div class="card-content">
                <div class="info-row highlight">
                    <span class="label">SL chuẩn layout:</span>
                    <span class="value">{{ formatNumber(record.layout_std_qty, 4) }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Người cập nhật:</span>
                    <span class="value">{{ record.updated_by || '—' }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Cập nhật lúc:</span>
                    <span class="value">{{ formatDateTime(record.updated_at) }}</span>
                </div>
            </div>
        </a-card>

        <div v-if="rows.length === 0" class="empty-state">
            <a-empty description="Không có dữ liệu" />
        </div>
    </div>

    <a-table v-else :data-source="rows" :loading="loading" row-key="team_id"
        :pagination="{ pageSize: 20, showSizeChanger: true }">
        <a-table-column key="team" title="Tổ" align="center"
            :customRender="({ record }) => record?.team?.name ? `${record.team.name} (${record.team.code})` : record.team_id" />
        <a-table-column key="layout_std_qty" dataIndex="layout_std_qty" title="SL chuẩn layout" align="center"
            :customRender="({ text }) => formatNumber(text, 4)" />
        <a-table-column key="updated_by" dataIndex="updated_by" title="Người cập nhật" align="center" />
        <a-table-column key="updated_at" dataIndex="updated_at" title="Cập nhật lúc" align="center"
            :customRender="({ text }) => formatDateTime(text)" />
        <a-table-column key="actions" title="Thao tác" align="center" :customRender="renderActions" />
    </a-table>
</template>

<script setup>
import { h, ref, onMounted, onUnmounted } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
})
const emits = defineEmits(['refresh', 'delete', 'edit'])

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

function formatNumber(n, f = 4) {
    const num = Number(n)
    if (Number.isNaN(num)) return '0'
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: f })
}

function formatDateTime(s) {
    if (!s) return '—'
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    const pad = (x) => String(x).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function renderActions({ record }) {
    return h(TableActionButtons, {
        showView: false,
        showEdit: props.canEdit,
        showDelete: props.canDelete,
        confirmOnDelete: true,
        onEdit: () => emits('edit', record),
        onDelete: () => emits('delete', record),
    })
}
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
    color: #262626;
    font-weight: 500;
}

.info-row.highlight .value {
    color: #c06252;
    font-weight: 700;
    font-size: 14px;
}

.empty-state {
    padding: 32px 0;
    background: #fff;
    border-radius: 8px;
}
</style>
