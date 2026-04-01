<template>
    <div>
        <div v-if="isMobile" class="mobile-card-list">
            <a-card v-for="record in rows" :key="record.key" class="total-mobile-card shadow-sm" size="small">
                <template #title>
                    <div class="team-title">{{ record.workshop_name }} / {{ record.team_name }}</div>
                </template>
                <div class="total-card-body">
                    <div class="total-row highlight">
                        <span class="label">Tổng SL thực tế:</span>
                        <span class="value">{{ formatNumber(record.total_qty_actual, 0) }}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">SLSP Năng suất:</span>
                        <span class="value">{{ formatNumber(record.total_slsp_nang_suat, 0) }}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">SLSP Layout:</span>
                        <span class="value">{{ formatNumber(record.total_slsp_layout, 0) }}</span>
                    </div>
                </div>
            </a-card>

            <!-- Card Tổng cộng -->
            <a-card v-if="rows.length > 0" class="grand-total-card" size="small">
                <div class="grand-title">TỔNG CỘNG</div>
                <div class="total-card-body">
                    <div class="total-row highlight">
                        <span class="label">Tổng SL thực tế:</span>
                        <span class="value">{{ formatNumber(totals.total_qty_actual, 0) }}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">SLSP Năng suất:</span>
                        <span class="value">{{ formatNumber(totals.total_slsp_nang_suat, 0) }}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">SLSP Layout:</span>
                        <span class="value">{{ formatNumber(totals.total_slsp_layout, 0) }}</span>
                    </div>
                </div>
            </a-card>
            <a-empty v-if="rows.length === 0" description="Không có dữ liệu"/>
        </div>

        <a-table v-else :data-source="rows" :loading="loading" row-key="key" :pagination="false" class="report-table">
            <a-table-column key="workshop_name" dataIndex="workshop_name" title="Xưởng" align="center" />
            <a-table-column key="team_name" dataIndex="team_name" title="Tổ" align="center" />

            <a-table-column key="total_qty_actual" dataIndex="total_qty_actual" title="Tổng SL thực tế"
                :customRender="({ text }) => formatNumber(text, 0)" align="center" />

            <a-table-column key="total_slsp_nang_suat" dataIndex="total_slsp_nang_suat" title="Tổng SLSP theo năng suất"
                :customRender="({ text }) => formatNumber(text, 0)" align="center" />

            <a-table-column key="total_slsp_layout" dataIndex="total_slsp_layout" title="Tổng SLSP theo layout"
                :customRender="({ text }) => formatNumber(text, 0)" align="center" />

            <!-- Dòng TỔNG CỘNG -->
            <template #summary>
                <a-table-summary fixed>
                    <a-table-summary-row>
                        <a-table-summary-cell :index="0" :colSpan="2">
                            <strong>Tổng cộng</strong>
                        </a-table-summary-cell>
                        <a-table-summary-cell :index="2" align="center">
                            {{ formatNumber(totals.total_qty_actual, 0) }}
                        </a-table-summary-cell>
                        <a-table-summary-cell :index="3" align="center">
                            {{ formatNumber(totals.total_slsp_nang_suat, 0) }}
                        </a-table-summary-cell>
                        <a-table-summary-cell :index="4" align="center">
                            {{ formatNumber(totals.total_slsp_layout, 0) }}
                        </a-table-summary-cell>
                    </a-table-summary-row>
                </a-table-summary>
            </template>
        </a-table>
    </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    isMobile: { type: Boolean, default: false },
});

// ✅ chỉ tính 3 cột chính
const totals = computed(() => {
    const init = {
        total_qty_actual: 0,
        total_slsp_nang_suat: 0,
        total_slsp_layout: 0,
    };
    return (props.rows || []).reduce((acc, r) => {
        acc.total_qty_actual += Number(r.total_qty_actual || 0);
        acc.total_slsp_nang_suat += Number(r.total_slsp_nang_suat || 0);
        acc.total_slsp_layout += Number(r.total_slsp_layout || 0);
        return acc;
    }, init);
});

// ✅ làm tròn số nguyên (bỏ thập phân)
function formatNumber(n, frac = 0) {
    const num = Number(n);
    if (Number.isNaN(num)) return "0";
    return num.toLocaleString("vi-VN", {
        minimumFractionDigits: frac,
        maximumFractionDigits: frac,
    });
}
</script>

<style scoped>
:deep(.ant-table-thead > tr > th) {
    background: #f0f2f5;
    color: #333;
    text-align: center;
    white-space: nowrap;
}

:deep(.ant-table-tbody > tr > td) {
    text-align: center;
    vertical-align: middle;
}

:deep(.ant-table-tbody > tr > td),
:deep(.ant-table-thead > tr > th) {
    padding: 10px 8px;
}

:deep(.ant-table-container) {
    border-radius: 6px;
    overflow: hidden;
}

.mobile-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.total-mobile-card {
    border-radius: 8px;
    border-top: 3px solid #1890ff;
}

.team-title {
    font-weight: 700;
    color: #ffffff;
    margin-left: 4px;
}

.total-card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.total-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
}

.total-row.highlight {
    background: #e6f7ff;
    padding: 6px 8px;
    border-radius: 4px;
}

.total-row .label {
    color: #595959;
}

.total-row .value {
    font-weight: 600;
    color: #262626;
}

.highlight .value {
    color: #096dd9;
    font-size: 16px;
}

.grand-total-card {
    background: #001529;
    border-radius: 8px;
    margin-top: 8px;
}

.grand-title {
    color: #ffd666;
    font-weight: 800;
    font-size: 16px;
    margin-bottom: 12px;
    text-align: center;
}

.grand-total-card .label {
    color: #bfbfbf;
}

.grand-total-card .value {
    color: #ffffff;
}

.grand-total-card .total-row.highlight {
    background: rgba(24, 144, 255, 0.2);
}

.grand-total-card .highlight .value {
    color: #ffd666;
}

@media (max-width: 768px) {
    .report-table {
        display: none;
    }
}
</style>
