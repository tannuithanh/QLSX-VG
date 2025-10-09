<template>
    <div :style="{ width: '100%', height }" ref="el" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, CanvasRenderer])

const props = defineProps({
    rows: { type: Array, default: () => [] },
    topN: { type: Number, default: 10 },
    visible: { type: Boolean, default: true },
    height: { type: String, default: '420px' },
})

/* ===== Dataset: team X  error_type_name ===== */
const dataset = computed(() => {
    // teamId -> { name, total, perTypeName: Map(typeName -> sum) }
    const teams = new Map()

    const add = (tid, tname, typeName, qty) => {
        if (!teams.has(tid)) teams.set(tid, { name: tname, total: 0, perTypeName: new Map() })
        const t = teams.get(tid)
        t.total += qty
        t.perTypeName.set(typeName, (t.perTypeName.get(typeName) || 0) + qty)
    }

    for (const r of props.rows || []) {
        const tid = Number(r.team_id || 0)
        const tname = r?.team?.name ? `${r.team.name} (${r.team.code})` : (tid ? `Tổ ${tid}` : 'Không rõ tổ')
        const qty = Number(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0)
        if (!qty) continue

        for (let i = 1; i <= 3; i++) {
            const name = String(r[`error_type_${i}`] || '').trim()
            const code = String(r[`error_code_${i}`] || '').trim()
            const label = name || (code ? code : '')
            if (!label) continue
            add(tid, tname, label, qty)
        }
    }

    // Top N tổ theo tổng lỗi
    const arr = Array.from(teams.entries()).map(([tid, v]) => ({ tid, ...v })).sort((a, b) => b.total - a.total)
    const topTeams = arr.slice(0, props.topN)

    // Tổng theo từng loại lỗi -> loại series có tổng = 0
    const typeTotal = new Map()
    topTeams.forEach(t => t.perTypeName.forEach((v, k) => typeTotal.set(k, (typeTotal.get(k) || 0) + v)))
    const typeNames = Array.from(typeTotal.entries()).filter(([, sum]) => sum > 0).map(([n]) => n)

    const xCats = topTeams.map(t => t.name)
    const series = typeNames.map(name => ({
        name,
        type: 'bar',
        barWidth: 18,
        barGap: '15%',
        barCategoryGap: '35%',
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        emphasis: { focus: 'series' },
        label: {
            show: true,
            position: 'top',
            formatter: ({ value }) => (value > 0 ? value : ''),
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: '#fff',
            padding: [2, 4],
            borderRadius: 3,
            fontSize: 11
        },
        // đổi 0 -> null để không vẽ cột
        data: topTeams.map(t => {
            const v = t.perTypeName.get(name) || 0
            return v > 0 ? v : null
        }),
    }))

    return { xCats, series }
})

/* ===== ECharts lifecycle ===== */
const el = ref(null)
let chart = null
const ensure = () => { if (el.value && !chart) chart = echarts.init(el.value) }
const dispose = () => { if (chart) { chart.dispose(); chart = null } }

const render = () => {
    if (!props.visible) return
    ensure()
    if (!chart) return
    const { xCats, series } = dataset.value

    // Lấy font từ AntD hoặc fallback
    const root = chart.getDom()
    const cs = getComputedStyle(root)
    const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
    const FONT_STACK =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
    const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

    chart.setOption({
        // áp mặc định
        textStyle: { fontFamily },

        title: {
            text: 'BIỂU ĐỒ SO SÁNH DẠNG LỖI GIỮA CÁC TỔ',
            left: 'center',
            textStyle: { fontSize: 20, fontWeight: 700, fontFamily }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            textStyle: { fontFamily }
        },
        legend: { type: 'scroll', top: 26, textStyle: { fontFamily } },
        grid: { left: 10, right: 10, top: 80, bottom: 70, containLabel: true },
        xAxis: {
            type: 'category',
            data: xCats,
            axisTick: { alignWithLabel: true },
            axisLabel: { interval: 0, fontFamily }
        },
        yAxis: {
            type: 'value',
            name: 'Số lỗi',
            nameGap: 12,
            axisLabel: { fontFamily },
            nameTextStyle: { fontFamily }
        },
        dataZoom: [
            { type: 'slider', bottom: 18, height: 18, textStyle: { fontFamily } },
            { type: 'inside' }
        ],
        color: ['#5B8FF9', '#61DDAA', '#65789B', '#F6BD16', '#7262fd', '#78D3F8', '#9661BC', '#F6903D', '#F08BB4', '#3BA272', '#4ecdc4', '#ff6b6b', '#ffd166', '#118ab2', '#8338ec'],
        series: Array.isArray(series)
            ? series.map(s => ({
                ...s,
                // nhãn cột cũng theo font
                label: { ...(s.label || {}), fontFamily }
            }))
            : series
    }, { notMerge: true })

    chart.resize()
}


const onResize = () => { if (chart && props.visible) chart.resize() }

watch(dataset, async () => { await nextTick(); render() }, { deep: true })
watch(() => props.visible, async () => { await nextTick(); render() })

onMounted(() => { ensure(); render(); window.addEventListener('resize', onResize) })
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); dispose() })
</script>
