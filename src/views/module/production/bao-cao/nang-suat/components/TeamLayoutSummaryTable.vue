<template>
    <div class="stack">
        <!-- Filters -->
        <div class="filters">
            <a-select v-model:value="workshopId" :options="workshopOptions" placeholder="Chọn xưởng" show-search
                :filter-option="filterOption" style="min-width: 220px" />
            <a-select v-model:value="teamId" :options="teamOptionsFiltered" placeholder="Chọn tổ" show-search
                :filter-option="filterOption" style="min-width: 260px" />
        </div>

        <!-- Biểu đồ cột + đường -->
        <div ref="barEl" class="chart"></div>

        <!-- Biểu đồ tròn KPI (so với 100%) -->
        <div ref="pieEl" class="pie"></div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, CanvasRenderer])

/**
 * rows: [{
 *  workshop_id, workshop_name,
 *  team_id, team_label,
 *  tong_slsp_layout,     // tổng SLSP (theo hệ số layout)
 *  ns_chuan_layout       // KPI layout
 * }]
 */
const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
})

const barEl = ref(null)
const pieEl = ref(null)
let barChart = null
let pieChart = null

/* ====== Selects: Workshop -> Team ====== */
const workshopOptions = computed(() => {
    const seen = new Map()
        ; (props.rows || []).forEach(r => {
            const id = r.workshop_id ?? r.workshop_name ?? '—'
            if (!seen.has(id)) seen.set(id, { value: r.workshop_id ?? id, label: r.workshop_name ?? String(id) })
        })
    return Array.from(seen.values())
})

const workshopId = ref(null)
watch(() => props.rows, (val) => {
    if (val?.length) {
        const exist = workshopOptions.value.find(o => String(o.value) === String(workshopId.value))
        if (!exist) workshopId.value = workshopOptions.value[0]?.value ?? null
    }
}, { immediate: true })

const teamOptionsFiltered = computed(() => {
    const ws = String(workshopId.value)
    return (props.rows || [])
        .filter(r => String(r.workshop_id ?? r.workshop_name ?? '') === ws)
        .map(r => ({ value: r.team_id, label: `${r.team_label}` }))
})

const teamId = ref(null)
watch([() => props.rows, workshopId], () => {
    if (!teamOptionsFiltered.value.length) { teamId.value = null; return }
    const exist = teamOptionsFiltered.value.find(o => String(o.value) === String(teamId.value))
    if (!exist) teamId.value = teamOptionsFiltered.value[0]?.value ?? null
}, { immediate: true })

const currentTeam = computed(() =>
    (props.rows || []).find(r =>
        String(r.workshop_id ?? r.workshop_name ?? '') === String(workshopId.value) &&
        String(r.team_id) === String(teamId.value)
    ) || null
)

function filterOption(input, option) {
    return String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

/* ====== Helpers ====== */
const toNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}
const fmt = (n, f = 2) => {
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return x.toLocaleString(undefined, { minimumFractionDigits: f, maximumFractionDigits: f })
}
const pct = (val) => (Number.isFinite(val) ? `${fmt(val, 2)}%` : '—')

/* ====== Data for charts ====== */
const seriesLayout = computed(() => {
    const cats = []
    const total = []
    const kpi = []
    const ratioPct = [] // %
    for (const r of (props.rows || [])) {
        cats.push(`${r.team_label ?? r.team_id}`)
        const t = toNum(r.tong_slsp_layout)
        const s = toNum(r.ns_chuan_layout)
        total.push(t || null)
        kpi.push(s || null)
        ratioPct.push(s > 0 ? (t / s) * 100 : null)
    }
    return { cats, total, kpi, ratioPct }
})

/* ====== Combo chart (bar + line, ratio %) ====== */
function comboOption() {
    const { cats, total, kpi, ratioPct } = seriesLayout.value
    return {
        tooltip: {
            trigger: 'axis',
            valueFormatter: (v, s) => (s?.seriesName?.includes('%') ? pct(v) : fmt(v, 4))
        },
        legend: { top: 0, data: ['Tổng SLSP layout', 'NS layout', 'Tỷ lệ (Tổng/KPI) %'] },
        grid: { left: 50, right: 60, bottom: 60, top: 40 },
        xAxis: { type: 'category', data: cats, axisLabel: { interval: 0, rotate: cats.length > 8 ? 35 : 0 } },
        yAxis: [
            { type: 'value', name: 'SLSP', axisLabel: { formatter: v => fmt(v, 0) } },
            { type: 'value', name: 'Tỷ lệ', axisLabel: { formatter: v => `${fmt(v, 0)}%` }, min: 0 }
        ],
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 10 }],
        series: [
            { name: 'Tổng SLSP layout', type: 'bar', data: total, barMaxWidth: 32, emphasis: { focus: 'series' } },
            { name: 'NS layout', type: 'bar', data: kpi, barMaxWidth: 32, emphasis: { focus: 'series' } },
            { name: 'Tỷ lệ (Tổng/KPI) %', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 6, data: ratioPct },
        ],
    }
}

/* ====== Pie cho team đang chọn ====== */
function pieOption() {
    const r = currentTeam.value
    const teamLabel = r
        ? `${r.workshop_name ?? ''} - ${r.team_label ?? r.team_id}`
        : 'Chưa có dữ liệu'
    const total = toNum(r?.tong_slsp_layout)
    const kpi = toNum(r?.ns_chuan_layout)

    if (kpi <= 0) {
        return {
            title: { text: teamLabel, left: 'center', top: 0, textStyle: { fontSize: 14, fontWeight: 600 } },
            legend: { bottom: 0, left: 'center' },
            series: [{ type: 'pie', radius: ['45%', '70%'], data: [{ value: 1, name: 'Không có dữ liệu' }] }],
            tooltip: { trigger: 'item' },
            graphic: [],
        }
    }

    // ratio thật (không giới hạn)
    const ratio = (total / kpi) * 100

    const achieved = Math.min(ratio, 100)   // đạt tối đa 100%
    const shortage = ratio < 100 ? 100 - ratio : 0
    const over = ratio > 100 ? ratio - 100 : 0

    return {
        title: {
            text: teamLabel,
            left: 'center',
            top: 0,
            textStyle: { fontSize: 14, fontWeight: 600 }
        },
        tooltip: { 
            trigger: 'item', 
            valueFormatter: v => `${v.toFixed(2)}%`   // làm tròn 2 số thập phân
        },
        legend: { bottom: 0, left: 'center' },
        series: [
            {
                type: 'pie',
                radius: ['45%', '70%'],
                center: ['50%', '50%'],
                // {c} là value, làm tròn 2 số thập phân
                label: { 
                    show: true, 
                    formatter: p => `${p.name}\n${p.value.toFixed(2)}%` 
                },
                data: [
                    { value: achieved, name: 'Đạt (%)' },
                    { value: shortage, name: 'Thiếu (%)' },
                    { value: over, name: 'Vượt (%)' },
                ],
            },
        ],
        graphic: [
            {
                type: 'text',
                left: 'center',
                top: '50%',
                style: {
                    text: `${ratio.toFixed(2)}%`,   // center text làm tròn
                    textAlign: 'center',
                    fill: '#333',
                    fontSize: 16,
                    fontWeight: 600
                }
            }
        ],
    }
}




/* ====== Render / Resize ====== */
function render() {
    if (barEl.value && !barChart) barChart = echarts.init(barEl.value)
    if (pieEl.value && !pieChart) pieChart = echarts.init(pieEl.value)
    barChart && barChart.setOption(comboOption())
    pieChart && pieChart.setOption(pieOption())
    barChart && barChart.resize()
    pieChart && pieChart.resize()
}
const onResize = () => { barChart?.resize(); pieChart?.resize() }

onMounted(async () => { await nextTick(); render(); window.addEventListener('resize', onResize) })
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); barChart?.dispose(); pieChart?.dispose(); barChart = null; pieChart = null })

watch(() => props.rows, () => { barChart ? barChart.setOption(comboOption(), true) : render() }, { deep: true })
watch([workshopId, teamId, () => props.rows], () => { pieChart ? pieChart.setOption(pieOption(), true) : render() }, { deep: true })
</script>

<style scoped>
.stack {
    display: grid;
    gap: 12px;
}

.filters {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.chart {
    width: 100%;
    height: 420px;
}

.pie {
    width: 100%;
    height: 340px;
}
</style>
