<template>
    <a-table :data-source="dataSource" :columns="columns" :pagination="pagination" rowKey="id"
        @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h } from 'vue'
import dayjs from 'dayjs'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

/**
 * BẢNG NĂNG SUẤT — phiên bản tối ưu
 * - Hiển thị SL theo SP Layout:
 *   • Nếu đã có giá trị lưu (qty_layout_output) → hiển thị số nguyên
 *   • Nếu chưa có → tự tính = qty_actual * layout_ratio(key11), áp dụng rule: >0 thì tối thiểu 1
 * - layoutMap phải là Map theo 11 ký tự đầu (key11) của item_code
 */

const props = defineProps({
    dataSource: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
    // Map { key11 (11 ký tự đầu của item_code, upper) => layout_ratio }
    layoutMap: { type: Object, default: () => new Map() },
    canDelete: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'edit', 'delete', 'save-one'])

/* ===== Utils ===== */
const toLayoutKey = (s) => String(s || '').trim().toUpperCase().substring(0, 11)

function fmtInt(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    return Math.round(v).toLocaleString()
}
function fmtDate(s) {
    if (!s) return ''
    return dayjs(s).isValid() ? dayjs(s).format('DD/MM/YYYY') : s
}
const sttRender = ({ index }) => {
    const { current = 1, pageSize = 10 } = props.pagination || {}
    return (current - 1) * pageSize + index + 1
}

/**
 * Hiển thị “SL theo SP Layout”
 * - Ưu tiên giá trị đã lưu (qty_layout_output)
 * - Nếu chưa có, tự tính theo key11 và áp dụng quy tắc: >0 thì tối thiểu 1
 */
function displayLayoutQty(record) {
  // 1) ĐÃ LƯU: dùng rule >0 ⇒ max(1, round(...))
  const savedNum = Number(record?.qty_layout_output)
  if (Number.isFinite(savedNum)) {
    const rounded = savedNum > 0 ? Math.max(1, Math.round(savedNum)) : Math.round(savedNum)
    return rounded.toLocaleString()
  }

  // 2) CHƯA LƯU: tự tính theo key11 + rule >0 ⇒ max(1, round(...))
  const key11 = String(record?.item_code || '').trim().toUpperCase().substring(0, 11)
  const ratio = Number(props.layoutMap.get(key11))
  const qty   = Number(record?.qty_actual)
  if (!Number.isFinite(ratio) || !Number.isFinite(qty)) return '—'

const product = Number(ratio) * qty
// trước đây: rounded = toIntOrNull(product)
const rounded = Number.isFinite(product)
  ? (product > 0 ? Math.max(1, Math.round(product)) : Math.round(product))
  : null

  return rounded.toLocaleString()
}


/* ===== Columns ===== */
const columns = [
    { title: 'STT', key: 'stt', width: 70, align: 'center', customRender: sttRender },
    { title: 'Ngày', dataIndex: 'production_date', width: 120, align: 'center', customRender: ({ text }) => fmtDate(text) },
    { title: 'Xưởng', dataIndex: 'workshop.name', customRender: ({ record }) => record?.workshop?.name || record?.workshop_id },
    { title: 'Tổ', dataIndex: 'team.name', customRender: ({ record }) => record?.team?.name || record?.team_id },
    { title: 'Đơn hàng', dataIndex: 'order_no' },
    { title: 'Mã hàng', dataIndex: 'item_code' },
    { title: 'SL thực tế', dataIndex: 'qty_actual', align: 'right', customRender: ({ text }) => fmtInt(text) },
    { title: 'SL theo SP chuẩn', dataIndex: 'qty_standard_product', align: 'right', customRender: ({ text }) => fmtInt(text) },
    { title: 'SL theo SP Layout', key: 'qty_layout_output_display', align: 'right', customRender: ({ record }) => displayLayoutQty(record) },
    {
        title: 'Thao tác',
        key: 'actions',
        width: 180,
        fixed: 'right',
        align: 'center',
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
                // extraButtons: [{ text: 'Lưu tính', onClick: () => emit('save-one', r) }],
            })
        },
    },
]
</script>
