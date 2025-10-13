<template>
    <div class="p-4">
        <h2 style="margin:0">Thống kê lỗi</h2>

        <a-card class="mb-4">
            <ErrorPieToolbar :loading="loading" :workshops="workshops" v-model:workshopId="workshopId"
                v-model:dateFrom="dateFrom" v-model:dateTo="dateTo" @submit="runReport" @reset="onReset" />

            <!-- Chọn biểu đồ -->
            <div style="margin-top: 30px;display:flex; gap:16px; align-items:center; flex-wrap:wrap">
                <a-checkbox v-model:checked="showAll">Chọn tất cả</a-checkbox>
                <a-checkbox :checked="selected.includes('pie')" @change="() => toggle('pie')">
                    Tỷ lệ lỗi theo công đoạn (tròn)
                </a-checkbox>
                <a-checkbox :checked="selected.includes('bar')" @change="() => toggle('bar')">
                    Dạng lỗi theo tổ (cột)
                </a-checkbox>
                <a-checkbox :checked="selected.includes('rate')" @change="() => toggle('rate')">
                    Tỷ lệ lỗi / số lượng thực tế (tròn)
                </a-checkbox>
                <a-checkbox :checked="selected.includes('cancel')" @change="() => toggle('cancel')">
                    Biểu đồ thể hiện hàng hủy của các tổ (cột)
                </a-checkbox>
            </div>
        </a-card>

        <a-card>
            <div class="mb-3">
                <strong>Khoảng ngày: </strong>
                <span v-if="dateFrom && dateTo">{{ fmtDmy(dateFrom) }} → {{ fmtDmy(dateTo) }}</span>
                <span v-else>Chưa chọn</span>
                <span v-if="workshopName" class="ml-2 text-muted">• Xưởng: {{ workshopName }}</span>
            </div>

            <a-empty v-if="!hasData && !loading" description="Chưa có dữ liệu" />

            <div v-else class="chart-stack">
                <!-- Chart 1 -->
                <StageErrorRatePie v-if="selected.includes('pie')"
                    :key="`stagepie-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :workshop-id="workshopId" :visible="selected.includes('pie')"
                    :height="chartHeight" />

                <a-divider
                    v-if="selected.includes('pie') && (selected.includes('bar') || selected.includes('rate') || selected.includes('cancel'))"
                    dashed />

                <!-- Chart 2: Dạng lỗi giữa các tổ (stacked % theo actual) -->
                <TeamErrorCodeBar v-if="selected.includes('bar')"
                    :key="`bar-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :visible="selected.includes('bar')" :height="chartHeight"
                    :top-n="10" sort-by="rate" :max-types="6"
                    title="TỶ LỆ (%) CÁC DẠNG LỖI / SẢN PHẨM THỰC TẾ THEO TỔ" />

                <a-divider v-if="selected.includes('bar') && (selected.includes('rate') || selected.includes('cancel'))"
                    dashed />

                <!-- Chart 3 -->
                <TeamErrorRatePie v-if="selected.includes('rate')"
                    :key="`rate-${workshopId}-${dateFrom}-${dateTo}-${rateRows.length}-${selected.length}`"
                    :data="rateRows" :visible="selected.includes('rate')" :height="chartHeight" />

                <a-divider v-if="selected.includes('rate') && selected.includes('cancel')" dashed />

                <!-- Chart 4 -->
                <TeamCancelledOrdersBar v-if="selected.includes('cancel')"
                    :key="`cancel-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :visible="selected.includes('cancel')" :height="chartHeight"
                    :top-n="12" />
            </div>
        </a-card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import ErrorPieToolbar from './components/ErrorPieToolbar.vue'
import StageErrorRatePie from './components/StageErrorRatePie.vue'
import TeamErrorCodeBar from './components/TeamErrorCodeBar.vue'
import TeamErrorRatePie from './components/TeamErrorRatePie.vue'
import TeamCancelledOrdersBar from './components/TeamCancelledOrdersBar.vue'
import { workshopApi } from '@/services/production_service/workshopService'
import { dataErrorApi } from '@/services/production_service/dataErrorService'
import { productivityEntryApi } from '@/services/production_service/productivityEntryService'

/* state */
const workshops = ref([])
const loading = ref(false)
const workshopId = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)

const chartRows = ref([])   // pie: tổng lỗi theo tổ
const rawRows = ref([])     // bar: raw lỗi
const rateRows = ref([])    // rate: { name, value, errors, actual }
const actualRows = ref([])  // ✅ entries năng suất theo tổ

/* chọn biểu đồ */
const selected = ref(['pie', 'bar', 'rate', 'cancel'])
const showAll = computed({
    get: () => selected.value.length === 4,
    set: v => { selected.value = v ? ['pie', 'bar', 'rate', 'cancel'] : [] }
})
const toggle = (t) => {
    const s = new Set(selected.value)
    if (s.has(t)) s.delete(t); else s.add(t)
    selected.value = Array.from(s)
}
const toggleAll = () => { showAll.value = !showAll.value }

/* layout */
const chartHeight = computed(() => {
    if (selected.value.length === 1) return '560px'
    if (selected.value.length === 2) return '420px'
    return '360px'
})
const hasData = computed(() =>
    (selected.value.includes('pie') && chartRows.value.length) ||
    (selected.value.includes('bar') && rawRows.value.length) ||
    (selected.value.includes('rate') && rateRows.value.length) ||
    (selected.value.includes('cancel') && rawRows.value.some(r => r?.is_scrapped))
)

/* helpers */
const fmtDmy = s => dayjs(String(s)).isValid() ? dayjs(String(s)).format('DD/MM/YYYY') : ''
const workshopName = computed(() => {
    const w = workshops.value.find(x => Number(x.id) === Number(workshopId.value))
    return w ? w.name : ''
})

/* masters */
async function loadWorkshops() {
    const list = await workshopApi.listAll()
    workshops.value = Array.isArray(list) ? list : []
}

/* validate */
function validateInputs() {
    if (!workshopId.value) { message.error('Vui lòng chọn Xưởng.'); return false }
    if (!dateFrom.value || !dateTo.value) { message.error('Vui lòng chọn khoảng ngày.'); return false }
    if (String(dateFrom.value) > String(dateTo.value)) { message.error('Khoảng ngày không hợp lệ.'); return false }
    if (selected.value.length === 0) { message.error('Vui lòng chọn ít nhất một biểu đồ.'); return false }
    return true
}

/* chạy báo cáo */
async function runReport() {
    if (!validateInputs()) return
    loading.value = true
    try {
        // 1) Lấy lỗi & entries
        const [errRes, peRows] = await Promise.all([
            dataErrorApi.list({
                workshop_id: workshopId.value,
                date_from: dateFrom.value,
                date_to: dateTo.value,
                per_page: -1,
                _ts: Date.now(),
            }),
            productivityEntryApi.listAll({
                workshop_id: workshopId.value,
                date_from: dateFrom.value,
                date_to: dateTo.value,
            }),
        ])

        const errRows = Array.isArray(errRes?.data) ? errRes.data
            : (Array.isArray(errRes?.data?.data) ? errRes.data.data : [])

        // Lưu raw cho BAR
        rawRows.value = errRows
        actualRows.value = Array.isArray(peRows) ? peRows : []  // ✅ gán entries

        // 2) Gom cho PIE (tổng lỗi theo tổ)
        const byTeamErr = new Map()
        for (const r of errRows) {
            const tid = Number(r.team_id || 0)
            const name = r?.team?.name ? r.team.name : (tid ? `Tổ ${tid}` : 'Không rõ tổ')
            const val = Number(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0)
            if (!byTeamErr.has(tid)) byTeamErr.set(tid, { name, value: 0 })
            byTeamErr.get(tid).value += (Number.isFinite(val) ? val : 0)
        }
        chartRows.value = Array.from(byTeamErr.values())
            .filter(x => x.value > 0)
            .sort((a, b) => b.value - a.value)

        // 3) Gom năng suất theo tổ (qty_actual)
        const byTeamActual = new Map()
        for (const p of peRows || []) {
            const tid = Number(p.team_id || 0)
            byTeamActual.set(tid, (byTeamActual.get(tid) || 0) + Number(p.qty_actual || 0))
        }

        // 4) Tính rate = tổng lỗi / tổng actual * 100
        const rateArr = []
        for (const [tid, e] of byTeamErr.entries()) {
            const actual = byTeamActual.get(tid) || 0
            if (actual <= 0) continue
            const rate = (e.value / actual) * 100
            if (rate <= 0) continue
            rateArr.push({ name: e.name, value: Number(rate.toFixed(2)), errors: e.value, actual })
        }
        rateArr.sort((a, b) => b.value - a.value)
        rateRows.value = rateArr

        if (!errRows.length) message.info('Không có dữ liệu lỗi trong khoảng đã chọn.')
    } catch (e) {
        console.error(e)
        message.error('Không tải được dữ liệu báo cáo.')
    } finally {
        loading.value = false
    }
}

function onReset() {
    workshopId.value = null
    dateFrom.value = null
    dateTo.value = null
    chartRows.value = []
    rawRows.value = []
    rateRows.value = []
    actualRows.value = []   // ✅ reset luôn
    selected.value = ['pie', 'bar', 'rate']
}

onMounted(loadWorkshops)
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

.ml-2 {
    margin-left: 8px;
}

.text-muted {
    color: #8c8c8c;
}

.chart-grid.one {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}

.chart-grid.two-or-more {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
}
</style>
