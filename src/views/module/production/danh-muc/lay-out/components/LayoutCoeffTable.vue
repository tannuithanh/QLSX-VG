<!-- components/LayoutCoeffTable.vue -->
<template>
    <a-table :data-source="normalizedData" :columns="columns" :pagination="pagination" rowKey="id"
        @change="(pag) => $emit('change', pag)" />
</template>

<script setup>
import { h, computed } from 'vue'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    data: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
    canDelete: { type: Boolean, default: false }, canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'edit', 'delete'])

const normalizedData = computed(() => props.dataSource?.length ? props.dataSource : props.data)

const sttRender = ({ index }) => {
    const { current = 1, pageSize = 10 } = props.pagination || {}
    return (current - 1) * pageSize + index + 1
}

function fmtNum(n, digits = 4) {
    const num = Number(n)
    if (Number.isNaN(num)) return '—'
    return num.toFixed(digits).replace(/\.?0+$/, m => (m.length > 1 ? m : ''))
}
function fmtInt(n) {
    const num = Number(n)
    if (Number.isNaN(num)) return '—'
    return Math.floor(num)  // hoặc String(num)
}

const columns = [
    { title: 'STT', key: 'stt', width: 80, customRender: sttRender, align: 'center' },
    { title: 'Mã hàng', dataIndex: 'item_code', align: 'center' },

    // ✅ Bộ (bundle)
    { title: 'Bộ', dataIndex: 'bundle', align: 'center', width: 80, customRender: ({ text }) => (text ?? '—') },

    // ✅ L/W/H hiển thị số nguyên (mm)
    { title: 'L (cm)', dataIndex: 'L', align: 'center', customRender: ({ text }) => fmtInt(text) },
    { title: 'W (cm)', dataIndex: 'W', align: 'center', customRender: ({ text }) => fmtInt(text) },
    { title: 'H (cm)', dataIndex: 'H', align: 'center', customRender: ({ text }) => fmtInt(text) },

    // Diện tích SP chuẩn (m²)
    {
        title: 'Diện tích sản phẩm chuẩn (m²)',
        dataIndex: 'coefficient',
        align: 'center',
        customRender: ({ text }) => (text == null ? '—' : fmtNum(text)),
    },

    // Hệ số layout
    {
        title: 'Hệ số layout',
        dataIndex: 'layout_ratio',
        key: 'layout_ratio',
        align: 'center',
        customRender: ({ text }) => (text == null ? '—' : fmtNum(text, 4)),
    },

    {
        title: 'Thao tác',
        key: 'actions',
        width: 160,
        customRender: (opt) => {
            const rec = opt.record
            if (!rec) return null
            const plain = {
                id: rec.id,
                item_code: rec.item_code,
                L: rec.L,
                W: rec.W,
                H: rec.H,
                coefficient: rec.coefficient,
                // bundle không cần chỉnh sửa từ UI nên không cần truyền vào edit
            }
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
