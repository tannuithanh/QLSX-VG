<template>
    <a-table :data-source="dataSource" :columns="columns" :pagination="pagination" rowKey="id"
        @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h } from 'vue'
import dayjs from 'dayjs'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    dataSource: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
    layoutMap: { type: Object, default: () => new Map() }, // Map { ITEM_CODE => layout_ratio }
    canDelete: { type: Boolean, default: false }, canEdit: { type: Boolean, default: false }
})
const emit = defineEmits(['change', 'edit', 'delete', 'save-one'])

/** STT theo trang */
const sttRender = ({ index }) => {
    const { current = 1, pageSize = 10 } = props.pagination || {}
    return (current - 1) * pageSize + index + 1
}

/** Format integer đẹp */
function fmtRound(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    return Math.round(v).toLocaleString()
}

/** Format thập phân gọn (tối đa 2, bỏ 0 dư) */
function fmt2(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    return Number(v.toFixed(2)).toString()
}

/** Date DD/MM/YYYY */
function fmtDate(text) {
    if (!text) return ''
    return dayjs(text).isValid() ? dayjs(text).format('DD/MM/YYYY') : text
}

/** Hiển thị “SL theo SP Layout”: ưu tiên giá trị đã lưu; nếu chưa có, tự tính = qty_actual * layout_ratio */
function displayLayoutQty(record) {
    const saved = record?.qty_layout_output
    if (Number.isFinite(Number(saved))) return fmt2(saved)

    const code = String(record?.item_code || '').trim().toUpperCase()
    const ratio = Number(props.layoutMap.get(code))
    const qty = Number(record?.qty_actual)
    if (Number.isFinite(ratio) && Number.isFinite(qty)) return fmt2(ratio * qty)
    return '—'
}

const columns = [
    { title: 'STT', key: 'stt', width: 70, customRender: sttRender },
    { title: 'Ngày', dataIndex: 'production_date', width: 120, customRender: ({ text }) => fmtDate(text) },
    { title: 'Xưởng', dataIndex: 'workshop.name', customRender: ({ record }) => record?.workshop?.name || record?.workshop_id },
    { title: 'Tổ', dataIndex: 'team.name', customRender: ({ record }) => record?.team?.name || record?.team_id },
    { title: 'Đơn hàng', dataIndex: 'order_no' },
    { title: 'Mã hàng', dataIndex: 'item_code' },
    { title: 'SL thực tế', dataIndex: 'qty_actual' },
    { title: 'SL theo SP chuẩn', dataIndex: 'qty_standard_product', customRender: ({ text }) => fmtRound(text) },

    // ✅ Không dùng helper: hiển thị từ giá trị lưu hoặc tự tính theo layout_ratio
    { title: 'SL theo SP Layout', key: 'qty_layout_output_display', customRender: ({ record }) => displayLayoutQty(record) },

    {
        title: 'Thao tác',
        key: 'actions',
        width: 180,
        fixed: 'right',
        customRender: ({ record }) => {
            const r = record || {}
            const plain = {
                id: r.id,
                production_date: r.production_date,
                workshop_id: r.workshop_id,
                team_id: r.team_id,
                order_no: r.order_no,
                item_code: r.item_code,
                qty_actual: r.qty_actual,
                qty_standard_output: r.qty_standard_output,
                qty_layout_output: r.qty_layout_output,
            }
            return h(TableActionButtons, {
                showView: false,
                showEdit: props.canEdit,
                showDelete: props.canDelete,
                confirmOnDelete: true,
                onEdit: () => emit('edit', plain),
                onDelete: () => emit('delete', plain.id),
                // Nếu TableActionButtons hỗ trợ extra:
                // extraButtons: [{ text: 'Lưu tính', onClick: () => emit('save-one', r) }],
            })
        },
    },
]
</script>
