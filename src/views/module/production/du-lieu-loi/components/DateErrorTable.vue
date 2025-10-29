<template>
    <a-table class="date-error-table ant-table-striped" :data-source="rows" :columns="columns" bordered size="small"
        :sticky="{ offsetHeader: 0 }" table-layout="fixed" :scroll="{ x: 'max-content' }" :pagination="{
            current: page,
            pageSize: pageSize,
            total: total,
            showTotal: (t) => `Tổng ${t} dòng`,
            onChange: (p) => $emit('page-change', p)
        }" row-key="id" />
</template>

<script setup>
import { h } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
import { Tooltip, Typography, Popconfirm } from 'ant-design-vue'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const props = defineProps({
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    canDelete: { type: Boolean, default: false }, canEdit: { type: Boolean, default: false },
    stageNameByCode: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['page-change', 'edit', 'delete'])

const codeKey = v => String(v ?? '').trim().toUpperCase()
const Ellip = (text) =>
    h(
        Tooltip,
        { placement: 'topLeft', mouseEnterDelay: 0.2 },
        {
            title: () => (text ? String(text) : ''),
            default: () =>
                h(Typography.Text, {
                    ellipsis: true,
                    style: 'max-width: 100%; display:block',
                    content: text ?? '',
                }),
        }
    )

const fmtDmy = (s) => {
    const str = String(s || '')
    const d = str.endsWith('Z') ? dayjs.utc(str) : dayjs(str)
    return d.isValid() ? d.format('DD/MM/YYYY') : ''
}
const stageName = (code) => {
    const k = codeKey(code)
    return props.stageNameByCode[k] || code || ''
}

const columns = [
    {
        title: 'Stt',
        key: 'stt',
        width: 64,
        fixed: 'left',
        align: 'center',
        customRender: ({ index }) => index + 1 + (props.page - 1) * props.pageSize,
    },
    {
        title: 'Ngày sản xuất', dataIndex: 'production_date', key: 'production_date', width: 124, fixed: 'left',
        customRender: ({ text }) => fmtDmy(text),
    },
    {
        title: 'Xưởng', key: 'workshop', width: 200, fixed: 'left',
        customRender: ({ record }) => Ellip(record?.workshop ? `${record.workshop.name} (${record.workshop.code})` : '')
    },
    {
        title: 'Tổ/nhóm', key: 'team', width: 200, fixed: 'left',
        customRender: ({ record }) => Ellip(record?.team ? `${record.team.name} (${record.team.code})` : '')
    },

    { title: 'Đơn hàng', dataIndex: 'order_no', key: 'order_no', width: 180, customRender: ({ text }) => Ellip(text) },
    { title: 'Mã hàng', dataIndex: 'item_code', key: 'item_code', width: 160, customRender: ({ text }) => Ellip(text) },
    { title: 'SL lỗi', dataIndex: 'error_qty', key: 'error_qty', width: 84, align: 'center' },

    {
        title: 'Lỗi 1',
        children: [
            { title: 'Dạng lỗi', dataIndex: 'error_type_1', key: 'error_type_1', width: 140, customRender: ({ text }) => Ellip(text) },
            { title: 'Mã lỗi', dataIndex: 'error_code_1', key: 'error_code_1', width: 120, customRender: ({ text }) => Ellip(text) },
            { title: 'Công đoạn PS', dataIndex: 'error_stage_1', key: 'error_stage_1', width: 160, customRender: ({ text }) => Ellip(stageName(text)) },
        ],
    },
    {
        title: 'Lỗi 2',
        children: [
            { title: 'Dạng lỗi', dataIndex: 'error_type_2', key: 'error_type_2', width: 140, customRender: ({ text }) => Ellip(text) },
            { title: 'Mã lỗi', dataIndex: 'error_code_2', key: 'error_code_2', width: 120, customRender: ({ text }) => Ellip(text) },
            { title: 'Công đoạn PS', dataIndex: 'error_stage_2', key: 'error_stage_2', width: 160, customRender: ({ text }) => Ellip(stageName(text)) },
        ],
    },
    {
        title: 'Lỗi 3',
        children: [
            { title: 'Dạng lỗi', dataIndex: 'error_type_3', key: 'error_type_3', width: 140, customRender: ({ text }) => Ellip(text) },
            { title: 'Mã lỗi', dataIndex: 'error_code_3', key: 'error_code_3', width: 120, customRender: ({ text }) => Ellip(text) },
            { title: 'Công đoạn PS', dataIndex: 'error_stage_3', key: 'error_stage_3', width: 160, customRender: ({ text }) => Ellip(stageName(text)) },
        ],
    },
    {
        title: 'Hủy',
        dataIndex: 'is_scrapped',
        key: 'is_scrapped',
        width: 70,
        align: 'center',
        customRender: ({ text }) => (String(text) === 'true' || text === 1 ? 'Hủy' : ''),
    },
    {
        title: 'Hành động',
        key: 'actions',
        width: 120,
        fixed: 'right',
        align: 'center',
        customRender: ({ record }) => {
            const children = []

            if (props.canEdit) {
                children.push(
                    h(EditOutlined, {
                        style: 'color:#faad14; cursor:pointer; margin-right:8px',
                        onClick: () => emit('edit', record),
                    })
                )
            }

            if (props.canDelete) {
                children.push(
                    h(
                        Popconfirm,
                        {
                            title: 'Xoá bản ghi này?',
                            okText: 'Xoá',
                            cancelText: 'Huỷ',
                            onConfirm: () => emit('delete', record),
                        },
                        {
                            default: () => h(DeleteOutlined, { style: 'color:#f5222d; cursor:pointer' }),
                        }
                    )
                )
            }

            return h('span', {}, children.length ? children : '-')
        },

    }

]
</script>

<style scoped>
.date-error-table :deep(.ant-table-thead > tr > th) {
    background: #c06252 !important;
    color: white !important;
    font-weight: 600;
    border-color: #eee;
    white-space: nowrap;
    text-align: center;
}

.date-error-table :deep(.ant-table-cell) {
    border-color: #f0f0f0;
    white-space: nowrap;
}

.ant-table-striped :deep(.ant-table-tbody > tr:nth-child(odd) > td) {
    background: #fcfcfc;
}

.date-error-table :deep(.ant-table-cell-fix-left),
.date-error-table :deep(.ant-table-cell-fix-right) {
    background: #fff;
}
</style>
