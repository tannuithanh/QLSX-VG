<template>
    <div class="rate-wrap" v-show="visible && hasData">
        <!-- Chart -->
        <div ref="chartEl" :style="{ width: '100%', height: heightStyle }"></div>

        <!-- Grand Total + công thức -->
        <div class="mt-3 grid gap-2">
            <a-card size="small" class="grand">
                <div class="grand-row">
                    <div class="grand-item">
                        <div class="lbl">Grand Total – Tổng lỗi</div>
                        <div class="val">{{ totalErrors }}</div>
                    </div>
                    <div class="grand-item">
                        <div class="lbl">Grand Total – Tổng sản lượng</div>
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
    /** Cách 1: truyền sẵn dữ liệu [{ name, value(%), errors, actual }] */
    data: { type: Array, default: () => [] },

    /** Cách 2: truyền raw để component tự tính */
    errors: { type: Array, default: () => [] },   // { team_id, error_qty, ... }
    entries: { type: Array, default: () => [] },  // { team_id, qty_actual, ... }
    teamNameById: { type: Object, default: () => ({}) },

    height: { type: [String, Number], default: 420 },
    title: { type: String, default: 'BIỂU ĐỒ TỶ LỆ TỔNG LỖI / TỔNG SẢN LƯỢNG GIỮA CÁC TỔ' },
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
    if (r?.team?.name) return `${r.team.name}${r.team.code ? ` (${r.team.code})` : ''}`
    return fallback || `Tổ ${id}`
}

/* ----- chuẩn hóa input thành cùng 1 format {name, value, errors, actual} ----- */
const fromPrepared = computed(() => {
    const arr = (props.data || []).filter(x => Number(x.actual) > 0 && Number(x.value) > 0)
    // sắp xếp giảm dần theo % để hiển thị đẹp
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

/* Grand total (tổng lỗi, tổng sản lượng, % chung) */
const totalErrors = computed(() => seriesItems.value.reduce((s, x) => s + Number(x.errors || 0), 0))
const totalActual = computed(() => seriesItems.value.reduce((s, x) => s + Number(x.actual || 0), 0))
const overallRate = computed(() => (totalActual.value > 0 ? (totalErrors.value / totalActual.value) * 100 : 0))


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

    // Lấy font từ AntD (CSS var) hoặc fallback sang font-stack chuẩn
    const root = chart.getDom()
    const cs = getComputedStyle(root)
    const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
    const FONT_STACK =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
    const fontFamily =
      antFontVar && antFontVar.length ? antFontVar : FONT_STACK

    const data = seriesItems.value.map(d => ({
      name: d.name,
      value: Number(d.value),
      _err: Number(d.errors || 0),
      _act: Number(d.actual || 0),
      _rate: Number(d.value),
    }))

    const option = {
      // Áp font mặc định cho toàn bộ chart
      textStyle: { fontFamily },

      title: {
        text: props.title,
        left: 'center',
        top: 6,
        textStyle: { fontSize: 20, fontWeight: 700, fontFamily },
      },
      tooltip: {
        trigger: 'item',
        textStyle: { fontFamily },
        formatter: (p) => {
          const d = p.data || {}
          return [
            `<b>${p.name}</b>`,
            `Tỷ lệ: ${d._rate?.toFixed(2)}%`,
            `Lỗi/Sản lượng: ${d._err} / ${d._act}`,
          ].join('<br/>')
        },
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 8,
        data: data.map(x => x.name),
        textStyle: { fontFamily },
      },
      series: [
        {
          type: 'pie',
          radius: ['30%', '70%'],
          center: ['50%', '52%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: ({ data }) => `${data.name}\n${(data._rate ?? 0).toFixed(1)}%`,
            fontFamily,
          },
          labelLine: { length: 12, length2: 10 },
          data,
        },
      ],
    }

    // notMerge = true để đảm bảo font & option áp ngay
    chart.setOption(option, true)
    chart.resize()
  })
}


/* Re-render khi dữ liệu/hiển thị/tham số thay đổi */
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
