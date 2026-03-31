<template>
    <section>
        <a-space style="width:100%; justify-content: space-between; margin-bottom:12px">
            <h2 style="margin:0">Quản lý dữ liệu lỗi</h2>
            <a-space v-if="canAdd">
                <a-button @click="showImport = true">Import Excel</a-button>
                <a-button @click="handleExport">Xuất Excel</a-button>
                <a-button type="primary" @click="openCreate()">Thêm mới</a-button>
            </a-space>
        </a-space>

        <a-card size="small" style="margin-bottom: 16px; padding: 0 12px;">
            <DateErrorFilter v-model="filters" @search="onSearch" @reset="onReset" />
        </a-card>

        <DateErrorTable
            :key="tableKey"
            :rows="pagedRows"
            :total="filteredRows.length"
            :page="page"
            :page-size="pageSize"
            :stage-name-by-code="stageNameByCode"
            :can-edit="canEdit"
            :can-delete="canDelete"
            @page-change="onPageChange"
            @page-size-change="onPageSizeChange"
            @edit="openEdit"
            @delete="handleDelete"
        />

        <DateErrorModal v-model:visible="showCreate" :record="editing" @saved="afterSaveOne" />

        <ImportExcelModal v-model:visible="showImport" @done="afterImport" />
    </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import * as XLSX from 'xlsx'
dayjs.extend(utc)

import DateErrorTable from './components/DateErrorTable.vue'
import DateErrorModal from './components/DateErrorModal.vue'
import ImportExcelModal from './components/ImportExcelModal.vue'
import DateErrorFilter from './components/DateErrorFilter.vue'

import { dataErrorApi } from '@/services/production_service/dataErrorService'
import { stageApi } from '@/services/production_service/stageService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('ERROR-ADD'))
const canEdit = computed(() => can('ERROR-EDIT'))
const canDelete = computed(() => can('ERROR-DELETE'))

const codeKey = v => String(v ?? '').trim().toUpperCase()
const toYmd = s => {
    const str = String(s || '')
    const d = str.endsWith('Z') ? dayjs.utc(str) : dayjs(str)
    return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

const allRows = ref([])
const page = ref(1)
const pageSize = ref(10)
const showCreate = ref(false)
const showImport = ref(false)
const editing = ref(null)
const tableKey = ref(0)

const filters = ref({
    order_no: '',
    item_code: '',
    workshop_id: null,
    team_id: null,
    date_from: null,
    date_to: null,
})

const stageNameByCode = ref({})

async function loadStages() {
    try {
        const list = await stageApi.listAll()
        const map = {}
        for (const s of (list || [])) {
            map[codeKey(s.code)] = s.name
        }
        stageNameByCode.value = map
    } catch (e) {
        // bỏ qua
    }
}

async function fetchAll() {
    try {
        const { data } = await dataErrorApi.list({ per_page: -1, _ts: Date.now() })
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
        allRows.value = [...arr]
    } catch (e) {
        message.error('Không tải được dữ liệu.')
    }
}

const filteredRows = computed(() => {
    const on = String(filters.value.order_no || '').toLowerCase()
    const ic = String(filters.value.item_code || '').toLowerCase()
    const wid = filters.value.workshop_id
    const tid = filters.value.team_id
    const df = filters.value.date_from
    const dt = filters.value.date_to

    return allRows.value.filter(r => {
        const passOrder = on ? String(r.order_no || '').toLowerCase().includes(on) : true
        const passItem = ic ? String(r.item_code || '').toLowerCase().includes(ic) : true

        const rowWorkshopId = r.workshop_id ?? r.workshop?.id ?? null
        const rowTeamId = r.team_id ?? r.team?.id ?? null

        const passWorkshop = wid ? Number(rowWorkshopId) === Number(wid) : true
        const passTeam = tid ? Number(rowTeamId) === Number(tid) : true

        let passDate = true
        if (df || dt) {
            const ymd = toYmd(r.production_date)
            if (df && ymd < df) passDate = false
            if (dt && ymd > dt) passDate = false
        }

        return passOrder && passItem && passWorkshop && passTeam && passDate
    })
})

const pagedRows = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredRows.value.slice(start, start + pageSize.value)
})

function formatStageName(code) {
    return stageNameByCode.value[codeKey(code)] || code || ''
}

function formatEntityText(entity, fallbackName, fallbackCode) {
    const name = entity?.name || fallbackName || ''
    const code = entity?.code || fallbackCode || ''
    if (name && code) return `${name} (${code})`
    return name || code || ''
}

function handleExport() {
    const rows = filteredRows.value.map((r, idx) => ({
        STT: idx + 1,
        'Ngày sản xuất': r.production_date ? dayjs(r.production_date).format('DD/MM/YYYY') : '',
        'Xưởng': formatEntityText(r.workshop, r.workshop_name, r.workshop_code),
        'Tổ/nhóm': formatEntityText(r.team, r.team_name, r.team_code),
        'Đơn hàng': r.order_no || '',
        'Mã hàng': r.item_code || '',
        'SL lỗi': r.error_qty ?? 0,
        'Mã lỗi 1': r.error_code_1 || '',
        'Công đoạn PS 1': formatStageName(r.error_stage_1),
        'Mã lỗi 2': r.error_code_2 || '',
        'Công đoạn PS 2': formatStageName(r.error_stage_2),
        'Mã lỗi 3': r.error_code_3 || '',
        'Công đoạn PS 3': formatStageName(r.error_stage_3),
        'Hủy': r.is_scrapped ? 'Hủy' : '',
    }))

    if (!rows.length) {
        message.warning('Không có dữ liệu để xuất.')
        return
    }

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DataError')
    XLSX.writeFile(wb, `du-lieu-loi-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`)
}

async function afterImport(insertedCount) {
    await fetchAll()
    page.value = 1
    tableKey.value++
    if (insertedCount != null) {
        message.success(`Import thành công${Number.isFinite(insertedCount) ? `: +${insertedCount}` : ''}`)
    } else {
        message.success('Import thành công')
    }
    showImport.value = false
}

function openCreate() {
    editing.value = null
    showCreate.value = true
}

function openEdit(record) {
    editing.value = record
    showCreate.value = true
}

async function afterSaveOne() {
    await fetchAll()

    const maxPage = Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value))
    if (page.value > maxPage) page.value = maxPage

    tableKey.value++
}

async function handleDelete(record) {
    try {
        await dataErrorApi.remove(record.id)
        message.success('Đã xoá.')
        await fetchAll()

        const maxPage = Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value))
        if (page.value > maxPage) page.value = maxPage

        tableKey.value++
    } catch {
        message.error('Xoá thất bại.')
    }
}

function onSearch() {
    page.value = 1
}

function onReset() {
    filters.value = {
        order_no: '',
        item_code: '',
        workshop_id: null,
        team_id: null,
        date_from: null,
        date_to: null,
    }
    page.value = 1
    pageSize.value = 10
}

function onPageChange(nextPage) {
    page.value = Number(nextPage) || 1
}

function onPageSizeChange(nextPageSize) {
    pageSize.value = Number(nextPageSize) || 10
    page.value = 1
}

watch(pageSize, () => {
    page.value = 1
})

watch(filteredRows, (rows) => {
    const maxPage = Math.max(1, Math.ceil(rows.length / pageSize.value))
    if (page.value > maxPage) page.value = maxPage
})

onMounted(async () => {
    await Promise.all([fetchAll(), loadStages()])
})
</script>