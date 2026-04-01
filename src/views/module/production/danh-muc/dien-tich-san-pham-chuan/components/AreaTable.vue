<template>
    <div v-if="isMobile" class="mobile-card-list">
        <a-card v-for="(record, index) in rows" :key="record.id" class="mobile-card" size="small">
            <template #title>
                <div class="card-title">
                    <span class="stt">ID: {{ record.id }}</span>
                    <a-tag v-if="record.is_selected" color="success">Mặc định</a-tag>
                </div>
            </template>
            <template #extra v-if="canEdit && !record.is_selected">
                <a-button type="primary" size="small" @click="$emit('selectDefault', record)">
                    Chọn mặc định
                </a-button>
            </template>

            <div class="card-content">
                <div class="info-row highlight">
                    <span class="label">Diện tích chuẩn:</span>
                    <span class="value">{{ formatNumber(record.standard_area, 4) }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Cập nhật bởi:</span>
                    <span class="value">{{ record.updated_by || '—' }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Cập nhật lúc:</span>
                    <span class="value">{{ formatDateTime(record.updated_at) }}</span>
                </div>
            </div>
        </a-card>

        <div v-if="rows.length === 0" class="empty-state">
            <a-empty description="Không có dữ liệu" />
        </div>
    </div>

    <a-table v-else :data-source="rows" :loading="loading" row-key="id" :pagination="false">
        <a-table-column key="id" dataIndex="id" title="ID" align="center" />
        <a-table-column key="standard_area" dataIndex="standard_area" title="Diện tích chuẩn" align="center"
            :customRender="({ text }) => formatNumber(text, 4)" />
        <a-table-column key="is_selected" dataIndex="is_selected" title="Mặc định" align="center"
            :customRender="({ text }) => (text ? '✓' : '—')" />
        <a-table-column key="updated_by" dataIndex="updated_by" title="Cập nhật bởi" align="center" />
        <a-table-column key="updated_at" dataIndex="updated_at" title="Cập nhật lúc" align="center"
            :customRender="({ text }) => formatDateTime(text)" />
        <a-table-column key="actions" title="Thao tác" align="center" :width="160">
            <template #default="{ record }">
                <a-button v-if="canEdit" type="default" size="small" :disabled="record.is_selected"
                    @click="$emit('selectDefault', record)">
                    {{ record.is_selected ? 'Đang mặc định' : 'Chọn mặc định' }}
                </a-button>
            </template>
        </a-table-column>
    </a-table>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
})

const isMobile = ref(false)
const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
}

onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
})

function formatNumber(n, frac = 2) {
    const num = Number(n)
    if (Number.isNaN(num)) return '0'
    return num.toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })
}

function formatDateTime(s) {
    if (!s) return '—'
    try {
        const d = new Date(s)
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return `${hh}:${mi} ${dd}/${mm}/${yyyy}`
    } catch { return s }
}
</script>

<style scoped>
.mobile-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mobile-card {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;
}

.card-title {
    display: flex;
    gap: 10px;
    align-items: center;
}

.stt {
    font-size: 11px;
    font-weight: bold;
    color: white;
}

.info-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 4px;
}

.info-row .label {
    color: #8c8c8c;
}

.info-row .value {
    color: #262626;
    font-weight: 500;
}

.info-row.highlight .value {
    color: #c06252;
    font-weight: 700;
    font-size: 14px;
}

.empty-state {
    padding: 32px 0;
    background: #fff;
    border-radius: 8px;
}
</style>
