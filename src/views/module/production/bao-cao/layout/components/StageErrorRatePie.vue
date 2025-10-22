<!-- components/StageErrorRatePie.vue -->
<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { stageApi } from '@/services/production_service/stageService'

echarts.use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps({
    rows: { type: Array, default: () => [] },
    entries: { type: Array, default: () => [] },
    workshopId: { type: [Number, String], default: null },
    visible: { type: Boolean, default: true },
    height: { type: [String, Number], default: 360 },
    title: { type: String, default: 'TỶ LỆ LỖI THEO CÔNG ĐOẠN / SỐ LƯỢNG THỰC TẾ' },
    percentDigits: { type: Number, default: 2 },
})

const emit = defineEmits(['validation-issues', 'update:teamId', 'update:stageIds'])

/* ===== Filters (Team + MULTI Stages) ===== */
const teamId = ref(null)
const stageIds = ref([]) // ⬅️ chọn nhiều công đoạn

watch(teamId, v => emit('update:teamId', v))
watch(stageIds, v => emit('update:stageIds', Array.isArray(v) ? v : []))

/* ===== Stages master ===== */
const stages = ref([])
const loadingStages = ref(false)
async function loadStages() {
    loadingStages.value = true
    try {
        stages.value = await stageApi.listAll({ /* workshop_id: props.workshopId */ })
    } catch {
        stages.value = []
    } finally {
        loadingStages.value = false
    }
}
onMounted(loadStages)

const stageOptions = computed(() =>
    stages.value.map(s => ({ label: s.name, value: s.id, code: s.code, abbr: s.abbr }))
)

/* Tên tổ cho select */
const teamName = (obj, tid) => (obj?.team?.name ? obj.team.name : (tid ? `Tổ ${tid}` : 'Không rõ tổ'))
const teamMap = computed(() => {
    const map = new Map()
    for (const r of props.rows) {
        const tid = Number(r.team_id || 0)
        if (tid && !map.has(tid)) map.set(tid, teamName(r, tid))
    }
    for (const e of props.entries) {
        const tid = Number(e.team_id || 0)
        if (tid && !map.has(tid)) map.set(tid, teamName(e, tid))
    }
    return map
})
const teamOptions = computed(() =>
    Array.from(teamMap.value.entries()).map(([value, label]) => ({ value, label }))
)

/* Selected stages meta (array) */
const selectedStagesMeta = computed(() => {
    if (!stageIds.value?.length) return []
    const set = new Set(stageIds.value.map(n => Number(n)))
    return stages.value.filter(x => set.has(Number(x.id)))
})

/* match stage text with ANY selected stage (by name/code/abbr) */
function isStageMatched(textStage) {
    const t = String(textStage || '').trim()
    if (!t) return false
    if (!selectedStagesMeta.value.length) return true // no filter

    for (const s of selectedStagesMeta.value) {
        const name = String(s.name || '').trim()
        const code = String(s.code || '').trim()
        const abbr = String(s.abbr || '').trim()
        if (t === name || (code && t === code) || (abbr && t === abbr)) return true
    }
    return false
}

function stageDisplay(s) {
    const t = String(s || '').trim()
    if (!t) return t
    const hit = (stages.value || []).find(x => t === x.name || t === x.code || t === x.abbr)
    return hit?.name ? hit.name : t.replace(/\s*\([^)]*\)\s*$/, '')
}

/* ===== VALIDATION & AGGREGATION ===== */
const issues = ref([])
function validateAndAggregate() {
    issues.value = []
    let denominatorActual = 0

    // denominator by team (if selected) else all
    if (teamId.value) {
        for (const e of props.entries) {
            if (Number(e.team_id) !== Number(teamId.value)) continue
            const a = Number(e.qty_actual ?? 0)
            if (Number.isFinite(a) && a > 0) denominatorActual += a
        }
    } else {
        for (const e of props.entries) {
            const a = Number(e.qty_actual ?? 0)
            if (Number.isFinite(a) && a > 0) denominatorActual += a
        }
    }

    const stageSum = new Map()
    const addStage = (stageLabel, qty) =>
        stageSum.set(stageLabel, (stageSum.get(stageLabel) || 0) + qty)

    for (const r of props.rows) {
        const tid = Number(r.team_id || 0)
        if (teamId.value && tid !== Number(teamId.value)) continue

        const qty = Number(r.error_qty ?? 0)
        if (!Number.isFinite(qty) || qty <= 0) continue

        const pairs = []
        for (let i = 1; i <= 3; i++) {
            const stage = String(r[`error_stage_${i}`] ?? '').trim()
            const code = String(r[`error_code_${i}`] ?? '').trim()
            if (stage && !code) {
                issues.value.push({ type: 'missing_code', team_id: tid, row: r })
                pairs.push({ stage, code, valid: false })
                continue
            }
            if (!stage && !code) continue
            if (!stage) continue
            if (!isStageMatched(stage)) continue
            pairs.push({ stage, code, valid: true })
        }

        const validPairs = pairs.filter(p => p.valid)
        if (!validPairs.length) continue

        const codeSet = new Set()
        let dupCode = false
        for (const p of validPairs) {
            if (!p.code) continue
            const k = p.code
            if (codeSet.has(k)) { dupCode = true; break }
            codeSet.add(k)
        }
        if (dupCode) { issues.value.push({ type: 'dup_code', team_id: tid, row: r }); continue }

        const pairSet = new Set()
        let dupPair = false
        for (const p of validPairs) {
            const key = `${p.stage}__${p.code}`
            if (pairSet.has(key)) { dupPair = true; break }
            pairSet.add(key)
        }
        if (dupPair) { issues.value.push({ type: 'dup_pair', team_id: tid, row: r }); continue }

        for (const p of validPairs) addStage(stageDisplay(p.stage), qty)
    }

    return { denominatorActual, stageSum }
}

const dataset = computed(() => {
    const { denominatorActual, stageSum } = validateAndAggregate()
    if (!denominatorActual) return { items: [], totalErrors: 0, totalActual: 0 }

    const items = Array.from(stageSum.entries()).map(([stage, errors]) => {
        const rate = (errors / denominatorActual) * 100
        return {
            stage,
            errors,
            actual: denominatorActual,
            value: Number(rate.toFixed(props.percentDigits)),
            _rate: rate,
        }
    })
    items.sort((a, b) => b.value - a.value)

    const totalErrors = items.reduce((s, x) => s + x.errors, 0)
    return { items, totalErrors, totalActual: denominatorActual }
})

watch(dataset, () => {
    emit('validation-issues', issues.value.length ? issues.value : [])
})

/* ===== ECharts ===== */
const el = ref(null)
let chart = null
function ensure() { if (el.value && !chart) chart = echarts.init(el.value) }
function dispose() { if (chart) { chart.dispose(); chart = null } }
function handleResize() { if (chart && props.visible) chart.resize() }

const heightStyle = computed(() =>
    typeof props.height === 'number' ? `${props.height}px` : String(props.height))
const hasData = computed(() => dataset.value.items.length > 0)

function render() {
    nextTick(() => {
        if (!props.visible || !hasData.value) { dispose(); return }
        ensure(); if (!chart) return

        const root = chart.getDom()
        const cs = getComputedStyle(root)
        const antFontVar = cs.getPropertyValue('--ant-font-family')?.trim()
        const FONT_STACK =
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
        const fontFamily = antFontVar && antFontVar.length ? antFontVar : FONT_STACK

        const data = dataset.value.items.map(d => ({
            name: d.stage,
            value: d.value,
            _err: d.errors,
            _act: d.actual,
            _rate: d.value,
        }))

        chart.setOption({
            textStyle: { fontFamily },
            title: { text: props.title, left: 'center', top: 6, textStyle: { fontSize: 20, fontWeight: 700, fontFamily } },
            tooltip: {
                trigger: 'item',
                textStyle: { fontFamily },
                formatter: (p) => {
                    const d = p.data || {}
                    return [`<b>${p.name}</b>`, `Tỷ lệ: ${d._rate?.toFixed(props.percentDigits)}%`, `Lỗi/Thực tế: ${d._err} / ${d._act}`].join('<br/>')
                }
            },
            legend: { type: 'scroll', bottom: 0, textStyle: { fontFamily } },
            series: [{
                type: 'pie',
                radius: ['30%', '70%'],
                center: ['50%', '52%'],
                avoidLabelOverlap: true,
                label: { show: true, formatter: ({ data }) => `${data.name}\n${(data._rate ?? 0).toFixed(1)}%`, fontFamily },
                labelLine: { length: 12, length2: 10 },
                data,
            }],
        }, { notMerge: true })

        chart.resize()
    })
}

watch([dataset, () => props.visible, () => props.height, () => props.title], render, { immediate: true })
onMounted(() => { ensure(); render(); window.addEventListener('resize', handleResize) })
onBeforeUnmount(() => { window.removeEventListener('resize', handleResize); dispose() })
</script>

<template>
    <div>
        <!-- Toolbar -->
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:12px">
            <a-select v-model:value="teamId" allow-clear style="min-width:220px" :options="teamOptions"
                placeholder="Chọn tổ (tuỳ chọn)" />
            <a-select v-model:value="stageIds" mode="multiple" allow-clear style="min-width:320px"
                :loading="loadingStages" :options="stageOptions" :max-tag-count="2"
                placeholder="Chọn công đoạn (nhiều)" />
        </div>

        <div v-show="visible && hasData" :style="{ width: '100%', height: heightStyle }" ref="el" />
        <a-empty v-if="visible && !hasData" description="Chưa có dữ liệu phù hợp" />

        <div class="mt-3" v-if="visible && hasData" style="margin-top:12px">
            <a-card size="small">
                <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px">
                    <div>
                        <div class="lbl">Tổng lỗi</div>
                        <div class="val">{{ dataset.totalErrors }}</div>
                    </div>
                    <div>
                        <div class="lbl">Tổng sản phẩm</div>
                        <div class="val">{{ dataset.totalActual }}</div>
                    </div>
                    <div>
                        <div class="lbl">Tỷ lệ lỗi chung</div>
                        <div class="val">{{ ((dataset.totalErrors / dataset.totalActual) * 100).toFixed(percentDigits)
                            }}%</div>
                    </div>
                </div>
            </a-card>
        </div>
    </div>
</template>

<style scoped>
.lbl {
    font-size: 12px;
    color: #666
}

.val {
    font-size: 18px;
    font-weight: 700
}
</style>
