<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps({
    data: { type: Array, default: () => [] },    // [{name,value}]
    loading: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    height: { type: String, default: '360px' }
})

const el = ref(null)
let chart = null

function ensure() {
    if (!el.value) return
    if (!chart) chart = echarts.init(el.value)
}
function dispose() {
    if (chart) { chart.dispose(); chart = null }
}
function render() {
    if (!props.visible) return
    ensure()
    if (!chart) return

    // Lấy font từ AntD hoặc fallback
    const root = chart.getDom()
    const cs = getComputedStyle(root)
    const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
    const FONT_STACK =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
    const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

    chart.setOption({
        // Áp mặc định cho toàn bộ text
        textStyle: { fontFamily },

        title: {
            text: 'TỶ LỆ LỖI THEO TỔ',
            left: 'center',
            textStyle: { fontSize: 20, fontWeight: 700, fontFamily }
        },
        tooltip: {
            trigger: 'item',
            textStyle: { fontFamily },
            formatter: '{b}<br/>{c} ({d}%)'
        },
        legend: {
            bottom: 0,
            type: 'scroll',
            textStyle: { fontFamily }
        },
        series: [{
            name: 'Lỗi',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: true,
            data: props.data,
            label: { formatter: '{b}: {d}%', fontFamily },
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0 } }
        }]
    }, { notMerge: true })

    chart.resize()
}


function handleResize() { if (chart && props.visible) chart.resize() }

watch(() => props.data, async () => { await nextTick(); render() }, { deep: true })
watch(() => props.visible, async () => { await nextTick(); render() })

onMounted(() => {
    ensure(); render()
    window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    dispose()
})
</script>

<template>
    <div :style="{ width: '100%', height }" ref="el" />
</template>
