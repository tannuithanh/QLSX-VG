<template>
    <div class="p-4">
        <a-page-header title="Báo cáo năng suất" />

        <a-card class="mb-4">
            <ReportToolbar v-model:reportType="reportType" v-model:search="search" :loading="loading"
                :date-from="dateFrom" :date-to="dateTo" :workshops="workshops" :teams="teams"
                v-model:workshopId="searchWorkshopId" v-model:teamId="searchTeamId" @submit="onSubmitRange"
                @reload="reload" />
        </a-card>

        <a-row :gutter="16" v-if="reportType === 'nang-suat'">
            <a-col :span="24">
                <a-card>
                    <div class="mb-3 flex items-center justify-between">
                        <div>
                            <strong>Khoảng ngày: </strong>
                            <span v-if="selectedRangeText">{{ selectedRangeText }}</span>
                            <span v-else>Chưa chọn</span>
                            <span class="ml-2 text-muted">
                                (KPI chuẩn chỉ cộng theo ngày có dữ liệu thực tế của từng tổ/xưởng)
                            </span>
                        </div>
                    </div>

                    <!-- Bảng chi tiết theo mã -->
                    <ProductivityReportTable :rows="filteredRows" :loading="loading" v-model:pageSize="pageSize"
                        v-model:current="current" />

                    <!-- Bảng tổng hợp theo Tổ (giữ nguyên) -->
                    <div class="mt-4">
                        <TeamTotalsTable :rows="teamTotalsRows" :loading="loading" />
                    </div>

                    <!-- Hai bảng tổng -->
                    <a-row :gutter="16" class="mt-4">
                        <a-col :span="12">
                            <TeamDailySummaryTable :rows="teamDailyRows" :loading="loading" />
                        </a-col>
                        <a-col :span="12">
                            <TeamLayoutSummaryTable :rows="teamLayoutRows" :loading="loading" />
                        </a-col>
                    </a-row>
                </a-card>
            </a-col>

            <!-- (Tắt biểu đồ) -->
            <a-col :span="24" class="mt-4" v-if="chartRows.length">
                <a-card title="Biểu đồ" :bordered="true">
                    <ChartTabs :rows="chartRows" />
                </a-card>
            </a-col>
        </a-row>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'

import productionApi from '@/plugins/productionApi'
import { standardDailyProductivityApi } from '@/services/production_service/standardDailyProductivityService'
import { layoutStandardProductivityApi } from '@/services/production_service/layoutStandardProductivityService'
import { workshopApi } from '@/services/production_service/workshopService'
import { teamApi } from '@/services/production_service/teamService'

import ReportToolbar from './components/ReportToolbar.vue'
import ProductivityReportTable from './components/ProductivityReportTable.vue'
import TeamTotalsTable from './components/TeamTotalsTable.vue'
import TeamDailySummaryTable from './components/TeamDailySummaryTable.vue'
import TeamLayoutSummaryTable from './components/TeamLayoutSummaryTable.vue'
import ChartTabs from './components/ChartTabs.vue'

/* ====== state ====== */
const reportType = ref('nang-suat')
const loading = ref(false)
/** HỖ TRỢ KHOẢNG NGÀY: dùng cả dateFrom & dateTo */
const dateFrom = ref('')
const dateTo = ref('')

const search = ref('')
const searchWorkshopId = ref(null)
const searchTeamId = ref(null)

const pageSize = ref(10)
const current = ref(1)

/* ====== master & map ====== */
const workshops = ref([])
const teams = ref([])
const workshopMap = ref(new Map())
const teamMap = ref(new Map())

async function fetchMaster() {
    try {
        const [wsRes, tsRes] = await Promise.all([
            (async () => { try { return await (workshopApi.listAll?.() ?? (await workshopApi.list()).data) } catch { return (await workshopApi.list()).data } })(),
            (async () => { try { return await (teamApi.listAll?.() ?? (await teamApi.list()).data) } catch { return (await teamApi.list()).data } })(),
        ])
        const ws = Array.isArray(wsRes) ? wsRes : []
        const ts = Array.isArray(tsRes) ? tsRes : []

        workshops.value = ws
        teams.value = ts

        workshopMap.value = new Map(ws.map(w => [Number(w.id), w.name]))
        teamMap.value = new Map(ts.map(t => [Number(t.id), t.name]))
    } catch (e) {
        console.error(e)
        message.error('Không tải được danh mục xưởng/tổ.')
    }
}

/* ====== hiển thị khoảng ngày ====== */
const numDaysInRange = computed(() => {
    if (!dateFrom.value || !dateTo.value) return 0
    const a = dayjs(dateFrom.value)
    const b = dayjs(dateTo.value)
    if (!a.isValid() || !b.isValid()) return 0
    return Math.abs(b.startOf('day').diff(a.startOf('day'), 'day')) + 1
})

const selectedRangeText = computed(() => {
    if (!dateFrom.value || !dateTo.value) return ''
    const a = dayjs(dateFrom.value), b = dayjs(dateTo.value)
    if (!a.isValid() || !b.isValid()) return ''
    const aStr = a.format('DD/MM/YYYY')
    const bStr = b.format('DD/MM/YYYY')
    const days = numDaysInRange.value
    return aStr === bStr ? `${aStr} (1 ngày)` : `${aStr} – ${bStr} (${days} ngày)`
})

/* ====== gọi API entries ====== */
async function fetchProductivityEntries(params) {
    // Backend hỗ trợ: date_from, date_to, workshop_id, team_id, order_no, item_code
    const { data } = await productionApi.get('/productivity-entries', { params })
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
}

/* ====== helper ngày có dữ liệu ====== */
function normalizeEntryDate(entry) {
    const raw =
        entry?.work_date ??
        entry?.working_date ??
        entry?.entry_date ??
        entry?.production_date ??
        entry?.report_date ??
        entry?.date ??
        entry?.created_at ??
        null

    if (!raw) return null

    const d = dayjs(raw)
    if (!d.isValid()) return null

    return d.format('YYYY-MM-DD')
}

function buildDataDaysMap(entries = []) {
    const map = new Map()

    for (const e of entries) {
        const wid = Number(e?.workshop_id ?? 0)
        const tid = Number(e?.team_id ?? 0)
        if (!wid || !tid) continue

        const entryDate = normalizeEntryDate(e)
        if (!entryDate) continue

        const key = `${wid}::${tid}`
        if (!map.has(key)) {
            map.set(key, new Set())
        }
        map.get(key).add(entryDate)
    }

    const out = new Map()
    for (const [key, dateSet] of map.entries()) {
        out.set(key, dateSet.size)
    }
    return out
}

/* ====== nhóm theo (workshop_id, team_id, item_code) ====== */
function groupByWTT(entries = []) {
    const map = new Map()
    for (const e of entries) {
        const wid = Number(e.workshop_id ?? 0)
        const tid = Number(e.team_id ?? 0)
        const code = e.item_code || ''
        if (!code) continue

        const key = `${wid}::${tid}::${code}`
        if (!map.has(key)) {
            map.set(key, {
                key,
                workshop_id: wid,
                team_id: tid,
                workshop_name: '',
                team_name: '',
                item_code: code,

                total_qty_actual: 0,

                // đọc trực tiếp từ DB
                slsp_nang_suat: 0,
                slsp_layout: 0,

                _std_any: false,
                _layout_any: false,
            })
        }
        const it = map.get(key)

        // cộng số lượng thực tế
        it.total_qty_actual += Number(e.qty_actual ?? 0)

        // cộng 2 cột đã lưu trong DB (bỏ qua null)
        const std = e.qty_standard_product
        if (std != null && Number.isFinite(Number(std))) {
            it._std_any = true
            it.slsp_nang_suat += Number(std)
        }
        const layout = e.qty_layout_output
        if (layout != null && Number.isFinite(Number(layout))) {
            it._layout_any = true
            it.slsp_layout += Number(layout)
        }
    }

    // gán tên + note
    for (const r of map.values()) {
        r.workshop_name = workshopMap.value.get(r.workshop_id) ?? String(r.workshop_id || '')
        r.team_name = teamMap.value.get(r.team_id) ?? String(r.team_id || '')

        if (!r._std_any) {
            r.slsp_nang_suat = null
            r.slsp_nang_suat_note = 'SLSP theo năng suất (DB) chưa có dữ liệu'
        } else {
            r.slsp_nang_suat_note = null
        }

        if (!r._layout_any) {
            r.slsp_layout = null
            r.slsp_layout_note = 'SLSP theo layout (DB) chưa có dữ liệu'
        } else {
            r.slsp_layout_note = null
        }

        delete r._std_any
        delete r._layout_any
    }

    return Array.from(map.values())
}

/* ====== data chi tiết ====== */
const reportRows = ref([])

/* ====== map năng suất chuẩn để chia (theo team) ====== */
const stdDailyMap = ref(new Map())   // team_id -> std_qty (chuẩn/ngày)
const stdLayoutMap = ref(new Map())  // team_id -> layout_std_qty (chuẩn/ngày)
const dataDaysMap = ref(new Map())   // workshop_id::team_id -> số ngày có dữ liệu

async function buildReport() {
    if (!dateFrom.value || !dateTo.value) return
    loading.value = true
    try {
        // Filter đưa về BE: KHOẢNG NGÀY
        const params = {
            date_from: dateFrom.value,
            date_to: dateTo.value,
            workshop_id: searchWorkshopId.value || undefined,
            team_id: searchTeamId.value || undefined,
            item_code: (search.value || '').trim() || undefined,
        }

        const [entries, stdDaily, stdLayout] = await Promise.all([
            fetchProductivityEntries(params),
            standardDailyProductivityApi.listAll().catch(() => []),
            layoutStandardProductivityApi.listAll().catch(() => []),
        ])

        // map chuẩn theo team (đơn vị: /ngày)
        stdDailyMap.value = new Map((stdDaily || []).map(r => [Number(r.team_id), Number(r.std_qty ?? null)]))
        stdLayoutMap.value = new Map((stdLayout || []).map(r => [Number(r.team_id), Number(r.layout_std_qty ?? null)]))

        // số ngày có dữ liệu thực tế theo từng tổ/xưởng
        dataDaysMap.value = buildDataDaysMap(entries)

        // nhóm + cộng từ DB
        reportRows.value = groupByWTT(entries)

        // reset trang
        current.value = 1
    } catch (e) {
        console.error(e)
        message.error('Không tải được dữ liệu báo cáo.')
    } finally {
        loading.value = false
    }
}

/* ====== filter client-side cho bảng chi tiết ====== */
const filteredRows = computed(() => {
    const q = search.value.trim().toLowerCase()
    const out = reportRows.value.filter(r => {
        if (q) {
            const pool = [String(r.item_code), String(r.workshop_name), String(r.team_name)].join(' ').toLowerCase()
            if (!pool.includes(q)) return false
        }
        if (searchWorkshopId.value && Number(r.workshop_id) !== Number(searchWorkshopId.value)) return false
        if (searchTeamId.value && Number(r.team_id) !== Number(searchTeamId.value)) return false
        return true
    })
    current.value = 1
    return out
})

/* ====== TỔNG HỢP THEO TỔ ====== */
const teamTotalsRows = computed(() => {
    const map = new Map()
    for (const r of filteredRows.value) {
        const key = `${r.workshop_id}::${r.team_id}`
        if (!map.has(key)) {
            map.set(key, {
                key,
                workshop_id: r.workshop_id,
                team_id: r.team_id,
                workshop_name: r.workshop_name,
                team_name: r.team_name,
                item_count: 0,
                total_qty_actual: 0,
                total_slsp_nang_suat: 0,
                total_slsp_layout: 0,
                missing_nang_suat_count: 0,
                missing_layout_count: 0,
            })
        }
        const it = map.get(key)
        it.item_count += 1
        it.total_qty_actual += Number(r.total_qty_actual || 0)

        if (r.slsp_nang_suat != null && !Number.isNaN(Number(r.slsp_nang_suat))) {
            it.total_slsp_nang_suat += Number(r.slsp_nang_suat)
        } else if (r.slsp_nang_suat_note) {
            it.missing_nang_suat_count += 1
        }

        if (r.slsp_layout != null && !Number.isNaN(Number(r.slsp_layout))) {
            it.total_slsp_layout += Number(r.slsp_layout)
        } else if (r.slsp_layout_note) {
            it.missing_layout_count += 1
        }
    }

    return Array.from(map.values()).sort((a, b) => {
        if (a.workshop_name === b.workshop_name) {
            return String(a.team_name).localeCompare(String(b.team_name))
        }
        return String(a.workshop_name).localeCompare(String(b.workshop_name))
    })
})

/* ====== Hai bảng tổng: % = Tổng / (NS chuẩn/ngày * số ngày có dữ liệu của từng tổ/xưởng) ====== */
const teamDailyRows = computed(() => {
    return teamTotalsRows.value.map(x => {
        const dataDays = dataDaysMap.value.get(`${x.workshop_id}::${x.team_id}`) ?? 0
        const nsNgay = stdDailyMap.value.get(Number(x.team_id)) ?? null
        const total = x.total_slsp_nang_suat ?? null
        const nsKhoang = (nsNgay != null && Number.isFinite(Number(nsNgay)) && dataDays > 0)
            ? Number(nsNgay) * dataDays
            : null
        const ratioPct = (nsKhoang && total != null && Number(nsKhoang) !== 0)
            ? (Number(total) / Number(nsKhoang)) * 100
            : null

        return {
            workshop_id: x.workshop_id,
            workshop_name: x.workshop_name,
            team_id: x.team_id,
            team_label: x.team_name,
            data_days: dataDays,
            tong_slsp_nang_suat: total,
            ns_chuan_ngay: nsKhoang,
            ty_le_pct: ratioPct,
        }
    })
})

const teamLayoutRows = computed(() => {
    return teamTotalsRows.value.map(x => {
        const dataDays = dataDaysMap.value.get(`${x.workshop_id}::${x.team_id}`) ?? 0
        const nsLayout = stdLayoutMap.value.get(Number(x.team_id)) ?? null
        const total = x.total_slsp_layout ?? null
        const nsKhoang = (nsLayout != null && Number.isFinite(Number(nsLayout)) && dataDays > 0)
            ? Number(nsLayout) * dataDays
            : null
        const ratioPct = (nsKhoang && total != null && Number(nsKhoang) !== 0)
            ? (Number(total) / Number(nsKhoang)) * 100
            : null

        return {
            workshop_id: x.workshop_id,
            workshop_name: x.workshop_name,
            team_id: x.team_id,
            team_label: x.team_name,
            data_days: dataDays,
            tong_slsp_layout: total,
            ns_chuan_layout: nsKhoang,
            ty_le_pct: ratioPct,
        }
    })
})

/* ====== biểu đồ (tắt) ====== */
const chartRows = computed(() => [])

/* ====== handlers ====== */
function onSubmitRange({ dateFrom: df, dateTo: dt }) {
    dateFrom.value = df
    dateTo.value = dt
    buildReport()
}
function reload() { buildReport() }

/* ====== lifecycle ====== */
onMounted(async () => {
    await fetchMaster()
})
</script>

<style scoped>
.p-4 {
    padding: 16px;
}

.mb-4 {
    margin-bottom: 16px;
}

.mb-3 {
    margin-bottom: 12px;
}

.mt-4 {
    margin-top: 16px;
}

.flex {
    display: flex;
}

.items-center {
    align-items: center;
}

.justify-between {
    justify-content: space-between;
}

.ml-2 {
    margin-left: 8px;
}

.text-muted {
    color: #8c8c8c;
}
</style>
