<template>
    <div class="p-4">
        <h2 style="margin:0">Thống kê lỗi</h2>

        <a-card class="mb-4" :bodyStyle="isMobile ? { padding: '12px' } : {}">
            <ErrorPieToolbar :loading="loading" :workshops="workshops" v-model:workshopId="workshopId"
                v-model:dateFrom="dateFrom" v-model:dateTo="dateTo" :isMobile="isMobile" @submit="runReport"
                @reset="onReset" />

            <div :class="['viz-picker', isMobile ? 'mobile-picker' : '']">
                <a-checkbox v-model:checked="showAll">Chọn tất cả</a-checkbox>
                <a-checkbox :checked="selected.includes('pie')" @change="() => toggle('pie')">Tỷ lệ lỗi công đoạn
                    (tròn)</a-checkbox>
                <a-checkbox :checked="selected.includes('bar')" @change="() => toggle('bar')">Dạng lỗi theo tổ
                    (cột)</a-checkbox>
                <a-checkbox :checked="selected.includes('rate')" @change="() => toggle('rate')">Tỷ lệ lỗi / Thực tế
                    (tròn)</a-checkbox>
                <a-checkbox :checked="selected.includes('cancel')" @change="() => toggle('cancel')">Hàng hủy các tổ
                    (cột)</a-checkbox>
                <a-checkbox :checked="selected.includes('item')" @change="() => toggle('item')">Tỷ lệ lỗi mã hàng
                    (bảng)</a-checkbox>
            </div>
        </a-card>

        <a-card :bodyStyle="isMobile ? { padding: '12px' } : {}">
            <div :class="['mb-3', isMobile ? 'mobile-range' : '']">
                <strong>Khoảng ngày: </strong>
                <span v-if="dateFrom && dateTo">{{ fmtDmy(dateFrom) }} → {{ fmtDmy(dateTo) }}</span>
                <span v-else>Chưa chọn</span>
                <span v-if="workshopName" class="ml-2 text-muted">• Xưởng: {{ workshopName }}</span>
            </div>

            <a-empty v-if="!hasData && !loading" description="Chưa có dữ liệu" />

            <div v-else class="chart-stack">
                <StageErrorRatePie v-if="selected.includes('pie')"
                    :key="`stagepie-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :workshop-id="workshopId" :visible="selected.includes('pie')"
                    :height="chartHeight" :isMobile="isMobile" />

                <a-divider
                    v-if="selected.includes('pie') && (selected.includes('bar') || selected.includes('rate') || selected.includes('cancel') || selected.includes('item'))"
                    dashed />

                <TeamErrorCodeBar v-if="selected.includes('bar')"
                    :key="`bar-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :visible="selected.includes('bar')" :height="chartHeight"
                    :top-n="isMobile ? 8 : 10" sort-by="rate" :max-types="isMobile ? 4 : 6" :isMobile="isMobile"
                    title="TỶ LỆ (%) CÁC DẠNG LỖI / SẢN PHẨM THỰC TẾ THEO TỔ" />

                <a-divider
                    v-if="selected.includes('bar') && (selected.includes('rate') || selected.includes('cancel') || selected.includes('item'))"
                    dashed />

                <TeamErrorRatePie v-if="selected.includes('rate')"
                    :key="`rate-${workshopId}-${dateFrom}-${dateTo}-${rateRows.length}-${selected.length}`"
                    :data="rateRows" :visible="selected.includes('rate')" :height="chartHeight" :isMobile="isMobile" />

                <a-divider
                    v-if="selected.includes('rate') && (selected.includes('cancel') || selected.includes('item'))"
                    dashed />

                <TeamCancelledOrdersBar v-if="selected.includes('cancel')"
                    :key="`cancel-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :visible="selected.includes('cancel')" :height="chartHeight"
                    :isMobile="isMobile" :top-n="isMobile ? 8 : 12" />

                <a-divider v-if="selected.includes('item') && (selected.length > 1)" dashed />

                <ItemErrorRateTable v-if="selected.includes('item')"
                    :key="`item-${workshopId}-${dateFrom}-${dateTo}-${rawRows.length}-${actualRows.length}-${selected.length}`"
                    :rows="rawRows" :entries="actualRows" :visible="selected.includes('item')" :percent-digits="2"
                    :isMobile="isMobile" />
            </div>
        </a-card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import ErrorPieToolbar from './components/ErrorPieToolbar.vue'
import StageErrorRatePie from './components/StageErrorRatePie.vue'
import TeamErrorCodeBar from './components/TeamErrorCodeBar.vue'
import TeamErrorRatePie from './components/TeamErrorRatePie.vue'
import TeamCancelledOrdersBar from './components/TeamCancelledOrdersBar.vue'
import ItemErrorRateTable from './components/ItemErrorRateTable.vue'
import { workshopApi } from '@/services/production_service/workshopService'
import { dataErrorApi } from '@/services/production_service/dataErrorService'
import { productivityEntryApi } from '@/services/production_service/productivityEntryService'

const workshops = ref([])
const loading = ref(false)
const workshopId = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)

const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth < 768 }

const chartRows = ref([])
const rawRows = ref([])
const rateRows = ref([])
const actualRows = ref([])

const selected = ref(['pie', 'bar', 'rate', 'cancel', 'item'])
const showAll = computed({
    get: () => selected.value.length === 5,
    set: v => { selected.value = v ? ['pie', 'bar', 'rate', 'cancel', 'item'] : [] }
})
const toggle = (t) => {
    const s = new Set(selected.value)
    if (s.has(t)) s.delete(t); else s.add(t)
    selected.value = Array.from(s)
}

const chartHeight = computed(() => {
    if (isMobile.value) return '480px' // Tăng chiều cao trên mobile cho biểu đồ tròn/cột
    if (selected.value.length === 1) return '560px'
    if (selected.value.length === 2) return '420px'
    return '360px'
})
const hasData = computed(() =>
    (selected.value.includes('pie') && chartRows.value.length) ||
    (selected.value.includes('bar') && rawRows.value.length) ||
    (selected.value.includes('rate') && rateRows.value.length) ||
    (selected.value.includes('cancel') && rawRows.value.some(r => r?.is_scrapped)) ||
    (selected.value.includes('item') && (rawRows.value.length || actualRows.value.length))
)

const fmtDmy = s => dayjs(String(s)).isValid() ? dayjs(String(s)).format('DD/MM/YYYY') : ''
const workshopName = computed(() => {
    const w = workshops.value.find(x => Number(x.id) === Number(workshopId.value))
    return w ? w.name : ''
})

async function loadWorkshops() {
    const list = await workshopApi.listAll()
    workshops.value = Array.isArray(list) ? list : []
}

function validateInputs() {
    if (!workshopId.value) { message.error('Vui lòng chọn Xưởng.'); return false }
    if (!dateFrom.value || !dateTo.value) { message.error('Vui lòng chọn khoảng ngày.'); return false }
    if (String(dateFrom.value) > String(dateTo.value)) { message.error('Khoảng ngày không hợp lệ.'); return false }
    if (selected.value.length === 0) { message.error('Vui lòng chọn ít nhất một biểu đồ.'); return false }
    return true
}

async function runReport() {
    if (!validateInputs()) return
    loading.value = true
    try {
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

        rawRows.value = errRows
        actualRows.value = Array.isArray(peRows) ? peRows : []

        const byTeamErr = new Map()
        for (const r of errRows) {
            const tid = Number(r.team_id || 0)
            const name = r?.team?.name ? r.team.name : (tid ? `Tổ ${tid}` : 'Không rõ tổ')
            const val = Number(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0)
            if (!byTeamErr.has(tid)) byTeamErr.set(tid, { name, value: 0 })
            byTeamErr.get(tid).value += (Number.isFinite(val) ? val : 0)
        }
        chartRows.value = Array.from(byTeamErr.values()).filter(x => x.value > 0).sort((a, b) => b.value - a.value)

        const byTeamActual = new Map()
        for (const p of actualRows.value) {
            const tid = Number(p.team_id || 0)
            byTeamActual.set(tid, (byTeamActual.get(tid) || 0) + Number(p.qty_actual || 0))
        }

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

        if (!errRows.length && !actualRows.value.length) message.info('Không có dữ liệu trong khoảng đã chọn.')
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
    actualRows.value = []
    selected.value = ['pie', 'bar', 'rate', 'cancel', 'item']
}

onMounted(() => {
    loadWorkshops()
    checkMobile()
    window.addEventListener('resize', checkMobile)
})
onBeforeUnmount(() => {
    window.removeEventListener('resize', checkMobile)
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

.ml-2 {
    margin-left: 8px;
}

.text-muted {
    color: #8c8c8c;
}

.viz-picker {
    margin-top: 30px;
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
}

.viz-picker.mobile-picker {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.viz-picker.mobile-picker :deep(.ant-checkbox-wrapper) {
    margin-left: 0;
    font-size: 13px;
}

.mobile-range {
    font-size: 13px;
    line-height: 1.6;
}

.chart-stack {
    display: block;
}
</style>
