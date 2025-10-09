<template>
    <a-table :data-source="rows" :loading="loading" row-key="id" :pagination="false">
        <a-table-column key="id" dataIndex="id" title="ID" align="center" />
        <a-table-column key="standard_area" dataIndex="standard_area" title="Diện tích chuẩn" align="center"
            :customRender="({ text }) => formatNumber(text, 4)" />
        <a-table-column key="is_selected" dataIndex="is_selected" title="Mặc định" align="center"
            :customRender="({ text }) => (text ? '✓' : '—')" />
        <a-table-column key="updated_by" dataIndex="updated_by" title="Cập nhật bởi" align="center" />
        <a-table-column key="updated_at" dataIndex="updated_at" title="Cập nhật lúc" align="center"
            :customRender="({ text }) => formatDateTime(text)" />
        <a-table-column key="actions" title="Thao tác" align="center" :width="160">
            <template #default="{ record }">
                <a-button v-if="canEdit" type="default" size="small" :disabled="record.is_selected"
                    @click="$emit('selectDefault', record)">
                    {{ record.is_selected ? 'Đang mặc định' : 'Chọn mặc định' }}
                </a-button>
            </template>
        </a-table-column>
    </a-table>
</template>

<script setup>
defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
})

function formatNumber(n, frac = 2) {
    const num = Number(n)
    if (Number.isNaN(num)) return '0'
    return num.toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

function formatDateTime(s) {
    if (!s) return '—'
    try {
        const d = new Date(s)
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return `${hh}:${mi} ${dd}/${mm}/${yyyy}`
    } catch { return s }
}
</script>
