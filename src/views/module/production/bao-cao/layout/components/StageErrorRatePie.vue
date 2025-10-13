<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { stageApi } from '@/services/production_service/stageService' // hoặc đường dẫn bạn đã cho: '@/plugins/productionApi' wrapper
echarts.use([PieChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

/**
 * Props:
 * - rows: lỗi đã lọc theo xưởng + ngày [{ team_id, error_qty, error_stage_1..3, error_code_1..3, team?{name} }]
 * - entries: năng suất đã lọc theo xưởng + ngày [{ team_id, qty_actual }]
 * - workshopId: để fetch stage (nếu cần tham số). Không bắt buộc.
 */
const props = defineProps({
    rows: { type: Array, default: () => [] },
    entries: { type: Array, default: () => [] },
    workshopId: { type: [Number, String], default: null },
    visible: { type: Boolean, default: true },
    height: { type: [String, Number], default: 360 },
    title: { type: String, default: 'TỶ LỆ LỖI THEO SỐ LƯỢNG / SẢN PHẨM THỰC TẾ' },
    percentDigits: { type: Number, default: 2 },
})

/** Emits: để cha hứng danh sách dòng vi phạm và xử lý popup */
const emit = defineEmits(['validation-issues', 'update:teamId', 'update:stageId'])

/** Local state: chọn Tổ & Công đoạn */
const teamId = ref(null)     // v-model:teamId nếu muốn
const stageId = ref(null)    // v-model:stageId nếu muốn
watch(teamId, v => emit('update:teamId', v))
watch(stageId, v => emit('update:stageId', v))

/** Load danh sách công đoạn */
const stages = ref([])
const loadingStages = ref(false)
async function loadStages() {
    loadingStages.value = true
    try {
        // nếu BE có filter theo workshop, thêm { workshop_id: props.workshopId }
        stages.value = await stageApi.listAll({})
    } catch (e) {
        console.error(e)
        stages.value = []
    } finally {
        loadingStages.value = false
    }
}
onMounted(loadStages)

/** Tạo options cho Select */
const stageOptions = computed(() => stages.value.map(s => ({ label: s.name, value: s.id, code: s.code })))

/** Team options: lấy từ rows/entries đã lọc theo xưởng */
const teamName = (obj, tid) => (obj?.team?.name ? obj.team.name : (tid ? `Tổ ${tid}` : 'Không rõ tổ'))
const teamMap = computed(() => {
    const map = new Map()
    for (const r of props.rows) {
        const tid = Number(r.team_id || 0)
        if (!tid) continue
        if (!map.has(tid)) map.set(tid, teamName(r, tid))
    }
    for (const e of props.entries) {
        const tid = Number(e.team_id || 0)
        if (!tid) continue
        if (!map.has(tid)) map.set(tid, teamName(e, tid))
    }
    return map
})
const teamOptions = computed(() =>
    Array.from(teamMap.value.entries()).map(([value, label]) => ({ value, label }))
)

/** Lấy tên/“khóa” stage theo stageId để so match với data_error (lưu text) */
const selectedStageMeta = computed(() => {
    if (!stageId.value) return null
    const s = stages.value.find(x => Number(x.id) === Number(stageId.value))
    if (!s) return null
    return { id: s.id, name: String(s.name || '').trim(), code: String(s.code || '').trim() }
})

/** Helper: xem 1 text stage trong data_error có khớp với stage chọn không (so theo name hoặc code) */
function isStageMatched(textStage) {
    if (!selectedStageMeta.value) return true // không chọn stage => nhận hết
    const t = String(textStage || '').trim()
    if (!t) return false
    const { name, code } = selectedStageMeta.value
    return (t === name || (code && t === code))
}

function stageDisplay(s) {
    const t = String(s || '').trim()
    if (!t) return t
    const hit = (stages.value || []).find(x => t === x.name || t === x.code || t === x.abbr)
    return hit?.name ? hit.name : t.replace(/\s*\([^)]*\)\s*$/, '') // bỏ " (CODE)" nếu có
}

/** ── VALIDATION & TÍNH TOÁN ───────────────────────────────────────────── */
const issues = ref([]) // gom dòng vi phạm
function validateAndAggregate() {
    issues.value = []
    // Tổng actual dùng làm mẫu số
    let denominatorActual = 0

    // 1) Denominator theo tổ (nếu chọn), ngược lại toàn xưởng (vì rows/entries đã lọc theo xưởng từ cha)
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

    // 2) Gom lỗi theo stage (tuân thủ rule: mỗi stage nhận full error_qty)
    const stageSum = new Map() // stageLabel -> sum(error_qty)
    const addStage = (stageLabel, qty) =>
        stageSum.set(stageLabel, (stageSum.get(stageLabel) || 0) + qty)

    // Duyệt từng dòng lỗi
    for (const r of props.rows) {
        const tid = Number(r.team_id || 0)
        if (teamId.value && tid !== Number(teamId.value)) continue

        const qty = Number(r.error_qty ?? 0)
        if (!Number.isFinite(qty) || qty <= 0) continue

        // Build 3 pairs (stage, code)
        const pairs = []
        for (let i = 1; i <= 3; i++) {
            const stage = String(r[`error_stage_${i}`] ?? '').trim()
            const code = String(r[`error_code_${i}`] ?? '').trim()
            // Nếu có stage mà thiếu code -> vi phạm
            if (stage && !code) {
                issues.value.push({ type: 'missing_code', team_id: tid, row: r })
                pairs.push({ stage, code, valid: false })
                continue
            }
            if (!stage && !code) continue // bỏ cặp trống
            if (!stage) {
                // không yêu cầu báo lỗi trường hợp có code mà trống stage; nhưng không dùng được để tính theo stage
                continue
            }
            // Nếu đã chọn Stage filter mà stage này không match thì bỏ qua cặp
            if (!isStageMatched(stage)) continue
            pairs.push({ stage, code, valid: true })
        }

        // Nếu không còn cặp hợp lệ nào -> next
        const validPairs = pairs.filter(p => p.valid)
        if (!validPairs.length) continue

        // Check trùng code trong dòng
        const codeSet = new Set()
        let dupCode = false
        for (const p of validPairs) {
            if (!p.code) continue
            const k = p.code
            if (codeSet.has(k)) { dupCode = true; break }
            codeSet.add(k)
        }
        if (dupCode) {
            issues.value.push({ type: 'dup_code', team_id: tid, row: r })
            continue // loại cả dòng
        }

        // Check trùng cặp (stage, code)
        const pairSet = new Set()
        let dupPair = false
        for (const p of validPairs) {
            const key = `${p.stage}__${p.code}`
            if (pairSet.has(key)) { dupPair = true; break }
            pairSet.add(key)
        }
        if (dupPair) {
            issues.value.push({ type: 'dup_pair', team_id: tid, row: r })
            continue // loại cả dòng
        }

        // Cộng lỗi: mỗi stage nhận full qty
        for (const p of validPairs) { addStage(stageDisplay(p.stage), qty) }
    }

    return { denominatorActual, stageSum }
}

const dataset = computed(() => {
    const { denominatorActual, stageSum } = validateAndAggregate()
    if (!denominatorActual) return { items: [], totalErrors: 0, totalActual: 0 }

    // Build pie data
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
    // sort desc theo % cho đẹp
    items.sort((a, b) => b.value - a.value)

    const totalErrors = items.reduce((s, x) => s + x.errors, 0)
    return { items, totalErrors, totalActual: denominatorActual }
})

/** Gửi issues ra cha để hiện popup nếu cần */
watch(dataset, () => {
    if (issues.value.length) emit('validation-issues', issues.value)
    else emit('validation-issues', [])
})

/** ── ECharts ─────────────────────────────────────────────────────────── */
const el = ref(null)
let chart = null
function ensure() { if (el.value && !chart) chart = echarts.init(el.value) }
function dispose() { if (chart) { chart.dispose(); chart = null } }
function handleResize() { if (chart && props.visible) chart.resize() }
const heightStyle = computed(() => typeof props.height === 'number' ? `${props.height}px` : String(props.height))
const hasData = computed(() => dataset.value.items.length > 0)

function render() {
    nextTick(() => {
        if (!props.visible || !hasData.value) { dispose(); return }
        ensure(); if (!chart) return

        // Font
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
            legend: { type: 'scroll', bottom: 8, textStyle: { fontFamily } },
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
        <!-- Toolbar chọn Tổ & Công đoạn -->
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:12px">
            <a-select v-model:value="teamId" allow-clear style="min-width:220px" :options="teamOptions"
                placeholder="Chọn tổ (tuỳ chọn)" />
            <a-select v-model:value="stageId" allow-clear style="min-width:220px" :loading="loadingStages"
                :options="stageOptions" placeholder="Chọn công đoạn (tuỳ chọn)" />
        </div>

        <div v-show="visible && hasData" :style="{ width: '100%', height: heightStyle }" ref="el" />
        <a-empty v-if="visible && !hasData" description="Chưa có dữ liệu phù hợp" />

        <!-- Grand Total -->
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
