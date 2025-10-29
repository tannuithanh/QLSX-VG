<template>
    <section>
        <a-space style="width:100%; justify-content: space-between; margin-bottom:12px">
            <h2 style="margin:0">Quản lý dữ liệu lỗi</h2>
            <a-space v-if="canAdd">
                <a-button @click="showImport = true">Import Excel</a-button>
                <a-button type="primary" @click="openCreate()">Thêm mới</a-button>
            </a-space>
        </a-space>

        <!-- Filter -->
        <DateErrorFilter v-model="filters" @search="onSearch" @reset="onReset" />

        <!-- Table -->
        <DateErrorTable :key="tableKey" :rows="pagedRows" :total="filteredRows.length" :page="page"
            :page-size="pageSize" :stage-name-by-code="stageNameByCode" @page-change="p => { page = p }"
            @edit="openEdit" @delete="handleDelete" :can-edit="canEdit" :can-delete="canDelete" />

        <!-- Modal thêm/sửa -->
        <DateErrorModal v-model:visible="showCreate" :record="editing" @saved="afterSaveOne" />

        <!-- Modal import -->
       
        <ImportExcelModal v-model:visible="showImport" @done="afterImport" @import="onImportErrors" />
    </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
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

/* ===== helpers ===== */
const codeKey = v => String(v ?? '').trim().toUpperCase()
const toYmd = s => {
    const str = String(s || '')
    const d = str.endsWith('Z') ? dayjs.utc(str) : dayjs(str)
    return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

/* ===== state ===== */
const allRows = ref([])        // toàn bộ dữ liệu (không phân trang từ BE)
const page = ref(1)
const pageSize = ref(10)
const showCreate = ref(false)
const showImport = ref(false)
const editing = ref(null)

/* dùng để remount table sau khi reload -> reset scroll/sort */
const tableKey = ref(0)

/* filters */
const filters = ref({
    order_no: '',
    item_code: '',
    date_from: null,   // 'YYYY-MM-DD'
    date_to: null,     // 'YYYY-MM-DD'
})

/* stages -> map code->name */
const stageNameByCode = ref({})
async function loadStages() {
    try {
        const list = await stageApi.listAll()
        const map = {}
        for (const s of (list || [])) map[codeKey(s.code)] = s.name
        stageNameByCode.value = map
    } catch (e) {
        // im lặng cũng được
    }
}

/* fetch all (không phân trang) */
async function fetchAll() {
    try {
        // _ts để chống cache response cũ
        const { data } = await dataErrorApi.list({ per_page: -1, _ts: Date.now() })
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
        // clone để đổi reference -> computed/pagination render lại chắc chắn
        allRows.value = [...arr]
    } catch (e) {
        message.error('Không tải được dữ liệu.')
    }
}

/* computed: filter + paginate */
const filteredRows = computed(() => {
    const on = String(filters.value.order_no || '').toLowerCase()
    const ic = String(filters.value.item_code || '').toLowerCase()
    const df = filters.value.date_from
    const dt = filters.value.date_to

    return allRows.value.filter(r => {
        const passOrder = on ? String(r.order_no || '').toLowerCase().includes(on) : true
        const passItem = ic ? String(r.item_code || '').toLowerCase().includes(ic) : true

        let passDate = true
        if (df || dt) {
            const ymd = toYmd(r.production_date)
            if (df && ymd < df) passDate = false
            if (dt && ymd > dt) passDate = false
        }

        return passOrder && passItem && passDate
    })
})

const pagedRows = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredRows.value.slice(start, start + pageSize.value)
})

/* actions */
async function refreshAll() {
    await fetchAll()
}

/* Sau khi import (flow mới: modal tự gọi BE, trả inserted_count qua @done) */
async function afterImport(insertedCount) {
    await fetchAll()     // reload data mới nhất
    page.value = 1       // về trang 1 để thấy record mới
    tableKey.value++     // remount table để reset scroll/sort
    if (insertedCount != null) {
        message.success(`Import thành công${Number.isFinite(insertedCount) ? `: +${insertedCount}` : ''}`)
    } else {
        message.success('Import thành công')
    }
    showImport.value = false
}

/* Nếu modal emit @import="onImportErrors" -> rows trả về, cha tự gọi BE */
async function onImportErrors(rows) {
    try {
        const res = await dataErrorApi.bulkInsert({ rows })
        const count = res?.data?.inserted_count
        await afterImport(count)
    } catch (e) {
        message.error(e?.response?.data?.message || 'Import lỗi')
        showImport.value = false
    }
}

function openCreate() {
    editing.value = null
    showCreate.value = true
}
function openEdit(record) {
    editing.value = record
    showCreate.value = true
}

/* Sau khi create/update 1 record từ modal */
async function afterSaveOne() {
    await fetchAll()
    // nếu đang ở trang cuối và có thể văng khỏi phạm vi -> đưa về trang 1 cho chắc
    if ((page.value - 1) * pageSize.value >= filteredRows.value.length) page.value = 1
}

async function handleDelete(record) {
    try {
        await dataErrorApi.remove(record.id)
        message.success('Đã xoá.')
        await fetchAll()
        if ((page.value - 1) * pageSize.value >= filteredRows.value.length) page.value = 1
        tableKey.value++   // remount đề phòng scroll/sort
    } catch {
        message.error('Xoá thất bại.')
    }
}

function onSearch() {
    page.value = 1
}
function onReset() {
    filters.value = { order_no: '', item_code: '', date_from: null, date_to: null }
    page.value = 1
}

/* nếu đổi pageSize -> về trang 1 */
watch(pageSize, () => { page.value = 1 })

onMounted(async () => {
    await Promise.all([fetchAll(), loadStages()])
})
</script>
