<template>
    <a-modal v-model:visible="innerVisible" title="Import Excel năng suất" ok-text="Tải lên" cancel-text="Huỷ"
        :confirm-loading="submitting" :width="960" :mask-closable="false" destroy-on-close
        wrap-class-name="import-clean" @ok="submit" @cancel="$emit('cancel')">
        <div class="body">
            <!-- Uploader -->
            <a-upload-dragger name="file" :before-upload="beforeUpload" :file-list="fileList" :max-count="1"
                accept=".xlsx,.xls,.csv" :disabled="submitting" @remove="onRemove" class="uploader">
                <inbox-outlined />
                <span class="hint">Kéo file vào đây hoặc bấm để chọn — .xlsx / .xls / .csv</span>
                <span class="sub">
                    Cột yêu cầu: Ngày sản xuất, Xưởng, Tổ/nhóm, Đơn hàng, Mã hàng, SLSX thực tế.
                </span>
            </a-upload-dragger>

            <a-divider />

            <a-tabs v-model:activeKey="activeTab" size="small" animated>
                <a-tab-pane key="preview">
                    <template #tab>
                        Preview
                        <span v-if="previewRows.length" class="muted">({{ previewRows.length }})</span>
                    </template>

                    <div v-if="previewRows.length">
                        <a-table :columns="previewColumns" :data-source="previewRows" :pagination="{ pageSize: 10 }"
                            size="small" bordered row-key="__row" />
                    </div>
                    <a-empty v-else description="Chưa có dữ liệu để xem trước" />
                </a-tab-pane>

                <a-tab-pane v-if="errors.length" key="errors">
                    <template #tab>
                        Lỗi <a-badge :count="errors.length" :overflow-count="999" />
                    </template>

                    <div class="error-wrap">
                        <a-list size="small" :data-source="errors" :renderItem="renderErrorItem" bordered />
                    </div>
                </a-tab-pane>
            </a-tabs>

            <div v-if="success && !errors.length" class="success-row">
                Import thành công <b>{{ insertedCount }}</b> dòng.
            </div>
        </div>
    </a-modal>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { message } from 'ant-design-vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import customParse from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParse)

import { productivityEntryApi } from '@/services/production_service/productivityEntryService'
import { validateItemCodeRule } from '@/utils/itemRuleHelper' // ✅ dùng helper mới

const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'cancel', 'done'])

const innerVisible = computed({
    get: () => props.visible,
    set: v => emit('update:visible', v),
})

const submitting = ref(false)
const fileList = ref([])
const errors = ref([])
const success = ref(false)
const insertedCount = ref(0)
const activeTab = ref('preview')

const previewRows = ref([])
const previewColumns = ref([])

function slugHeader(v) {
    return (v || '')
        .toString()
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s/g, '_')
}

function pad(n) { return String(n).padStart(2, '0') }

// YYYY-MM-DD hoặc null
function parseProductionDate(value) {
    if (typeof value === 'number' || (/^\d+(\.\d+)?$/.test(String(value)))) {
        const code = Number(value)
        const p = XLSX.SSF.parse_date_code(code)
        if (p && p.y && p.m && p.d) return `${p.y}-${pad(p.m)}-${pad(p.d)}`
    }
    const s = String(value || '').trim()
    const fmts = ['DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY', 'D-M-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY', 'M/D/YY']
    for (const f of fmts) {
        const d = dayjs(s, f, true)
        if (d.isValid()) return d.format('YYYY-MM-DD')
    }
    return null
}

function required(v) {
    return v !== undefined && v !== null && String(v).trim() !== ''
}
function isNumberLike(v) {
    return v !== '' && !isNaN(Number(v))
}

async function parseExcel(file) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, cellNF: false, cellText: false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const range = XLSX.utils.decode_range(ws['!ref'])

    const headers = []
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })]
        const val = cell ? String(cell.v).trim() : `COL_${C + 1}`
        headers.push({ title: val, key: slugHeader(val) })
    }

    const rows = XLSX.utils.sheet_to_json(ws, {
        header: headers.map(h => h.key),
        range: 1,
        defval: '',
        raw: true,
    })

    previewRows.value = rows.map((r, i) => {
        const dateISO = parseProductionDate(r['ngay_san_xuat'])
        return {
            __row: i + 2,
            ...r,
            ngay_san_xuat: dateISO ? dayjs(dateISO).format('DD/MM/YYYY') : r['ngay_san_xuat'],
            __dateISO: dateISO,
        }
    })

    previewColumns.value = headers.map(h => ({
        title: h.title,
        dataIndex: h.key,
        key: h.key,
        ellipsis: true,
    }))
}

function beforeUpload(file) {
    fileList.value = [file]
    errors.value = []
    success.value = false
    insertedCount.value = 0
    previewRows.value = []
    previewColumns.value = []
    parseExcel(file).catch(() => message.error('Không đọc được file Excel'))
    return false
}

function onRemove() {
    fileList.value = []
    previewRows.value = []
    previewColumns.value = []
    errors.value = []
    success.value = false
    insertedCount.value = 0
}

function renderErrorItem({ item }) {
    return h('div', { style: 'padding:6px 12px' }, [
        h('div', { style: 'font-weight:600' }, `Dòng ${item.row}:`),
        h('ul', { style: 'margin:4px 0 0 18px' }, item.errors.map(e => h('li', e))),
    ])
}

async function submit() {
    if (!fileList.value.length) return message.warning('Vui lòng chọn file Excel trước.')
    if (!previewRows.value.length) return message.warning('File không có dữ liệu.')

    const rowErrors = []
    const payload = []

    // ✅ Theo dõi bộ khóa (production_date, item_code, order_no, team_code)
    // Lưu cả dòng đầu tiên gặp để báo "đã xuất hiện ở dòng X"
    const seenKeys = new Map()

    previewRows.value.forEach(r => {
        const row = r.__row
        const e = []

        const production_date = r.__dateISO || parseProductionDate(r['ngay_san_xuat'])
        if (!production_date) e.push('Không nhận dạng được ngày tháng năm ở cột Ngày sản xuất.')

        const workshop_code = String(r['xuong'] ?? '').trim()
        const team_code = String(r['to_nhom'] ?? '').trim()
        const order_no = String((r['don_hang'] ?? r['đon_hang']) ?? '').trim()
        const item_code = String(r['ma_hang'] ?? '').trim()

        if (!required(workshop_code)) e.push('Thiếu Xưởng.')
        if (!required(team_code)) e.push('Thiếu Tổ/nhóm.')
        if (!required(order_no)) e.push('Thiếu Đơn hàng.')
        if (!required(item_code)) e.push('Thiếu Mã hàng.')

        const qty_actual_raw = r['slsx_thuc_te']
        if (!isNumberLike(qty_actual_raw)) e.push('SLSX thực tế phải là số.')

        if (required(item_code)) {
            const vr = validateItemCodeRule(item_code)
            if (!vr.ok) vr.errors.forEach(msg => e.push(`Mã "${item_code}": ${msg}`))
        }

        // ✅ Chỉ kiểm tra trùng khi đủ 4 trường của khóa
        if (production_date && required(item_code) && required(order_no) && required(team_code)) {
            // khoá trùng theo yêu cầu: ngày + mã + đơn hàng + tổ
            const key = `${production_date}__${item_code}__${order_no}__${team_code}`

            if (seenKeys.has(key)) {
                const firstRow = seenKeys.get(key)
                // ⬇️ Thông điệp chi tiết "trùng về cái gì"
                e.push(
                    `Trùng bản ghi trong file: cùng ` +
                    `Ngày="${production_date}", Mã="${item_code}", Đơn hàng="${order_no}", Tổ="${team_code}"` +
                    ` (đã xuất hiện ở dòng ${firstRow}).`
                )

                // ⛔️ Lưu ý: KHÔNG chặn nếu khác đơn hàng hoặc khác tổ — chỉ báo khi đúng bộ khóa trên.
            } else {
                seenKeys.set(key, row)
            }
        }

        if (e.length) {
            rowErrors.push({ row, errors: e })
        } else {
            payload.push({
                production_date,
                workshop_code,
                team_code,
                order_no,
                item_code,
                qty_actual: Number(qty_actual_raw),
            })
        }
    })



    if (rowErrors.length) {
        errors.value = rowErrors
        success.value = false
        insertedCount.value = 0
        activeTab.value = 'errors'
        return message.error('File import có lỗi, vui lòng kiểm tra chi tiết.')
    }

    submitting.value = true
    try {
        const { data } = await productivityEntryApi.bulkInsert({ rows: payload })
        success.value = true
        insertedCount.value = Number(data?.inserted_count || payload.length)
        message.success(`Import thành công ${insertedCount.value} dòng.`)
        emit('done')
    } catch (e) {
        const status = e?.response?.status
        const data = e?.response?.data
        if (status === 422 && data?.errors) {
            errors.value = data.errors
            success.value = false
            insertedCount.value = 0
            activeTab.value = 'errors'
            message.error(data?.message || 'File import có lỗi, vui lòng kiểm tra.')
        } else {
            message.error(data?.message || e?.message || 'Không import được file.')
        }
    } finally {
        submitting.value = false
    }
}

</script>

<style scoped>
.muted {
    opacity: 0.6;
    margin-left: 6px;
}

.uploader {
    margin-bottom: 8px;
}

.sub {
    display: block;
    font-size: 12px;
    opacity: .8;
    margin-top: 6px;
}

.error-wrap {
    max-height: 360px;
    overflow: auto;
    background: #fff;
}

.success-row {
    margin-top: 8px;
    color: #389e0d;
}
</style>
