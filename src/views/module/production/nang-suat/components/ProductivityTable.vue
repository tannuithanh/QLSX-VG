<template>
    <div v-if="isMobile" class="mobile-card-list">
        <a-card v-for="(record, index) in dataSource" :key="record.id" class="mobile-card" size="small">
            <template #title>
                <div class="card-title">
                    <span class="stt">#{{ getSTT(index) }}</span>
                    <span class="date">{{ fmtDate(record.production_date) }}</span>
                </div>
            </template>
            <template #extra>
                    :showCompute="true"
                    :confirmOnDelete="true"
                    @edit="emit('edit', getPlain(record))"
                    @delete="emit('delete', record.id)"
                    @compute="emit('save-one', record)"
                />
            </template>
            
            <div class="card-content">
                <div class="info-row">
                    <span class="label">Xưởng/Tổ:</span>
                    <span class="value">{{ record.workshop?.name || record.workshop_id }} / {{ record.team?.name || record.team_id }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Đơn hàng:</span>
                    <span class="value">{{ record.order_no }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Mã hàng:</span>
                    <span class="value"><strong>{{ record.item_code }}</strong></span>
                </div>
                <a-divider style="margin: 8px 0" />
                <div class="info-row highlight">
                    <span class="label">SL thực tế:</span>
                    <span class="value">{{ fmtInt(record.qty_actual) }}</span>
                </div>
                <div class="info-row">
                    <span class="label">SL SP chuẩn:</span>
                    <span class="value">{{ fmtInt(record.qty_standard_product) }}</span>
                </div>
                <div class="info-row">
                    <span class="label">SL SP Layout:</span>
                    <span class="value">{{ displayLayoutQty(record) }}</span>
                </div>
                <div class="card-footer mt-2">
                    <div class="text-muted">Tạo bởi: {{ record.created_by_name || '—' }}</div>
                    <div class="text-muted">Lúc: {{ fmtDateTime(record.created_at) }}</div>
                </div>
            </div>
        </a-card>
        
        <div v-if="dataSource.length === 0" class="empty-state">
            <a-empty description="Không có dữ liệu" />
        </div>
        
        <div class="mobile-pagination mt-4" v-if="pagination.total > 0">
            <a-pagination
                v-model:current="pagination.current"
                v-model:pageSize="pagination.pageSize"
                :total="pagination.total"
                size="small"
                :show-size-changer="false"
                @change="(p) => $emit('change', { current: p, pageSize: pagination.pageSize })"
            />
        </div>
    </div>

    <a-table
        v-else
        :data-source="dataSource"
        :columns="columns"
        :pagination="pagination"
        rowKey="id"
        :scroll="{ x: 'max-content' }"
        size="middle"
        @change="(pag) => $emit('change', pag)"
    />
</template>

<script setup>
import { h, computed, ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import TableActionButtons from '@/components/common/TableActionButtons.vue'

const props = defineProps({
    dataSource: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ current: 1, pageSize: 10, total: 0 }) },
    layoutMap: { type: Object, default: () => new Map() },
    canDelete: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'edit', 'delete', 'save-one'])

// Responsive logic
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

function fmtInt(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    return Math.round(v).toLocaleString()
}

function fmtDate(s) {
    if (!s) return ''
    return dayjs(s).isValid() ? dayjs(s).format('DD/MM/YYYY') : s
}

function fmtDateTime(s) {
    if (!s) return '—'
    return dayjs(s).isValid() ? dayjs(s).format('DD/MM/YYYY HH:mm') : s
}

function getSTT(index) {
    const { current = 1, pageSize = 10 } = props.pagination || {}
    return (current - 1) * pageSize + index + 1
}

function getPlain(r) {
    return {
        id: r.id,
        production_date: r.production_date,
        workshop_id: r.workshop_id,
        team_id: r.team_id,
        order_no: r.order_no,
        item_code: r.item_code,
        qty_actual: r.qty_actual,
        qty_standard_output: r.qty_standard_output,
        qty_layout_output: r.qty_layout_output,
        created_by_name: r.created_by_name,
        created_at: r.created_at,
    }
}

const sttRender = ({ index }) => {
    return getSTT(index)
}

function displayLayoutQty(record) {
    const savedNum = Number(record?.qty_layout_output)
    if (Number.isFinite(savedNum)) {
        const rounded = savedNum > 0 ? Math.max(1, Math.round(savedNum)) : Math.round(savedNum)
        return rounded.toLocaleString()
    }

    const key11 = String(record?.item_code || '').trim().toUpperCase().substring(0, 11)
    const ratio = Number(props.layoutMap.get(key11))
    const qty = Number(record?.qty_actual)
    if (!Number.isFinite(ratio) || !Number.isFinite(qty)) return '—'

    const product = Number(ratio) * qty
    const rounded = Number.isFinite(product)
        ? (product > 0 ? Math.max(1, Math.round(product)) : Math.round(product))
        : null

    return rounded?.toLocaleString?.() ?? '—'
}

const columns = computed(() => {
    const cols = [
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
            title: 'Người tạo',
            dataIndex: 'created_by_name',
            align: 'center',
            width: 150,
            customRender: ({ text }) => text || '—',
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'created_at',
            align: 'center',
            width: 170,
            customRender: ({ text, record }) => fmtDateTime(text || record?.created_at),
        },
    ]

    cols.push({
        title: 'Thao tác',
        key: 'actions',
        width: 180,
        fixed: 'right',
        align: 'left',
        customRender: ({ record }) => {
            return h(TableActionButtons, {
                showView: false,
                showDelete: props.canDelete,
                showCompute: true,
                confirmOnDelete: true,
                onEdit: () => emit('edit', getPlain(record)),
                onDelete: () => emit('delete', record.id),
                onCompute: () => emit('save-one', record),
            })
        },
    })

    return cols
})
</script>

<style scoped>
.mobile-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mobile-card {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
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

.date {
    font-weight: 600;
    color: white;
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 13px;
}

.info-row .label {
    color: #8c8c8c;
}

.info-row .value {
    color: #262626;
    text-align: right;
}

.info-row.highlight .value {
    color: #c06252;
    font-weight: bold;
    font-size: 15px;
}

.empty-state {
    padding: 40px 0;
    background: white;
    border-radius: 8px;
}

.mobile-pagination {
    display: flex;
    justify-content: center;
    background: white;
    padding: 12px;
    border-radius: 8px;
}

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.text-muted { color: #8c8c8c; }
</style>