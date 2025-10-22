<template>
    <a-table :data-source="rows" :loading="loading" row-key="team_id"
        :pagination="{ pageSize: 20, showSizeChanger: true }">
        <a-table-column key="team" title="Tổ" align="center"
            :customRender="({ record }) => record?.team?.name ? `${record.team.name} (${record.team.code})` : record.team_id" />
        <a-table-column key="std_qty" dataIndex="std_qty" title="Số lượng chuẩn" align="center"
            :customRender="({ text }) => formatNumber(text, 4)" />
        <a-table-column key="updated_by" dataIndex="updated_by" title="Người cập nhật" align="center" />
        <a-table-column key="updated_at" dataIndex="updated_at" title="Cập nhật lúc" align="center"
            :customRender="({ text }) => formatDateTime(text)" />
        <a-table-column key="actions" title="Thao tác" :customRender="renderActions" />

    </a-table>
</template>

<script setup>
import TableActionButtons from '@/components/common/TableActionButtons.vue'
import { h } from 'vue'

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },    // ⬅️ thêm
    canDelete: { type: Boolean, default: false },  // ⬅️ thêm
})

const emits = defineEmits(['refresh', 'delete', 'edit'])

function formatNumber(n, frac = 4) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,   // ⬅️ không ép 4 số 0 nữa
    maximumFractionDigits: frac // ⬅️ vẫn giới hạn tối đa 4 số thập phân
  })
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
        showEdit: props.canEdit,       // ⬅️ theo quyền
        showDelete: props.canDelete,   // ⬅️ theo quyền
        confirmOnDelete: true,
        onEdit: () => emits('edit', record),
        onDelete: () => emits('delete', record),
    })
}

</script>

<style scoped>
.flex {
    display: flex;
}

.center {
    justify-content: center;
}

.gap1 {
    gap: 6px;
}
</style>
