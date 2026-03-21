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
    const items = new Set([...actualByItem.keys(), ...errByItem.keys()]);

    // 4) Tạo dòng kết quả
    const rows = [];
    for (const item of items) {
        const actual = actualByItem.get(item) ?? 0;
        const errors = errByItem.get(item) ?? 0;

        // ==== Nhiều TỔ đồng hạng ====
        const teamMapForItem = byItemTeam.get(item) || new Map();
        let maxTeamQty = 0;
        for (const q of teamMapForItem.values()) if (q > maxTeamQty) maxTeamQty = q;
        const topTeams = Array.from(teamMapForItem.entries())
            .filter(([_, q]) => q === maxTeamQty && q > 0)
            .map(([name, q]) => ({ name, qty: q, pct: errors > 0 ? (q / errors) * 100 : 0 }));

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

        rows.push({
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

    rows.sort((a, b) => b.rate - a.rate);
    return rows;
});

/* ================== Table state ================== */
const q = ref("");
const onlyHasError = ref(false);
const pageSize = ref(20);
const current = ref(1);
const sort = ref({ field: "rate", order: "descend" });

const filtered = computed(() => {
    const kw = q.value.trim().toLowerCase();
    let arr = aggregate.value;
    if (kw) arr = arr.filter(x => (x.item_code || "").toLowerCase().includes(kw));
    if (onlyHasError.value) arr = arr.filter(x => (x.errors || 0) > 0);

    if (sort.value?.field) {
        const f = sort.value.field;
        const dir = sort.value.order === "ascend" ? 1 : -1;
        arr = [...arr].sort((a, b) => {
            const va = a[f]; const vb = b[f];
            if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
            return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
        });
    }
    return arr;
});

const paged = computed(() => {
    const start = (Number(current.value) - 1) * Number(pageSize.value);
    return filtered.value.slice(start, start + Number(pageSize.value));
});

function handleChange(pagination, _filters, sorter) {
    current.value = Number(pagination?.current ?? 1);
    pageSize.value = Number(pagination?.pageSize ?? 20);
    if (sorter?.field) sort.value = { field: sorter.field, order: sorter.order };
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
                        h("th", { style: "text-align:right" }, "% trong lỗi của mã")
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
            h("div", { class: "exp-title" }, "Chi tiết theo (Công đoạn – Mã lỗi)"),
            h("table", { class: "mini" }, [
                h("thead", null, [
                    h("tr", null, [
                        h("th", null, "Công đoạn"),
                        h("th", null, "Mã lỗi"),
                        h("th", { style: "text-align:right" }, "Số lượng lỗi"),
                        h("th", { style: "text-align:right" }, "% trong lỗi của mã")
                    ])
                ]),
                h("tbody", null,
                    pairs.map(p => h("tr", null, [
                        h("td", null, p.stage),
                        h("td", null, p.codeLabel),
                        h("td", { style: "text-align:right" }, String(p.qty)),
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
        <div class="toolbar">
            <a-select v-model:value="teamId" allow-clear style="min-width:220px" :options="teamOptions"
                placeholder="Lọc theo Tổ (tuỳ chọn)" />
            <a-select v-model:value="stageIds" mode="multiple" allow-clear style="min-width:320px"
                :options="stageOptions" :loading="loadingStages" :max-tag-count="2"
                placeholder="Lọc theo Công đoạn (nhiều)" />
            <a-input v-model:value="q" allow-clear style="width:240px" placeholder="Tìm mã hàng..." />
            <a-checkbox v-model:checked="onlyHasError">Chỉ hiển thị có lỗi</a-checkbox>
        </div>

        <!-- Bảng -->
        <a-table :data-source="paged"
            :pagination="{ current, pageSize, total: filtered.length, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }"
            @change="handleChange" size="middle" bordered
            :row-class-name="(r) => (r.errors || 0) === 0 ? 'row-zero' : ((r.errors > 0 && r.actual === 0) ? 'row-warn' : '')"
            :expandable="{ expandedRowRender }">
            <template #title>
                <div style="font-weight:700">{{ title }}</div>
            </template>
            <!-- Mã hàng + badge -->
            <a-table-column title="Mã hàng" dataIndex="item_code" key="item_code" sorter align="center">
                <template #default="{ text, record }">
                    <div class="code">{{ text }}</div>
                    <div class="subs">
                        <a-tag v-if="(record.errors || 0) === 0" color="green">Không có lỗi</a-tag>
                        <a-tag v-else-if="record.actual === 0" color="orange">Không tìm thấy mã trong năng suất</a-tag>
                    </div>
                </template>
            </a-table-column>

            <!-- Số lượng năng suất (center) -->
            <a-table-column title="Số lượng năng suất" dataIndex="actual" key="actual" sorter align="center"
                width="160" />

            <!-- Số lượng lỗi (center) -->
            <a-table-column title="Số lượng lỗi" dataIndex="errors" key="errors" sorter align="center" width="140" />

            <!-- % lỗi trên sản lượng (center) -->
            <a-table-column title="% lỗi (trên sản lượng)" key="rate" dataIndex="rate" sorter align="center"
                width="180">
                <template #default="{ text }">{{ Number(text || 0).toFixed(percentDigits) }}%</template>
            </a-table-column>

            <!-- % lỗi theo tổ (theo format gạch đầu dòng) -->
            <a-table-column title="% lỗi theo tổ" key="top_team_names" width="300">
                <template #default="{ record }">
                    <div class="multiline" v-if="Array.isArray(record.top_teams) && record.top_teams.length">
                        <div v-for="t in record.top_teams" :key="t.name">
                            - {{ t.name }} ({{ t.qty }} lỗi): {{ Number(t.pct || 0).toFixed(percentDigits) }}%
                        </div>
                    </div>
                    <div v-else>—</div>
                </template>
            </a-table-column>

            <!-- Lỗi chủ yếu (Công đoạn - Mã lỗi) -->
            <a-table-column title="Lỗi chủ yếu (Công đoạn - Mã lỗi )" key="top_pair_label" width="360">
                <template #default="{ record }">
                    <div class="multiline" v-if="Array.isArray(record.top_pairs) && record.top_pairs.length">
                        <div v-for="p in record.top_pairs" :key="p.stage + p.code">
                            - {{ p.stage }} - {{ p.codeLabel }}
                        </div>
                    </div>
                    <div v-else>—</div>
                </template>
            </a-table-column>
        </a-table>
    </div>
</template>

<style scoped>
.toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin: 12px 0
}

.subs {
    margin-top: 4px
}

.multiline>div {
    line-height: 1.35
}

.code {
    font-weight: 600
}

.row-zero td {
    background: #f6ffed !important
}

/* xanh nhạt: không có lỗi */
.row-warn td {
    background: #fff7e6 !important
}

/* cam nhạt: có lỗi nhưng không có sản lượng */
.exp-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.exp-title {
    font-weight: 700;
    margin-bottom: 6px
}

table.mini {
    width: 100%;
    border-collapse: collapse;
}

table.mini th,
table.mini td {
    border: 1px solid #eee;
    padding: 6px 8px;
    font-size: 12px
}

table.mini thead th {
    background: #fafafa;
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
