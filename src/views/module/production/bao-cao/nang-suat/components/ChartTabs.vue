<template>
    <div>
        <!-- Thanh điều khiển minh bạch -->
        <div class="controls">
            <a-space>
                <span>Hiển thị:</span>
                <a-select v-model:value="topN" style="width: 120px">
                    <a-select-option :value="10">Top 10</a-select-option>
                    <a-select-option :value="20">Top 20</a-select-option>
                    <a-select-option :value="50">Top 50</a-select-option>
                    <a-select-option :value="0">Tất cả</a-select-option>
                </a-select>
                <a-switch v-model:checked="groupOthers" :disabled="topN === 0" />
                <span>Gộp mục còn lại thành “Khác”</span>
            </a-space>
        </div>

        <a-alert v-if="groupOthers && topN > 0 && othersCount > 0" type="info" show-icon class="mb8"
            :message="`Đang hiển thị Top ${topN} theo Hệ số năng suất. ‘Khác’ = ${othersCount} mã còn lại (tổng ${othersSum.toFixed(4)}).`"
            :action="h('a', { onClick: () => showOthers = true, style: 'cursor:pointer' }, 'Xem chi tiết')" />

        <a-tabs v-model:activeKey="active" :destroyInactiveTabPane="true">
            <a-tab-pane key="bar" tab="Bar chart">
                <div class="chart-box">
                    <v-chart :option="barOption" autoresize />
                </div>
            </a-tab-pane>

            <a-tab-pane key="pie" tab="Pie chart">
                <div class="chart-box">
                    <v-chart :option="pieOption" autoresize @click="onPieClick" />
                </div>
            </a-tab-pane>

            <a-tab-pane key="line" tab="Line chart">
                <div class="chart-box">
                    <v-chart :option="lineOption" autoresize />
                </div>
            </a-tab-pane>
        </a-tabs>

        <!-- Drawer chi tiết “Khác” -->
        <a-drawer v-model:open="showOthers" title="Chi tiết nhóm 'Khác'" width="520">
            <a-table :data-source="othersDetail" :pagination="{ pageSize: 10 }" row-key="name" size="small">
                <a-table-column title="Mã hàng" dataIndex="name" />
                <a-table-column title="Hệ số năng suất" dataIndex="value"
                    :customRender="({ text }) => Number(text).toFixed(4)" align="right" />
            </a-table>
        </a-drawer>
    </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'

const props = defineProps({ rows: { type: Array, default: () => [] } })
const active = ref('bar')

/* === Cấu hình hiển thị === */
const topN = ref(10)         // Top N mặc định
const groupOthers = ref(true)
const showOthers = ref(false)

/* === Chuẩn hóa dữ liệu === */
const base = computed(() =>
    props.rows
        .map(r => ({ name: String(r.item_code), value: typeof r.result === 'number' ? +r.result : 0 }))
        .sort((a, b) => b.value - a.value)
)

const topNData = computed(() => {
    if (topN.value === 0) return base.value // hiển thị tất cả
    const top = base.value.slice(0, topN.value)
    if (!groupOthers.value) return top
    const rest = base.value.slice(topN.value)
    const restSum = rest.reduce((s, r) => s + r.value, 0)
    return restSum > 0 ? [...top, { name: 'Khác', value: +restSum.toFixed(4) }] : top
})

const othersDetail = computed(() =>
    topN.value > 0 ? base.value.slice(topN.value) : []
)
const othersCount = computed(() => othersDetail.value.length)
const othersSum = computed(() => othersDetail.value.reduce((s, r) => s + r.value, 0))

const labels = computed(() => topNData.value.map(d => d.name))
const values = computed(() => topNData.value.map(d => +d.value.toFixed(4)))

/* === Helpers === */
const wrap = (s, every = 16) => s.replace(new RegExp(`(.{1,${every}})`, 'g'), '$1\n') // xuống dòng
const fmt = v => (typeof v === 'number' ? v.toFixed(4) : v)

/* === BAR: ngang, nhãn xuống dòng, tooltip đầy đủ === */
const barOption = computed(() => ({
    tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => {
            const p = Array.isArray(params) ? params[0] : params
            return `<div><b>${p.name}</b><br/>Hệ số năng suất: ${fmt(p.value)}</div>`
        },
    },
    grid: { left: 140, right: 20, top: 10, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: {
        type: 'category',
        data: labels.value.map(v => wrap(v, 18)),
        inverse: true,
        axisLabel: { interval: 0 }, // hiển thị tất cả
    },
    dataZoom: labels.value.length > 12 ? [
        { type: 'inside', yAxisIndex: 0, start: 0, end: 100 },
        { type: 'slider', yAxisIndex: 0, right: 0, width: 12 },
    ] : [],
    series: [{
        type: 'bar',
        label: { show: true, position: 'right', formatter: ({ value }) => fmt(value) },
        emphasis: { focus: 'self' },
        data: values.value,
    }],
}))

/* === PIE: donut + legend scroll, click “Khác” mở chi tiết === */
// Ẩn nhãn & đường chỉ khi < 5%
const LABEL_MIN_PERCENT = 5

const pieOption = computed(() => {
  const src = topNData.value
  const total = src.reduce((s, it) => s + (Number(it.value) || 0), 0) || 1

  const data = src.map(it => {
    const val = Number(it.value) || 0
    const percent = (val / total) * 100
    const show = percent >= LABEL_MIN_PERCENT
    return {
      name: it.name,
      value: +val.toFixed(4),
      // Ẩn label/labelLine cho lát nhỏ
      label: {
        show,
        formatter: show ? `${it.name}\n(${percent.toFixed(2)}%)` : ''
      },
      labelLine: { show }
    }
  })

  return {
    tooltip: {
      trigger: 'item',
      formatter: ({ name, value, percent }) =>
        `<div><b>${name}</b><br/>Giá trị: ${(+value).toFixed(4)}<br/>Tỷ lệ: ${percent}%</div>`,
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      minAngle: 2,
      // ép ECharts tránh đè nhãn
      labelLayout: { hideOverlap: true },
      // KHÔNG đặt label/labelLine chung ở đây nữa; đã cấu hình theo từng data item
      data,
    }],
  }
})

function onPieClick(e) {
    if (e.name === 'Khác') showOthers.value = true
}

/* === LINE: thêm dataZoom, không label để gọn === */
const lineOption = computed(() => ({
    tooltip: { trigger: 'axis', valueFormatter: fmt },
    grid: { left: 40, right: 20, top: 20, bottom: 60 },
    xAxis: { type: 'category', data: labels.value, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    dataZoom: labels.value.length > 20 ? [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', bottom: 20, height: 16 },
    ] : [],
    series: [{ type: 'line', data: values.value, showSymbol: false, smooth: true }],
}))
</script>

<style scoped>
.controls {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}

.chart-box {
    width: 100%;
    height: 420px;
}

.mb8 {
    margin-bottom: 8px;
}
</style>
