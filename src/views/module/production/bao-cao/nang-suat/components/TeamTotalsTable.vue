<template>
    <a-table :data-source="rows" :loading="loading" row-key="key" :pagination="false" class="report-table">
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
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
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
</style>
