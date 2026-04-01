<template>
    <div :style="{ width: '100%', height: heightStyle }" ref="chartEl"></div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
    /** Rows lỗi (đã lọc theo xưởng/ngày) – dùng để tính tổng hủy theo tổ */
    rows: { type: Array, default: () => [] },
    /** Entries năng suất – dùng để tính tổng actual theo tổ */
    entries: { type: Array, default: () => [] },
    /** Chiều cao biểu đồ */
    height: { type: [String, Number], default: 360 },
    /** Cho phép ẩn/hiện */
    visible: { type: Boolean, default: true },
    /** Hiển thị top N tổ (null/0 = tất cả) */
    topN: { type: Number, default: 12 },
    /** Tiêu đề */
    title: { type: String, default: 'TỶ LỆ (%) HỦY / TỔNG SỐ LƯỢNG THỰC TẾ CỦA TỔ' },
    /** Số chữ số thập phân phần trăm */
    percentDigits: { type: Number, default: 2 },
    /** Chế độ mobile */
    isMobile: { type: Boolean, default: false }
})

const heightStyle = computed(() => (typeof props.height === 'number' ? `${props.height}px` : String(props.height)))
const chartEl = ref(null)
let chart = null

const isTrue = v => v === true || v === 1 || String(v).toLowerCase() === 'true'

/** Gom theo tổ: sum hủy & sum actual → % hủy */
const seriesData = computed(() => {
    // 1) Tổng hủy theo tổ
    const scrapByTeam = new Map()  // team_id → số lượng hủy
    const nameByTeam = new Map()

    // Nếu có trường lượng hủy, ưu tiên cộng số lượng; nếu không, fallback: đếm distinct đơn (order_no+item_code)
    const distinctKeyByTeam = new Map() // team_id → Set(keys) (fallback)

    for (const r of props.rows || []) {
        if (!isTrue(r?.is_scrapped)) continue
        const tid = Number(r.team_id || 0)
        if (!tid) continue

        const qtyScrap = Number(
            r.scrap_qty ?? r.cancel_qty ?? r.canceled_qty ?? r.qty_error ?? r.error_qty ?? 0
        )

        if (Number.isFinite(qtyScrap) && qtyScrap > 0) {
            scrapByTeam.set(tid, (scrapByTeam.get(tid) || 0) + qtyScrap)
        } else {
            // fallback: đếm distinct đơn hủy
            const key = `${String(r.order_no ?? '').trim()}__${String(r.item_code ?? '').trim()}`
            if (!distinctKeyByTeam.has(tid)) distinctKeyByTeam.set(tid, new Set())
            distinctKeyByTeam.get(tid).add(key)
        }

        const label = r?.team?.name ? r.team.name : `Tổ ${tid}`
        nameByTeam.set(tid, label)
    }

    // Bổ sung fallback count nếu chưa có qty
    for (const [tid, setKeys] of distinctKeyByTeam.entries()) {
        if (!scrapByTeam.has(tid)) {
            scrapByTeam.set(tid, setKeys.size) // số đơn hủy (fallback)
        }
    }

    // 2) Tổng actual theo tổ
    const actualByTeam = new Map()
    for (const p of props.entries || []) {
        const tid = Number(p.team_id || 0)
        const actual = Number(p.qty_actual ?? p.actual ?? 0)
        if (!Number.isFinite(actual) || actual <= 0 || !tid) continue
        actualByTeam.set(tid, (actualByTeam.get(tid) || 0) + actual)
        // Tên tổ từ entries nếu rows chưa có
        if (!nameByTeam.has(tid)) {
            const label = p?.team?.name ? p.team.name : `Tổ ${tid}`
            nameByTeam.set(tid, label)
        }
    }

    // 3) Kết hợp → % hủy
    const out = []
    const teamIds = new Set([...scrapByTeam.keys(), ...actualByTeam.keys()])
    for (const tid of teamIds) {
        const scrap = Number(scrapByTeam.get(tid) || 0)
        const actual = Number(actualByTeam.get(tid) || 0)
        if (!actual || actual <= 0) continue
        const rate = (scrap / actual) * 100
        // Hiển thị cả 0% nếu muốn: hiện tại loại bỏ 0 để biểu đồ gọn
        if (rate < 0) continue
        out.push({
            team_id: tid,
            name: nameByTeam.get(tid) || `Tổ ${tid}`,
            value: Number(rate.toFixed(props.percentDigits)),
            _scrap: scrap,
            _actual: actual,
        })
    }

    // sort desc, cắt topN nếu có
    out.sort((a, b) => b.value - a.value)
    if (props.topN && props.topN > 0) return out.slice(0, props.topN)
    return out
})

function ensureChart() {
    if (!chart && chartEl.value) {
        chart = echarts.init(chartEl.value)
    }
}
function handleResize() { chart && chart.resize() }

function render() {
    nextTick(() => {
        if (!props.visible) return
        ensureChart()
        if (!chart) return

        // Font
        const root = chart.getDom()
        const cs = getComputedStyle(root)
        const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
        const FONT_STACK =
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
        const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

        const names = seriesData.value.map(d => d.name)
        const values = seriesData.value.map(d => d.value)

        chart.setOption({
            textStyle: { fontFamily },
            title: { 
                text: props.title, 
                left: 'center', 
                top: 6, 
                textStyle: { fontSize: props.isMobile ? 16 : 20, fontWeight: 700, fontFamily } 
            },
            tooltip: { 
                trigger: 'axis', 
                confine: true, 
                textStyle: { fontFamily, fontSize: props.isMobile ? 11 : 14 },
                formatter: params => {
                    const p = params?.[0]
                    if (!p) return ''
                    const d = seriesData.value[p.dataIndex]
                    return [
                        `<b>${p.name}</b>`,
                        `Tỷ lệ hủy: ${p.value?.toFixed?.(props.percentDigits) ?? p.value}%`,
                        `Hủy/Thực tế: ${d?._scrap ?? 0} / ${d?._actual ?? 0}`
                    ].join('<br/>')
                }
            },
            grid: { 
                left: props.isMobile ? '12%' : '8%', 
                right: '4%', 
                bottom: props.isMobile ? 80 : 60, 
                top: props.isMobile ? 60 : 50, 
                containLabel: true 
            },
            xAxis: {
                type: 'category',
                data: names,
                axisLabel: { 
                    interval: props.isMobile ? 'auto' : 0, 
                    rotate: props.isMobile ? 45 : 30, 
                    fontSize: props.isMobile ? 10 : 12,
                    fontFamily 
                }
            },
            yAxis: {
                type: 'value',
                name: '% Hủy',
                min: 0,
                axisLabel: {
                    formatter: v => `${v}%`,
                    fontSize: props.isMobile ? 10 : 12,
                    fontFamily
                },
                nameTextStyle: { fontFamily }
            },
            series: [{
                type: 'bar',
                data: values,
                barMaxWidth: props.isMobile ? 20 : 42,
                label: {
                    show: true,
                    position: 'top',
                    formatter: ({ value }) => `${Number(value).toFixed(props.percentDigits)}%`,
                    fontSize: props.isMobile ? 10 : 12,
                    fontFamily
                },
                itemStyle: { borderRadius: [6, 6, 0, 0] },
            }],
            animationDuration: 500,
        }, { notMerge: true })

        chart.resize()
    })
}

watch([seriesData, () => props.height, () => props.title, () => props.visible], render, { immediate: true })
onMounted(() => {
    window.addEventListener('resize', handleResize)
    render()
})
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    if (chart) { chart.dispose(); chart = null }
})
</script>
