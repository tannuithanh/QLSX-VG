<template>
    <div>
        <div v-if="isMobile" class="mobile-card-list">
            <a-card v-for="(record, index) in rows" :key="record.id" class="mobile-card" size="small">
                <template #title>
                    <div class="card-title">
                        <span class="stt-badge">#{{ (page - 1) * pageSize + index + 1 }}</span>
                        <span class="date-text">{{ formatDate(record.production_date) }}</span>
                        <a-tag v-if="record.is_scrapped" color="red" style="margin-left:8px">Hủy</a-tag>
                    </div>
                </template>
                <template #extra>
                    <TableActionButtons
                        :showView="false"
                        :showEdit="canEdit"
                        :showDelete="canDelete"
                        :confirmOnDelete="true"
                        @edit="$emit('edit', record)"
                        @delete="$emit('delete', record)"
                    />
                </template>

                <div class="card-body">
                    <div class="info-row">
                        <span class="label">Xưởng/Tổ:</span>
                        <span class="value">
                            {{ formatEntity(record.workshop, record.workshop_name, record.workshop_code) }} / 
                            {{ formatEntity(record.team, record.team_name, record.team_code) }}
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="label">Đơn hàng:</span>
                        <span class="value">{{ record.order_no || '—' }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Mã hàng:</span>
                        <span class="value"><strong>{{ record.item_code || '—' }}</strong></span>
                    </div>
                    
                    <div class="error-summary-row highlight">
                        <span class="label">Số lượng lỗi:</span>
                        <span class="value error-qty">{{ record.error_qty ?? 0 }}</span>
                    </div>

                    <a-divider style="margin: 8px 0" />
                    
                    <div class="error-details">
                        <div v-if="record.error_code_1 || record.error_stage_1" class="error-item">
                            <span class="dot">•</span>
                            <span class="err-text">Lỗi 1: <strong>{{ record.error_code_1 }}</strong> tại <em>{{ stageName(record.error_stage_1) }}</em></span>
                        </div>
                        <div v-if="record.error_code_2 || record.error_stage_2" class="error-item">
                            <span class="dot">•</span>
                            <span class="err-text">Lỗi 2: <strong>{{ record.error_code_2 }}</strong> tại <em>{{ stageName(record.error_stage_2) }}</em></span>
                        </div>
                        <div v-if="record.error_code_3 || record.error_stage_3" class="error-item">
                            <span class="dot">•</span>
                            <span class="err-text">Lỗi 3: <strong>{{ record.error_code_3 }}</strong> tại <em>{{ stageName(record.error_stage_3) }}</em></span>
                        </div>
                    </div>
                </div>
            </a-card>

            <div v-if="rows.length === 0" class="empty-state">
                <a-empty description="Không có dữ liệu lỗi" />
            </div>
        </div>

        <a-table
            v-else
            :columns="columns"
            :data-source="rows"
            :pagination="false"
            :row-key="record => record.id"
            bordered
            size="middle"
            :scroll="{ x: 2200 }"
        >
            <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'stt'">
                    {{ (page - 1) * pageSize + index + 1 }}
                </template>

                <template v-else-if="column.key === 'production_date'">
                    {{ formatDate(record.production_date) }}
                </template>

                <template v-else-if="column.key === 'workshop'">
                    {{ formatEntity(record.workshop, record.workshop_name, record.workshop_code) }}
                </template>

                <template v-else-if="column.key === 'team'">
                    {{ formatEntity(record.team, record.team_name, record.team_code) }}
                </template>

                <template v-else-if="column.key === 'error_stage_1'">
                    {{ stageName(record.error_stage_1) }}
                </template>

                <template v-else-if="column.key === 'error_stage_2'">
                    {{ stageName(record.error_stage_2) }}
                </template>

                <template v-else-if="column.key === 'error_stage_3'">
                    {{ stageName(record.error_stage_3) }}
                </template>

                <template v-else-if="column.key === 'is_scrapped'">
                    <a-tag v-if="record.is_scrapped" color="red">Hủy</a-tag>
                    <span v-else></span>
                </template>

                <template v-else-if="column.key === 'actions'">
                    <a-space>
                        <a-button
                            v-if="canEdit"
                            type="link"
                            size="small"
                            @click="$emit('edit', record)"
                        >
                            Sửa
                        </a-button>

                        <a-popconfirm
                            v-if="canDelete"
                            title="Bạn có chắc muốn xoá dữ liệu này?"
                            ok-text="Xoá"
                            cancel-text="Hủy"
                            @confirm="$emit('delete', record)"
                        >
                            <a-button type="link" danger size="small">Xoá</a-button>
                        </a-popconfirm>
                    </a-space>
                </template>
            </template>
        </a-table>

        <div style="display:flex; justify-content:flex-end; margin-top:16px">
            <a-pagination
                :current="page"
                :page-size="pageSize"
                :total="total"
                :show-size-changer="true"
                :page-size-options="['10', '20', '50', '100']"
                :show-total="t => `Tổng ${t} dòng`"
                @change="handlePageChange"
                @showSizeChange="handlePageSizeChange"
            />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import TableActionButtons from '@/components/common/TableActionButtons.vue'
dayjs.extend(utc)

const props = defineProps({
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    stageNameByCode: { type: Object, default: () => ({}) },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    isMobile: { type: Boolean, default: false },
})

const emit = defineEmits(['page-change', 'page-size-change', 'edit', 'delete'])

const codeKey = v => String(v ?? '').trim().toUpperCase()

function stageName(code) {
    return props.stageNameByCode?.[codeKey(code)] || code || ''
}

function formatDate(value) {
    if (!value) return ''
    const s = String(value)
    const d = s.endsWith('Z') ? dayjs.utc(s).local() : dayjs(s)
    return d.isValid() ? d.format('DD/MM/YYYY') : ''
}

function formatEntity(entity, fallbackName, fallbackCode) {
    const name = entity?.name || fallbackName || ''
    const code = entity?.code || fallbackCode || ''
    if (name && code) return `${name} (${code})`
    return name || code || ''
}

function handlePageChange(currentPage, currentPageSize) {
    emit('page-change', currentPage)
    if (currentPageSize && Number(currentPageSize) !== Number(props.pageSize)) {
        emit('page-size-change', currentPageSize)
    }
}

function handlePageSizeChange(currentPage, nextPageSize) {
    emit('page-size-change', nextPageSize)
    emit('page-change', 1)
}

const columns = computed(() => {
    const cols = [
        {
            title: 'STT',
            key: 'stt',
            width: 70,
            align: 'center',
            fixed: 'left',
        },
        {
            title: 'Ngày sản xuất',
            key: 'production_date',
            dataIndex: 'production_date',
            width: 130,
            fixed: 'left',
        },
        {
            title: 'Xưởng',
            key: 'workshop',
            width: 180,
        },
        {
            title: 'Tổ/nhóm',
            key: 'team',
            width: 180,
        },
        {
            title: 'Đơn hàng',
            dataIndex: 'order_no',
            key: 'order_no',
            width: 180,
        },
        {
            title: 'Mã hàng',
            dataIndex: 'item_code',
            key: 'item_code',
            width: 180,
        },
        {
            title: 'SL lỗi',
            dataIndex: 'error_qty',
            key: 'error_qty',
            width: 100,
            align: 'right',
        },
        {
            title: 'Mã lỗi 1',
            dataIndex: 'error_code_1',
            key: 'error_code_1',
            width: 120,
        },
        {
            title: 'Công đoạn PS 1',
            key: 'error_stage_1',
            width: 150,
        },
        {
            title: 'Mã lỗi 2',
            dataIndex: 'error_code_2',
            key: 'error_code_2',
            width: 120,
        },
        {
            title: 'Công đoạn PS 2',
            key: 'error_stage_2',
            width: 150,
        },
        {
            title: 'Mã lỗi 3',
            dataIndex: 'error_code_3',
            key: 'error_code_3',
            width: 120,
        },
        {
            title: 'Công đoạn PS 3',
            key: 'error_stage_3',
            width: 150,
        },
        {
            title: 'Hủy',
            key: 'is_scrapped',
            width: 90,
            align: 'center',
        },
    ]

    if (props.canEdit || props.canDelete) {
        cols.push({
            title: 'Thao tác',
            key: 'actions',
            width: 120,
            fixed: 'right',
            align: 'center',
        })
    }

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

:deep(.ant-card-head) {
    background-color: #c06252;
    border-bottom: none;
    min-height: 48px;
}

.card-title {
    display: flex;
    align-items: center;
    color: white;
}

.stt-badge {
    background: #8a2b1f;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    margin-right: 8px;
}

.date-text {
    font-weight: 600;
}

.card-body {
    padding: 4px 0;
}

.info-row {
    display: flex;
    margin-bottom: 6px;
    font-size: 14px;
}

.label {
    color: #8c8c8c;
    width: 100px;
    flex-shrink: 0;
}

.value {
    color: #262626;
    word-break: break-all;
}

.error-summary-row {
    display: flex;
    align-items: center;
    margin-top: 10px;
    padding: 8px;
    background: #fff1f0;
    border-radius: 6px;
}

.error-qty {
    font-size: 18px;
    font-weight: 700;
    color: #cf1322;
}

.error-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.error-item {
    display: flex;
    gap: 6px;
    font-size: 13px;
    color: #595959;
}

.dot {
    color: #c06252;
}

.err-text strong {
    color: #262626;
}

.empty-state {
    padding: 32px;
    background: white;
    border-radius: 8px;
}

@media (max-width: 768px) {
    :deep(.ant-table-wrapper) {
        display: none;
    }
}
</style>

