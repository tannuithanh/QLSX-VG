<template>
    <a-page-header title="Danh mục sản xuất" />

    <template v-if="allowedTabsOrder.length">
        <a-tabs v-model:activeKey="tabKey" class="mt-2">
            <!-- Mã lỗi: yêu cầu ML-E -->
            <a-tab-pane v-if="can('ML-VIEW')" key="ma-loi" tab="Mã lỗi">
                <MaLoiIndex />
            </a-tab-pane>

            <!-- Xưởng: XUONG-VIEW -->
            <a-tab-pane v-if="can('XUONG-VIEW')" key="xuong" tab="Xưởng">
                <XuongIndex />
            </a-tab-pane>

            <!-- Tổ: TO-VIEW -->
            <a-tab-pane v-if="can('TO-VIEW')" key="to" tab="Tổ">
                <ToIndex />
            </a-tab-pane>

            <!-- Công đoạn: CD-VIEW -->
            <a-tab-pane v-if="can('CD-VIEW')" key="cong-doan" tab="Công đoạn">
                <CongDoanIndex />
            </a-tab-pane>

            <!-- Hệ số chuẩn: HSC-VIEW -->
            <a-tab-pane v-if="can('HSC-VIEW')" key="he-so-chuan" tab="Hệ số chuẩn">
                <HeSoChuanIndex />
            </a-tab-pane>

            <!-- Hệ số layout: HSL-VIEW -->
            <a-tab-pane v-if="can('HSL-VIEW')" key="layout" tab="Hệ số layout">
                <Layout />
            </a-tab-pane>

            <!-- Năng suất theo ngày: NSTN-VIEW -->
            <a-tab-pane v-if="can('NSTN-VIEW')" key="nang-suat-theo-ngay" tab="Năng suất theo nhân công">
                <NsTheoNgayIndex />
            </a-tab-pane>

            <!-- Năng suất chuẩn theo layout: NSL-VIEW -->
            <a-tab-pane v-if="can('NSL-VIEW')" key="nang-suat-chuan-theo-layout" tab="Năng suất chuẩn theo layout">
                <NsChuanTheoLayoutIndex />
            </a-tab-pane>

            <!-- Diện tích chuẩn: DTC-VIEW -->
            <a-tab-pane v-if="can('DTC-VIEW')" key="dien-tich-chuan" tab="Diện tích chuẩn">
                <DienTichChuanIndex />
            </a-tab-pane>
        </a-tabs>
    </template>

    <a-result v-else status="403" title="Không có quyền"
        sub-title="Tài khoản của bạn không có quyền truy cập bất kỳ danh mục nào." />
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

import MaLoiIndex from './ma-loi/index.vue'
import XuongIndex from './xuong/index.vue'
import ToIndex from './to/index.vue'
import CongDoanIndex from './cong-doan/index.vue'
import HeSoChuanIndex from './he-so-chuan/index.vue'
import Layout from './lay-out/index.vue'
import NsTheoNgayIndex from './nang-suat-theo-ngay/index.vue'
import NsChuanTheoLayoutIndex from './nang-suat-chuan-theo-layout/index.vue'
import DienTichChuanIndex from './dien-tich-san-pham-chuan/index.vue'

const tabKey = ref('ma-loi')

const auth = useAuthStore()
const { user, meLoaded } = storeToRefs(auth)

// sau dòng: const { user, meLoaded } = storeToRefs(auth)
const isAdmin = computed(() => !!user.value?.is_admin)

// giữ nguyên moduleCodes
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => m.code)))

// ✅ CHỈNH can(): admin thì luôn có quyền
const can = (code) => isAdmin.value || moduleCodes.value.has(code)


/** Thứ tự ưu tiên tab khả dụng dựa trên quyền hiện tại */
const allowedTabsOrder = computed(() => {
    const order = []
    if (can('ML-VIEW')) order.push('ma-loi')
    if (can('XUONG-VIEW')) order.push('xuong')
    if (can('TO-VIEW')) order.push('to')
    if (can('CD-VIEW')) order.push('cong-doan')
    if (can('HSC-VIEW')) order.push('he-so-chuan')
    if (can('HSL-VIEW')) order.push('layout')
    if (can('NSTN-VIEW')) order.push('nang-suat-theo-ngay')
    if (can('NSL-VIEW')) order.push('nang-suat-chuan-theo-layout')
    if (can('DTC-VIEW')) order.push('dien-tich-chuan')
    return order
})

/** đảm bảo tab active luôn là tab hợp lệ */
function ensureActiveTab() {
    const list = allowedTabsOrder.value
    if (!list.length) return
    if (!list.includes(tabKey.value)) {
        tabKey.value = list[0]
    }
}

onMounted(async () => {
    if (auth.token && !meLoaded.value) {
        await auth.fetchMe()
    }
    ensureActiveTab()
})

watch([meLoaded, moduleCodes, isAdmin], () => {
    if (!meLoaded.value) return
    ensureActiveTab()
})
</script>

<style scoped>
.mt-2 {
    margin-top: 8px;
}
</style>
