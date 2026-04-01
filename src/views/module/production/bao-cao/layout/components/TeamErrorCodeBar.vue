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
    /** Hàng lỗi (đã lọc) */
    rows: { type: Array, default: () => [] },
    /** Entries năng suất để tính actual theo tổ */
    entries: { type: Array, default: () => [] },
    /** Hiển thị tối đa bao nhiêu tổ */
    topN: { type: Number, default: 10 },
    /** Lấy Top bao nhiêu dạng lỗi, còn lại gộp "Khác" */
    maxTypes: { type: Number, default: 6 },
    /** Sắp xếp theo: 'rate' (tỷ lệ %) hoặc 'errors' (số lỗi) */
    sortBy: { type: String, default: 'rate' },
    visible: { type: Boolean, default: true },
    height: { type: String, default: '420px' },
    /** Tiêu đề */
    title: { type: String, default: 'TỶ LỆ (%) CÁC DẠNG LỖI / SẢN PHẨM THỰC TẾ THEO TỔ' },
    /** Số chữ số thập phân khi hiển thị % */
    percentDigits: { type: Number, default: 2 },
    /** Chế độ mobile */
    isMobile: { type: Boolean, default: false }
})

/** ===== Helpers ===== */
const tidyTeamLabel = (r, tid) =>
    r?.team?.name ? r.team.name : (tid ? `Tổ ${tid}` : 'Không rõ tổ')

/** gom errors theo tổ × dạng lỗi, và actual theo tổ */
const dataset = computed(() => {
    // teamId -> { name, totalErrors, perType: Map(typeName -> sumErrors) }
    const teams = new Map()
    const addErr = (tid, name, typeName, qty) => {
        if (!teams.has(tid)) teams.set(tid, { name, totalErrors: 0, perType: new Map() })
        const t = teams.get(tid)
        t.totalErrors += qty
        t.perType.set(typeName, (t.perType.get(typeName) || 0) + qty)
    }

    // 1) Lỗi
    for (const r of props.rows || []) {
        const tid = Number(r.team_id || 0)
        const tname = tidyTeamLabel(r, tid)
        const qty = Number(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0)
        if (!qty || !Number.isFinite(qty)) continue

        // gán theo 1–3 cột dạng lỗi (tên ưu tiên, thiếu tên thì lấy code)
        for (let i = 1; i <= 3; i++) {
            const nm = String(r[`error_type_${i}`] ?? '').trim()
            const cd = String(r[`error_code_${i}`] ?? '').trim()
            const label = nm || cd
            if (!label) continue
            addErr(tid, tname, label, qty)
        }
    }

    // 2) Actual theo tổ
    const actualByTeam = new Map()
    for (const p of props.entries || []) {
        const tid = Number(p.team_id || 0)
        const actual = Number(p.qty_actual ?? p.actual ?? 0)
        if (!tid || !Number.isFinite(actual) || actual <= 0) continue
        actualByTeam.set(tid, (actualByTeam.get(tid) || 0) + actual)

        // nếu team chưa từng xuất hiện ở lỗi (để vẫn hiện 0%), ghi tên luôn
        if (!teams.has(tid)) {
            const nm = tidyTeamLabel(p, tid)
            teams.set(tid, { name: nm, totalErrors: 0, perType: new Map() })
        }
    }

    // 3) Tính totalRate% theo tổ để sort/cắt topN
    const teamsArr = Array.from(teams.entries()).map(([tid, v]) => {
        const actual = Number(actualByTeam.get(tid) || 0)
        const totalRate = actual > 0 ? (v.totalErrors / actual) * 100 : 0
        return { tid, name: v.name, totalErrors: v.totalErrors, perType: v.perType, actual, totalRate }
    })

    // bỏ các tổ không có actual (không tính được %)
    const viable = teamsArr.filter(t => t.actual > 0)

    // sort
    viable.sort((a, b) => {
        if (props.sortBy === 'errors') return b.totalErrors - a.totalErrors
        return b.totalRate - a.totalRate
    })

    // lấy topN
    const topTeams = props.topN > 0 ? viable.slice(0, props.topN) : viable

    // 4) Lấy Top loại lỗi theo tổng lỗi (trên tập topTeams)
    const typeTotal = new Map()
    for (const t of topTeams) {
        for (const [typeName, val] of t.perType.entries()) {
            typeTotal.set(typeName, (typeTotal.get(typeName) || 0) + val)
        }
    }
    const allTypesSorted = Array.from(typeTotal.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    const topTypeNames = props.maxTypes > 0 ? allTypesSorted.slice(0, props.maxTypes) : allTypesSorted
    const hasOther = allTypesSorted.length > topTypeNames.length
    const OTHER_LABEL = 'Khác'

    // 5) Chuẩn bị trục & series (stack theo %)
    const yCats = topTeams.map(t => t.name) // y = tổ (ngang)
    const makeRowPercent = (t, typeName) => {
        const err = Number(t.perType.get(typeName) || 0)
        return (err / t.actual) * 100
    }

    // từng series cho từng loại lỗi trong top list
    const series = topTypeNames.map(typeName => ({
        name: typeName,
        type: 'bar',
        stack: 'pct',
        barWidth: props.isMobile ? 12 : 18,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        label: {
            show: true,
            position: 'insideRight',
            formatter: ({ value }) => (Number(value) >= 3 ? `${Number(value).toFixed(props.percentDigits)}%` : ''),
            fontSize: props.isMobile ? 9 : 11,
            padding: [0, 2]
        },
        data: topTeams.map(t => {
            const pct = makeRowPercent(t, typeName)
            return pct > 0 ? Number(pct.toFixed(props.percentDigits)) : 0
        })
    }))

    // gộp “Khác” nếu cần
    if (hasOther) {
        series.push({
            name: OTHER_LABEL,
            type: 'bar',
            stack: 'pct',
            barWidth: props.isMobile ? 12 : 18,
            itemStyle: { opacity: 0.8 },
            label: {
                show: true,
                position: 'insideRight',
                formatter: ({ value }) => (Number(value) >= 3 ? `${Number(value).toFixed(props.percentDigits)}%` : ''),
                fontSize: props.isMobile ? 9 : 11,
                padding: [0, 2]
            },
            data: topTeams.map(t => {
                let otherErr = 0
                for (const [typeName, v] of t.perType.entries()) {
                    if (!topTypeNames.includes(typeName)) otherErr += Number(v || 0)
                }
                const pct = (otherErr / t.actual) * 100
                return pct > 0 ? Number(pct.toFixed(props.percentDigits)) : 0
            })
        })
    }

    return { yCats, series, topTeams }
})

/** ===== ECharts lifecycle ===== */
const el = ref(null)
let chart = null
const ensure = () => { if (el.value && !chart) chart = echarts.init(el.value) }
const dispose = () => { if (chart) { chart.dispose(); chart = null } }

const render = () => {
    if (!props.visible) return
    ensure()
    if (!chart) return

    const { yCats, series, topTeams } = dataset.value

    // Font từ Ant Design (nếu có) hoặc fallback
    const root = chart.getDom()
    const cs = getComputedStyle(root)
    const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
    const FONT_STACK =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
    const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

    chart.setOption({
        textStyle: { fontFamily },
        title: {
            text: props.title,
            left: 'center',
            textStyle: { fontSize: props.isMobile ? 16 : 20, fontWeight: 700, fontFamily }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            confine: true,
            textStyle: { fontFamily, fontSize: props.isMobile ? 11 : 14 },
            formatter: params => {
                if (!Array.isArray(params) || !params.length) return ''
                const idx = params[0].dataIndex
                const team = topTeams[idx]
                const totalPct = params.reduce((s, p) => s + Number(p.value || 0), 0)
                const lines = []
                lines.push(`<b>${team?.name || ''}</b>`)
                lines.push(`Tổng: ${totalPct.toFixed(props.percentDigits)}%  •  Lỗi/Thực tế: ${team.totalErrors} / ${team.actual}`)
                params
                    .filter(p => Number(p.value) > 0)
                    .sort((a, b) => Number(b.value) - Number(a.value))
                    .forEach(p => {
                        const apprErr = Math.round((Number(p.value) / 100) * team.actual)
                        lines.push(`${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(props.percentDigits)}%  (~${apprErr})`)
                    })
                return lines.join('<br/>')
            }
        },
        legend: { 
            type: 'scroll', 
            top: props.isMobile ? 36 : 32, 
            textStyle: { fontFamily, fontSize: props.isMobile ? 10 : 12 } 
        },
        grid: { 
            left: props.isMobile ? 10 : 90, 
            right: 16, 
            top: props.isMobile ? 90 : 76, 
            bottom: props.isMobile ? 40 : 60, 
            containLabel: true 
        },
        xAxis: {
            type: 'value',
            name: '%',
            min: 0,
            max: 100,
            axisLabel: { formatter: v => `${v}%`, fontFamily, fontSize: props.isMobile ? 10 : 12 },
            nameTextStyle: { fontFamily }
        },
        yAxis: {
            type: 'category',
            data: yCats,
            axisLabel: { interval: 0, fontFamily, fontSize: props.isMobile ? 10 : 12 }
        },
        dataZoom: [
            { type: 'slider', yAxisIndex: 0, right: 0, width: props.isMobile ? 8 : 12 },
            { type: 'inside', yAxisIndex: 0 }
        ],
        color: ['#5B8FF9', '#61DDAA', '#65789B', '#F6BD16', '#7262fd', '#78D3F8', '#9661BC', '#F6903D', '#F08BB4', '#3BA272', '#4ecdc4', '#ff6b6b', '#ffd166', '#118ab2', '#8338ec'],
        series: Array.isArray(series)
            ? series.map(s => ({
                ...s,
                type: 'bar',
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
