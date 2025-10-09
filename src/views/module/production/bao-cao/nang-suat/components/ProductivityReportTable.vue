<template>
    <a-table :data-source="rows" :loading="loading" :pagination="pagination" row-key="key" class="report-table">
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
</template>

<script setup>
import { computed, h } from "vue";

const props = defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    pageSize: { type: Number, default: 10 },
    current: { type: Number, default: 1 },
});
const emits = defineEmits(["update:pageSize", "update:current"]);

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
</style>
