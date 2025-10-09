<template>
    <a-table :data-source="rows" :loading="loading" row-key="team_id"
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
import { h } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },    // ⬅️ thêm
    canDelete: { type: Boolean, default: false },  // ⬅️ thêm
})
const emits = defineEmits(['refresh', 'delete', 'edit'])

function formatNumber(n, f = 2) {
    const num = Number(n)
    if (Number.isNaN(num)) return '0'
    return num.toLocaleString(undefined, { minimumFractionDigits: f, maximumFractionDigits: f })
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
