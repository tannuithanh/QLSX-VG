<template>
    <div class="rate-wrap" v-show="visible && hasData">
        <!-- Chart -->
        <div ref="chartEl" :style="{ width: '100%', height: heightStyle }"></div>

        <!-- Grand Total + công thức -->
        <div class="mt-3 grid gap-2">
            <a-card size="small" class="grand">
                <div class="grand-row">
                    <div class="grand-item">
                        <div class="lbl">Tổng lỗi</div>
                        <div class="val">{{ totalErrors }}</div>
                    </div>
                    <div class="grand-item">
                        <div class="lbl">Tổng sản phẩm</div>
                        <div class="val">{{ totalActual }}</div>
                    </div>
                    <div class="grand-item">
                        <div class="lbl">Tỷ lệ lỗi chung</div>
                        <div class="val">{{ overallRate.toFixed(2) }}%</div>
                    </div>
                </div>
            </a-card>
        </div>
    </div>

    <!-- Optional: khi không có dữ liệu -->
    <a-empty v-if="visible && !hasData" description="Chưa có dữ liệu phù hợp" />
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
    data: { type: Array, default: () => [] },
    errors: { type: Array, default: () => [] },
    entries: { type: Array, default: () => [] },
    teamNameById: { type: Object, default: () => ({}) },

    height: { type: [String, Number], default: 360 },
    title: { type: String, default: 'TỶ LỆ LỖI / SỐ LƯỢNG THỰC TẾ THEO TỔ' },
    percentDigits: { type: Number, default: 2 },
    isMobile: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
})

/* ---------- helpers ---------- */
const heightStyle = computed(() => (typeof props.height === 'number' ? `${props.height}px` : String(props.height)))
const chartEl = ref(null)
let chart = null

function nameOfTeam(id, fallback = '') {
    if (!id) return 'Không rõ tổ'
    const byMap = props.teamNameById?.[id]
    if (byMap) return byMap
    const r = props.errors.find(x => Number(x.team_id) === Number(id))
    if (r?.team?.name) return r.team.name
    return fallback || `Tổ ${id}`
}

/* ----- chuẩn hóa input thành cùng 1 format {name, value, errors, actual} ----- */
const fromPrepared = computed(() => {
    const arr = (props.data || []).filter(x => Number(x.actual) > 0 && Number(x.value) > 0)
    arr.sort((a, b) => Number(b.value) - Number(a.value))
    return arr
})

const fromRaw = computed(() => {
    // sum lỗi theo team
    const errByTeam = new Map()
    for (const r of props.errors) {
        const tid = Number(r.team_id || 0)
        const val = Number(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0)
        if (!Number.isFinite(val)) continue
        errByTeam.set(tid, (errByTeam.get(tid) || 0) + val)
    }
    // sum actual theo team
    const actByTeam = new Map()
    for (const r of props.entries) {
        const tid = Number(r.team_id || 0)
        const val = Number(r.qty_actual ?? 0)
        if (!Number.isFinite(val)) continue
        actByTeam.set(tid, (actByTeam.get(tid) || 0) + val)
    }
    // build items
    const out = []
    const teamIds = new Set([...errByTeam.keys(), ...actByTeam.keys()])
    for (const tid of teamIds) {
        const errors = errByTeam.get(tid) || 0
        const actual = actByTeam.get(tid) || 0
        if (errors <= 0 || actual <= 0) continue
        out.push({
            name: nameOfTeam(tid),
            errors,
            actual,
            value: (errors / actual) * 100,
        })
    }
    out.sort((a, b) => b.value - a.value)
    return out
})

/* Nguồn dữ liệu ưu tiên: data (đã chuẩn bị sẵn) -> raw */
const seriesItems = computed(() => {
    const byData = fromPrepared.value
    return byData.length ? byData : fromRaw.value
})
const hasData = computed(() => seriesItems.value.length > 0)

/* Grand total (tổng lỗi, tổng SẢN PHẨM, % chung) */
const totalErrors = computed(() => {
    if ((props.data || []).length) {
        return props.data.reduce((s, x) => s + Number(x.errors || 0), 0)
    }
    const m = new Map()
    for (const r of props.errors) {
        const tid = Number(r.team_id || 0)
        const val = Number(String(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0).replace(/,/g, ''))
        if (!Number.isFinite(val)) continue
        m.set(tid, (m.get(tid) || 0) + val)
    }
    let sum = 0
    for (const v of m.values()) sum += v
    return sum
})

const totalActual = computed(() => {
    if ((props.data || []).length) {
        return props.data.reduce((s, x) => s + Number(x.actual || 0), 0)
    }
    const m = new Map()
    for (const r of props.entries) {
        const tid = Number(r.team_id || 0)
        const val = Number(String(r.qty_actual ?? 0).replace(/,/g, ''))
        if (!Number.isFinite(val)) continue
        m.set(tid, (m.get(tid) || 0) + val)
    }
    let sum = 0
    for (const v of m.values()) sum += v
    return sum
})

const overallRate = computed(() =>
    totalActual.value > 0 ? (totalErrors.value / totalActual.value) * 100 : 0
)



/* ---------- chart ---------- */
function ensureChart() {
    if (!chart && chartEl.value) {
        chart = echarts.init(chartEl.value)
        window.addEventListener('resize', handleResize)
    }
}
function handleResize() {
    chart && chart.resize()
}
function disposeChart() {
    if (chart) {
        window.removeEventListener('resize', handleResize)
        chart.dispose()
        chart = null
    }
}
function render() {
    nextTick(() => {
        if (!props.visible || !hasData.value) {
            disposeChart()
            return
        }
        ensureChart()
        if (!chart) return

        const root = chart.getDom()
        const cs = getComputedStyle(root)
        const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
        const FONT_STACK =
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
        const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

        const data = seriesItems.value.map(d => ({
            name: d.name,
            value: Number(d.value),
            _err: Number(d.errors || 0),
            _act: Number(d.actual || 0),
            _val: Number(d.value),
        }))

        chart.setOption({
            textStyle: { fontFamily },
            title: { 
                text: props.title, 
                left: 'center', 
                top: 6, 
                textStyle: { fontSize: props.isMobile ? 16 : 20, fontWeight: 700, fontFamily } 
            },
            tooltip: {
                trigger: 'item',
                confine: true,
                textStyle: { fontFamily, fontSize: props.isMobile ? 11 : 14 },
                formatter: (p) => {
                    const d = p.data || {}
                    return [
                        `<b>${p.name}</b>`,
                        `Tỷ lệ: ${d._val?.toFixed(props.percentDigits)}%`,
                        `Lỗi: ${d._err}`,
                        `Thực tế: ${d._act}`
                    ].join('<br/>')
                }
            },
            legend: { 
                type: 'scroll', 
                bottom: 8, 
                textStyle: { fontFamily, fontSize: props.isMobile ? 11 : 12 } 
            },
            series: [{
                type: 'pie',
                radius: props.isMobile ? ['30%', '60%'] : ['40%', '70%'],
                center: props.isMobile ? ['50%', '50%'] : ['50%', '52%'],
                avoidLabelOverlap: true,
                label: { 
                    show: true, 
                    formatter: ({ name, data }) => props.isMobile ? `${Number(data.value).toFixed(1)}%` : `${name}\n${Number(data.value).toFixed(2)}%`, 
                    fontFamily,
                    fontSize: props.isMobile ? 10 : 12
                },
                labelLine: { show: !props.isMobile, length: 12, length2: 10 },
                data,
            }],
        }, { notMerge: true })

        chart.resize()
    })
}

watch(
    [() => props.visible, seriesItems, () => props.height, () => props.title],
    render,
    { immediate: true }
)

onMounted(render)
onBeforeUnmount(disposeChart)
</script>

<style scoped>
.rate-wrap {
    width: 100%;
}

.grid {
    display: grid;
}

.gap-2 {
    gap: 8px;
}

.mt-3 {
    margin-top: 12px;
}

.grand {
    border-left: 4px solid #c06252;
    border-radius: 6px;
}
.grand .grand-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.grand .lbl {
    font-size: 12px;
    color: #666;
}

.grand .val {
    font-size: 18px;
    font-weight: 700;
}

@media (max-width: 768px) {
    .grand .grand-row {
        grid-template-columns: 1fr;
    }
}
</style>
