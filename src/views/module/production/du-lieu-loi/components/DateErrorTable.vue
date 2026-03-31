<template>
    <div>
        <a-table
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
dayjs.extend(utc)

const props = defineProps({
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    stageNameByCode: { type: Object, default: () => ({}) },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
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

