<script setup>
import { ref, computed, watch, onMounted, h } from "vue";
import { stageApi } from "@/services/production_service/stageService";
import { errorCodeApi } from "@/services/production_service/errorCodeService";

/* ================== Props ================== */
const props = defineProps({
    rows: { type: Array, default: () => [] },      // dữ liệu lỗi
    entries: { type: Array, default: () => [] },   // dữ liệu năng suất
    visible: { type: Boolean, default: true },
    percentDigits: { type: Number, default: 2 },
    title: { type: String, default: "TỶ LỆ LỖI / SẢN LƯỢNG THEO MÃ HÀNG" },
    isMobile: { type: Boolean, default: false }
});
const emit = defineEmits(["update:teamId", "update:stageIds"]);

/* ================== Filters ================== */
const teamId = ref(null);
const stageIds = ref([]);
watch(teamId, v => emit("update:teamId", v));
watch(stageIds, v => emit("update:stageIds", Array.isArray(v) ? v : []));

/* ================== Masters ================== */
const stages = ref([]);
const loadingStages = ref(false);
async function loadStages() {
    loadingStages.value = true;
    try { stages.value = await stageApi.listAll({}); }
    catch { stages.value = []; }
    finally { loadingStages.value = false; }
}
onMounted(loadStages);

const stageOptions = computed(() =>
    stages.value.map(s => ({ label: s.name, value: s.id, code: s.code, abbr: s.abbr }))
);

/* Error codes (code -> name) */
const errorCodes = ref([]);
const errorCodeMap = computed(() => {
    const m = new Map();
    for (const r of errorCodes.value || []) {
        const code = String(r.code || "").trim();
        const name = String(r.name || "").trim();
        if (code) m.set(code, name);
    }
    return m;
});
function codeFullLabel(code) {
    const c = String(code || "").trim();
    if (!c) return "";
    const name = errorCodeMap.value.get(c);
    return name ? `${c} (${name})` : c;
}
async function loadErrorCodes() {
    try { errorCodes.value = await errorCodeApi.listAll(); }
    catch { errorCodes.value = []; }
}
onMounted(loadErrorCodes);

/* ================== Team options từ dữ liệu ================== */
const teamName = (obj, tid) =>
    obj?.team?.name ? obj.team.name : (tid ? `Tổ ${tid}` : "Không rõ tổ");

const teamMap = computed(() => {
    const map = new Map();
    for (const r of props.rows) {
        const tid = Number(r.team_id || 0);
        if (tid && !map.has(tid)) map.set(tid, teamName(r, tid));
    }
    for (const e of props.entries) {
        const tid = Number(e.team_id || 0);
        if (tid && !map.has(tid)) map.set(tid, teamName(e, tid));
    }
    return map;
});
const teamOptions = computed(() =>
    Array.from(teamMap.value.entries()).map(([value, label]) => ({ value, label }))
);

/* ================== Helpers ================== */
function pickItemCode(obj) {
    const cands = ["item_code", "ma_hang", "product_code", "sku", "item", "code"];
    for (const k of cands) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    const fb = obj?.order_item_code || obj?.order_code;
    return fb ? String(fb).trim() : "";
}
function stageDisplay(s) {
    const t = String(s || "").trim();
    if (!t) return t;
    const hit = (stages.value || []).find(x => t === x.name || t === x.code || t === x.abbr);
    return hit?.name ? hit.name : t.replace(/\s*\([^)]*\)\s*$/, "");
}
const selectedStagesMeta = computed(() => {
    if (!stageIds.value?.length) return [];
    const set = new Set(stageIds.value.map(n => Number(n)));
    return stages.value.filter(x => set.has(Number(x.id)));
});
function isStageMatched(textStage) {
    const t = String(textStage || "").trim();
    if (!t) return false;
    if (!selectedStagesMeta.value.length) return true;
    for (const s of selectedStagesMeta.value) {
        const name = String(s.name || "").trim();
        const code = String(s.code || "").trim();
        const abbr = String(s.abbr || "").trim();
        if (t === name || (code && t === code) || (abbr && t === abbr)) return true;
    }
    return false;
}

/* ================== Aggregate theo MÃ HÀNG ================== */
const aggregate = computed(() => {
    // 1) Tổng sản lượng theo mã
    const actualByItem = new Map();
    for (const e of props.entries || []) {
        if (teamId.value && Number(e.team_id) !== Number(teamId.value)) continue;
        const item = pickItemCode(e); if (!item) continue;
        const a = Number(e.qty_actual ?? 0);
        if (Number.isFinite(a) && a >= 0) actualByItem.set(item, (actualByItem.get(item) || 0) + a);
    }

    // 2) Tổng lỗi + breakdown
    const errByItem = new Map();
    const byItemTeam = new Map(); // item -> Map(teamName -> qty)
    const byItemPair = new Map(); // item -> Map("stage|code" -> {stage,code,qty})

    for (const r of props.rows || []) {
        if (teamId.value && Number(r.team_id || 0) !== Number(teamId.value)) continue;
        const item = pickItemCode(r); if (!item) continue;

        const qty = Number(r.error_qty ?? r.defect_qty ?? r.qty_error ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;

        const tname = teamName(r, Number(r.team_id || 0));

        const pairs = [];
        for (let i = 1; i <= 3; i++) {
            const stage = String(r[`error_stage_${i}`] ?? "").trim();
            const code = String(r[`error_code_${i}`] ?? "").trim();
            if (!stage && !code) continue;
            if (!stage || !code) continue;
            if (!isStageMatched(stage)) continue;
            pairs.push({ stage: stageDisplay(stage), code });
        }
        if (!pairs.length) continue;

        // cộng dồn tổng lỗi
        errByItem.set(item, (errByItem.get(item) || 0) + qty);

        // theo tổ
        if (!byItemTeam.has(item)) byItemTeam.set(item, new Map());
        byItemTeam.get(item).set(tname, (byItemTeam.get(item).get(tname) || 0) + qty);

        // theo cặp (tránh double-count trong 1 dòng)
        if (!byItemPair.has(item)) byItemPair.set(item, new Map());
        const pairMap = byItemPair.get(item);
        const uniq = new Set(pairs.map(p => `${p.stage}|${p.code}`));
        for (const k of uniq) {
            const [st, cd] = k.split("|");
            const cur = pairMap.get(k) || { stage: st, code: cd, qty: 0 };
            cur.qty += qty;
            pairMap.set(k, cur);
        }
    }

    // 3) Hợp nhất tất cả mã (kể cả chỉ có sản lượng hoặc chỉ có lỗi)
    const itemsSet = new Set([...actualByItem.keys(), ...errByItem.keys()]);

    // 4) Tạo dòng kết quả
    const rowsArr = [];
    for (const item of itemsSet) {
        const actual = actualByItem.get(item) ?? 0;
        const errors = errByItem.get(item) ?? 0;

        // ==== Nhiều TỔ đồng hạng ====
        const teamMapForItem = byItemTeam.get(item) || new Map();
        let maxTeamQty = 0;
        for (const qQty of teamMapForItem.values()) if (qQty > maxTeamQty) maxTeamQty = qQty;
        const topTeams = Array.from(teamMapForItem.entries())
            .filter(([_, qQty]) => qQty === maxTeamQty && qQty > 0)
            .map(([name, qQty]) => ({ name, qty: qQty, pct: errors > 0 ? (qQty / errors) * 100 : 0 }));

        // ==== Nhiều CẶP đồng hạng ====
        const pairMapForItem = byItemPair.get(item) || new Map();
        let maxPairQty = 0;
        for (const obj of pairMapForItem.values()) if (obj.qty > maxPairQty) maxPairQty = obj.qty;
        const topPairs = Array.from(pairMapForItem.values())
            .filter(p => p.qty === maxPairQty && p.qty > 0)
            .map(p => ({
                stage: p.stage,
                code: p.code,
                codeLabel: codeFullLabel(p.code),
                qty: p.qty,
                pct: errors > 0 ? (p.qty / errors) * 100 : 0
            }));

        rowsArr.push({
            key: item,
            item_code: item,
            actual,
            errors,
            rate: actual > 0 ? (errors / actual) * 100 : 0,

            top_teams: topTeams,               // [{name, qty, pct}]
            top_pairs: topPairs,               // [{stage, code, codeLabel, qty, pct}]

            // breakdown cho expand
            _teams: Array.from(teamMapForItem.entries()).map(([name, qty]) => ({
                name, qty, pct: errors > 0 ? (qty / errors) * 100 : 0
            })),
            _pairs: Array.from(pairMapForItem.values()).map(p => ({
                stage: p.stage, code: p.code, codeLabel: codeFullLabel(p.code),
                qty: p.qty, pct: errors > 0 ? (p.qty / errors) * 100 : 0
            }))
        });
    }

    rowsArr.sort((a, b) => b.rate - a.rate);
    return rowsArr;
});

/* ================== Table state ================== */
const qSearch = ref("");
const onlyHasError = ref(false);
const pageSizeSet = ref(20);
const currentSet = ref(1);
const sortSet = ref({ field: "rate", order: "descend" });

const filtered = computed(() => {
    const kw = qSearch.value.trim().toLowerCase();
    let arr = aggregate.value;
    if (kw) arr = arr.filter(x => (x.item_code || "").toLowerCase().includes(kw));
    if (onlyHasError.value) arr = arr.filter(x => (x.errors || 0) > 0);

    if (sortSet.value?.field) {
        const f = sortSet.value.field;
        const dir = sortSet.value.order === "ascend" ? 1 : -1;
        arr = [...arr].sort((a, b) => {
            const va = a[f]; const vb = b[f];
            if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
            return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
        });
    }
    return arr;
});

const paged = computed(() => {
    const start = (Number(currentSet.value) - 1) * Number(pageSizeSet.value);
    return filtered.value.slice(start, start + Number(pageSizeSet.value));
});

function handleChange(pagination, _filters, sorter) {
    currentSet.value = Number(pagination?.current ?? 1);
    pageSizeSet.value = Number(pagination?.pageSize ?? 20);
    if (sorter?.field) sortSet.value = { field: sorter.field, order: sorter.order };
}

/* ================== Expanded row (VNode) ================== */
function expandedRowRender(record) {
    const teams = Array.isArray(record._teams) ? [...record._teams] : [];
    const pairs = Array.isArray(record._pairs) ? [...record._pairs] : [];
    teams.sort((a, b) => b.qty - a.qty);
    pairs.sort((a, b) => b.qty - a.qty);

    return h("div", { class: "exp-wrap" }, [
        h("div", { class: "exp-col" }, [
            h("div", { class: "exp-title" }, "Chi tiết theo Tổ"),
            h("table", { class: "mini" }, [
                h("thead", null, [
                    h("tr", null, [
                        h("th", null, "Tổ"),
                        h("th", { style: "text-align:right" }, "Số lượng lỗi"),
                        h("th", { style: "text-align:right" }, "% trong lỗi")
                    ])
                ]),
                h("tbody", null,
                    teams.map(t => h("tr", null, [
                        h("td", null, t.name),
                        h("td", { style: "text-align:right" }, String(t.qty)),
                        h("td", { style: "text-align:right" }, `${Number(t.pct || 0).toFixed(props.percentDigits)}%`),
                    ]))
                )
            ])
        ]),
        h("div", { class: "exp-col" }, [
            h("div", { class: "exp-title" }, "Chi tiết theo Công đoạn"),
            h("table", { class: "mini" }, [
                h("thead", null, [
                    h("tr", null, [
                        h("th", null, "Công đoạn"),
                        h("th", null, "Mã lỗi"),
                        h("th", { style: "text-align:right" }, "Phần trăm")
                    ])
                ]),
                h("tbody", null,
                    pairs.map(p => h("tr", null, [
                        h("td", null, p.stage),
                        h("td", null, p.codeLabel),
                        h("td", { style: "text-align:right" }, `${Number(p.pct || 0).toFixed(props.percentDigits)}%`),
                    ]))
                )
            ])
        ])
    ]);
}
</script>

<template>
    <div v-if="visible">
        <!-- Bộ lọc -->
        <div :class="['toolbar', isMobile ? 'mobile-toolbar' : '']">
            <a-select v-model:value="teamId" allow-clear :style="isMobile ? 'width:100%' : 'min-width:220px'" :options="teamOptions"
                placeholder="Lọc theo Tổ (tuỳ chọn)" />
            <a-select v-model:value="stageIds" mode="multiple" allow-clear :style="isMobile ? 'width:100%' : 'min-width:320px'"
                :options="stageOptions" :loading="loadingStages" :max-tag-count="1"
                placeholder="Lọc theo Công đoạn (nhiều)" />
            <a-input v-model:value="qSearch" allow-clear :style="isMobile ? 'width:100%' : 'width:240px'" placeholder="Tìm mã hàng..." />
            <a-checkbox v-model:checked="onlyHasError">Chỉ hiển thị có lỗi</a-checkbox>
        </div>

        <!-- Bảng Desktop -->
        <a-table v-if="!isMobile" :data-source="paged"
            :pagination="{ current: currentSet, pageSize: pageSizeSet, total: filtered.length, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }"
            @change="handleChange" size="middle" bordered
            :row-class-name="(r) => (r.errors || 0) === 0 ? 'row-zero' : ((r.errors > 0 && r.actual === 0) ? 'row-warn' : '')"
            :expandable="{ expandedRowRender }">
            <template #title>
                <div style="font-weight:700">{{ title }}</div>
            </template>
            <a-table-column title="Mã hàng" dataIndex="item_code" key="item_code" sorter align="center">
                <template #default="{ text, record }">
                    <div class="code-text">{{ text }}</div>
                    <div class="subs-badge">
                        <a-tag v-if="(record.errors || 0) === 0" color="green">Không có lỗi</a-tag>
                        <a-tag v-else-if="record.actual === 0" color="orange">Không tìm thấy mã trong năng suất</a-tag>
                    </div>
                </template>
            </a-table-column>
            <a-table-column title="Năng suất" dataIndex="actual" key="actual" sorter align="center" width="120" />
            <a-table-column title="Số lỗi" dataIndex="errors" key="errors" sorter align="center" width="100" />
            <a-table-column title="% lỗi" key="rate" dataIndex="rate" sorter align="center" width="120">
                <template #default="{ text }">{{ Number(text || 0).toFixed(percentDigits) }}%</template>
            </a-table-column>
            <a-table-column title="% lỗi theo tổ" key="top_team_names" width="280">
                <template #default="{ record }">
                    <div class="multiline" v-if="record.top_teams?.length">
                        <div v-for="t in record.top_teams" :key="t.name">
                            - {{ t.name }} ({{ t.qty }}): {{ Number(t.pct || 0).toFixed(percentDigits) }}%
                        </div>
                    </div>
                    <div v-else>—</div>
                </template>
            </a-table-column>
            <a-table-column title="Lỗi chủ yếu" key="top_pair_label" width="320">
                <template #default="{ record }">
                    <div class="multiline" v-if="record.top_pairs?.length">
                        <div v-for="p in record.top_pairs" :key="p.stage + p.code">
                            - {{ p.stage }} - {{ p.codeLabel }}
                        </div>
                    </div>
                    <div v-else>—</div>
                </template>
            </a-table-column>
        </a-table>

        <!-- View Mobile Card -->
        <div v-else class="mobile-card-list">
            <div class="mb-2" style="font-weight:700; color:#666">{{ title }}</div>
            <div v-for="record in paged" :key="record.key" class="mobile-card">
                <div class="card-header-orange">
                    <span class="card-item-code">{{ record.item_code }}</span>
                    <a-tag v-if="(record.errors || 0) === 0" color="green" style="margin-left:auto">OK</a-tag>
                    <a-tag v-else-if="record.actual === 0" color="error" style="margin-left:auto">!</a-tag>
                </div>
                <div class="card-body">
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <div class="lbl">Sản lượng</div>
                            <div class="val">{{ record.actual }}</div>
                        </div>
                        <div class="metric-item">
                            <div class="lbl">Số lỗi</div>
                            <div class="val text-danger">{{ record.errors }}</div>
                        </div>
                        <div class="metric-item">
                            <div class="lbl">Tỷ lệ lỗi</div>
                            <div class="val text-primary">{{ Number(record.rate).toFixed(2) }}%</div>
                        </div>
                    </div>

                    <a-collapse ghost expand-icon-position="right" class="mt-2">
                        <a-collapse-panel key="1" header="Phân tích theo Tổ">
                            <div v-if="record._teams?.length">
                                <div v-for="t in record._teams" :key="t.name" class="breakdown-item">
                                    <span class="name">{{ t.name }}</span>
                                    <span class="qty">{{ t.qty }} lỗi</span>
                                    <span class="pct">{{ Number(t.pct).toFixed(1) }}%</span>
                                </div>
                            </div>
                            <a-empty v-else size="small" description="Không có dữ liệu" />
                        </a-collapse-panel>
                        <a-collapse-panel key="2" header="Phân tích Công đoạn - Lỗi">
                            <div v-if="record._pairs?.length">
                                <div v-for="p in record._pairs" :key="p.stage + p.code" class="breakdown-item pair">
                                    <div class="pair-row">
                                        <span class="stage">{{ p.stage }}</span>
                                        <span class="pct">{{ Number(p.pct).toFixed(1) }}%</span>
                                    </div>
                                    <div class="pair-code">{{ p.codeLabel }}</div>
                                </div>
                            </div>
                            <a-empty v-else size="small" description="Không có dữ liệu" />
                        </a-collapse-panel>
                    </a-collapse>
                </div>
            </div>

            <div class="pagination-center mt-3">
                <a-pagination v-model:current="currentSet" v-model:pageSize="pageSizeSet"
                    :total="filtered.length" size="small" show-less-items />
            </div>
        </div>
    </div>
</template>

<style scoped>
.toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin: 12px 0;
}

.mobile-toolbar {
    flex-direction: column;
    align-items: flex-start;
}

.subs-badge {
    margin-top: 4px;
}

.multiline > div {
    line-height: 1.35;
    font-size: 13px;
}

.code-text {
    font-weight: 600;
}

.row-zero td {
    background: #f6ffed !important;
}

.row-warn td {
    background: #fff7e6 !important;
}

.exp-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.exp-title {
    font-weight: 700;
    margin-bottom: 6px;
    color: #1890ff;
}

table.mini {
    width: 100%;
    border-collapse: collapse;
}

table.mini th,
table.mini td {
    border: 1px solid #eee;
    padding: 6px 8px;
    font-size: 12px;
}

table.mini thead th {
    background: #fafafa;
}

/* Mobile Card Styling */
.mobile-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mobile-card {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-left: 5px solid #c06252; /* Thêm gạch màu cam chủ đạo bên trái */
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.card-header-orange {
    background: #c06252; /* Màu cam gạch chủ đạo */
    padding: 10px 12px;
    display: flex;
    align-items: center;
    color: #fff;
}

.card-item-code {
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.5px;
}

.card-body {
    padding: 12px;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
    border-bottom: 1px dashed #eee;
    padding-bottom: 12px;
}

.metric-item {
    text-align: center;
}

.metric-item .lbl {
    font-size: 11px;
    color: #8c8c8c;
    margin-bottom: 2px;
}

.metric-item .val {
    font-size: 15px;
    font-weight: 700;
}

.text-danger { color: #f5222d; }
.text-primary { color: #1890ff; }

.breakdown-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
}

.breakdown-item:last-child {
    border-bottom: none;
}

.breakdown-item.pair {
    flex-direction: column;
}

.pair-row {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    margin-bottom: 2px;
}

.pair-code {
    font-size: 11px;
    color: #666;
}

:deep(.ant-collapse-header) {
    padding: 8px 0 !important;
    font-weight: 600 !important;
    font-size: 13px !important;
}

:deep(.ant-collapse-content-box) {
    padding: 0 0 8px 0 !important;
}

.pagination-center {
    display: flex;
    justify-content: center;
}

@media (max-width: 768px) {
    .exp-wrap {
        grid-template-columns: 1fr;
    }
}
:deep(.ant-table th) {
  text-align: center !important;
}
</style>
