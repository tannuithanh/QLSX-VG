<template>
    <div :style="{ width: '100%', height: heightStyle }" ref="chartEl"></div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
    /** Rows data-errors đã lọc theo xưởng/ngày */
    rows: { type: Array, default: () => [] },
    /** Chiều cao biểu đồ */
    height: { type: [Number, String], default: 420 },
    /** Cho phép ẩn/hiện (dùng để tránh init khi chưa cần) */
    visible: { type: Boolean, default: true },
    /** Hiển thị top N tổ (null/0 = tất cả) */
    topN: { type: [Number, null], default: null },
    /** Tiêu đề */
    title: { type: String, default: 'BIỂU ĐỒ SO SÁNH ĐƠN HÀNG HỦY GIỮA CÁC TỔ' },
})

const heightStyle = computed(() => (typeof props.height === 'number' ? `${props.height}px` : String(props.height)))
const chartEl = ref(null)
let chart = null

const isTrue = v => v === true || v === 1 || String(v).toLowerCase() === 'true'

/** Gộp theo tổ, đếm đơn hủy duy nhất (key = order_no + item_code) */
const seriesData = computed(() => {
    const setsByTeam = new Map() // team_id -> Set(keys)
    const nameByTeam = new Map()

    for (const r of props.rows || []) {
        if (!isTrue(r?.is_scrapped)) continue
        const tid = Number(r.team_id || 0)
        if (!tid) continue

        // << đổi khóa gộp tại đây nếu cần >>
        const key = `${String(r.order_no ?? '').trim()}__${String(r.item_code ?? '').trim()}`

        if (!setsByTeam.has(tid)) setsByTeam.set(tid, new Set())
        setsByTeam.get(tid).add(key)

        const label = r?.team?.name
            ? `${r.team.name}${r.team.code ? ` (${r.team.code})` : ''}`
            : `Tổ ${tid}`
        nameByTeam.set(tid, label)
    }

    const arr = Array.from(setsByTeam.entries()).map(([tid, s]) => ({
        team_id: tid,
        name: nameByTeam.get(tid) || `Tổ ${tid}`,
        value: s.size,
    }))

    // bỏ 0, sort desc, cắt topN
    const filtered = arr.filter(x => x.value > 0).sort((a, b) => b.value - a.value)
    if (props.topN && props.topN > 0) return filtered.slice(0, props.topN)
    return filtered
})

function ensureChart() {
    if (!chart && chartEl.value) {
        chart = echarts.init(chartEl.value)
        window.addEventListener('resize', handleResize)
    }
}
function handleResize() { chart && chart.resize() }

function render() {
    nextTick(() => {
        if (!props.visible) return
        ensureChart()
        if (!chart) return

        // Lấy font từ AntD hoặc fallback
        const root = chart.getDom()
        const cs = getComputedStyle(root)
        const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
        const FONT_STACK =
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
        const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

        const names = seriesData.value.map(d => d.name)
        const values = seriesData.value.map(d => d.value)

        const option = {
            textStyle: { fontFamily },

            title: {
                text: props.title,
                left: 'center',
                top: 6,
                textStyle: { ffontSize: 20, fontWeight: 700, fontFamily },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                textStyle: { fontFamily },
                formatter: params => {
                    const p = params?.[0]
                    return `<b>${p?.name || ''}</b><br/>Đơn hàng hủy: ${p?.value ?? 0}`
                }
            },
            grid: { left: 40, right: 20, top: 48, bottom: 60 },
            xAxis: {
                type: 'category',
                data: names,
                axisLabel: {
                    interval: 0,
                    rotate: names.length > 6 ? 20 : 0,
                    fontFamily
                }
            },
            yAxis: {
                type: 'value',
                name: 'Đơn hủy',
                minInterval: 1,
                axisLabel: { fontFamily },
                nameTextStyle: { fontFamily }
            },
            series: [{
                type: 'bar',
                data: values,
                barMaxWidth: 42,
                label: { show: true, position: 'top', fontFamily },
                itemStyle: { borderRadius: [6, 6, 0, 0] },
            }],
            animationDuration: 500,
        }

        chart.setOption(option, true)
        chart.resize()
    })
}


watch([seriesData, () => props.height, () => props.title, () => props.visible], render, { immediate: true })
onMounted(render)
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    if (chart) { chart.dispose(); chart = null }
})
</script>
