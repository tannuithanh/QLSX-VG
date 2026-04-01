<template>
    <div>
        <div v-if="isMobile" class="mobile-card-list">
            <a-card v-for="(record, index) in rows.slice((current-1)*pageSize, current*pageSize)" :key="record.key" class="report-mobile-card shadow-sm" size="small">
                <template #title>
                    <div class="card-title-wrap">
                        <span class="stt">#{{ (current - 1) * pageSize + index + 1 }}</span>
                        <span class="item-code">{{ record.item_code }}</span>
                    </div>
                </template>
                <div class="card-content">
                    <div class="info-line">
                        <span class="label">Xưởng/Tổ:</span>
                        <span class="value">{{ record.workshop_name }} / {{ record.team_name }}</span>
                    </div>
                    <div class="data-grid">
                        <div class="data-item highlight">
                            <div class="label">SL thực tế</div>
                            <div class="value">{{ formatInt(record.total_qty_actual) }}</div>
                        </div>
                        <div class="data-item">
                            <div class="label">SLSP Năng suất</div>
                            <div class="value">
                                <span v-if="record.slsp_nang_suat_note" class="error-note">{{ record.slsp_nang_suat_note }}</span>
                                <span v-else>{{ record.slsp_nang_suat != null ? formatInt(record.slsp_nang_suat) : '—' }}</span>
                            </div>
                        </div>
                        <div class="data-item">
                            <div class="label">SLSP Layout</div>
                            <div class="value">
                                <span v-if="record.slsp_layout_note" class="error-note">{{ record.slsp_layout_note }}</span>
                                <span v-else>{{ record.slsp_layout != null ? formatInt(record.slsp_layout) : '—' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </a-card>
            <a-empty v-if="rows.length === 0" description="Không có dữ liệu"/>
        </div>

        <a-table v-else :data-source="rows" :loading="loading" :pagination="pagination" row-key="key" class="report-table">
            <a-table-column key="stt" title="STT" width="80px" :customRender="renderIndex" align="center" />

            <a-table-column key="workshop_name" dataIndex="workshop_name" title="Xưởng" align="center" />
            <a-table-column key="team_name" dataIndex="team_name" title="Tổ" align="center" />
            <a-table-column key="item_code" dataIndex="item_code" title="Mã hàng" align="center" />

            <a-table-column key="total_qty_actual" dataIndex="total_qty_actual" title="Số lượng thực tế"
                :customRender="({ text }) => formatInt(text)" align="center" />

            <a-table-column key="slsp_nang_suat" dataIndex="slsp_nang_suat" title="SLSP theo năng suất"
                :customRender="renderNangSuat" align="center" />

            <a-table-column key="slsp_layout" dataIndex="slsp_layout" title="SLSP theo layout" :customRender="renderLayout"
                align="center" />
        </a-table>

        <!-- Phân trang Mobile -->
        <div v-if="isMobile && rows.length > 0" class="mobile-pagination mt-3">
            <a-pagination
                v-model:current="pageInternal"
                :total="rows.length"
                :page-size="pageSize"
                size="small"
                show-less-items
                @change="(p) => emits('update:current', p)"
            />
        </div>
    </div>
</template>

<script setup>
import { computed, h } from "vue";

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    pageSize: { type: Number, default: 10 },
    current: { type: Number, default: 1 },
    isMobile: { type: Boolean, default: false },
});
const emits = defineEmits(["update:pageSize", "update:current"]);

const pageInternal = computed({
    get: () => props.current,
    set: (v) => emits("update:current", v)
})

const pagination = computed(() => ({
    pageSize: props.pageSize,
    current: props.current,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    position: ["bottomCenter"],
    showTotal: (total, range) => `${range[0]}–${range[1]} / ${total}`,
    onChange: (page, size) => {
        emits("update:current", page);
        emits("update:pageSize", size);
    },
    onShowSizeChange: (_current, size) => {
        emits("update:pageSize", size);
        emits("update:current", 1);
    },
}));

function renderIndex({ index }) {
    const start = (props.current - 1) * props.pageSize;
    return start + index + 1;
}

// ✅ Format số nguyên (bỏ phần thập phân)
function formatInt(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "—";
    return Math.round(num).toLocaleString("vi-VN");
}

// ✅ Render cột năng suất
function renderNangSuat({ record }) {
    if (record.slsp_nang_suat_note) {
        return h("span", { style: "color:red" }, record.slsp_nang_suat_note);
    }
    if (record.slsp_nang_suat == null) return "—";
    return formatInt(record.slsp_nang_suat);
}

// ✅ Render cột layout
function renderLayout({ record }) {
    if (record.slsp_layout_note) {
        return h("span", { style: "color:red" }, record.slsp_layout_note);
    }
    if (record.slsp_layout == null) return "—";
    return formatInt(record.slsp_layout);
}
</script>

<style scoped>
.report-table {
    font-size: 14px;
}

.mobile-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.report-mobile-card {
    border-radius: 8px;
    border-left: 5px solid #c06252;
}

.card-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
}

.stt {
    background: #c06252;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.item-code {
    font-weight: 700;
    color: #ffffff;
}

.card-content {
    padding: 4px 0;
}

.info-line {
    margin-bottom: 12px;
    font-size: 14px;
}

.label {
    color: #8c8c8c;
    margin-right: 8px;
}

.data-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.data-item {
    display: flex;
    flex-direction: column;
}

.data-item.highlight {
    grid-column: span 2;
    background: #fff1f0;
    padding: 8px;
    border-radius: 6px;
}

.data-item .label {
    font-size: 12px;
}

.data-item .value {
    font-weight: 600;
    font-size: 15px;
}

.highlight .value {
    font-size: 18px;
    color: #cf1322;
}

.error-note {
    color: #ff4d4f;
    font-size: 12px;
    font-style: italic;
}

.mobile-pagination {
    display: flex;
    justify-content: center;
}

.mt-3 {
    margin-top: 12px;
}

@media (max-width: 768px) {
    .report-table {
        display: none;
    }
}
</style>
