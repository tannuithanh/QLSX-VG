<template>
    <a-modal v-model:visible="visibleInner" title="Xem trước tạo mã theo bộ S" :width="920" :confirm-loading="applying"
        @ok="onApply" @cancel="$emit('cancel')" ok-text="Áp dụng" cancel-text="Đóng">
        <div class="section">
            <h3>✅ Các mã tạo ra từ bộ S ({{ createCount }} mới)</h3>
            <a-empty v-if="!data?.to_create?.length" description="Không có mã mới" />
            <a-table v-else :data-source="data.to_create" :columns="colsCreate" :pagination="false" size="small"
                row-key="item_code" />
        </div>

        <div class="section">
            <h3>♻️ Các mã sẽ ghi đè sắp tới ({{ updateCount }})</h3>
            <a-empty v-if="!data?.to_update?.length" description="Không có mã ghi đè" />
            <a-table v-else :data-source="data.to_update" :columns="colsUpdate" :pagination="false" size="small"
                row-key="item_code" />
        </div>

        <div class="section">
            <h3>⚠️ Các mã lỗi ({{ errorCount }})</h3>
            <a-empty v-if="!data?.errors?.length" description="Không có lỗi" />
            <ul v-else class="errors">
                <li v-for="(e, i) in data.errors" :key="i">{{ e }}</li>
            </ul>
        </div>
    </a-modal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    visible: { type: Boolean, default: false },
    data: { type: Object, default: () => ({ to_create: [], to_update: [], errors: [] }) },
    applying: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible', 'apply', 'cancel'])

const visibleInner = computed({
    get: () => props.visible,
    set: v => emit('update:visible', v),
})

const createCount = computed(() => props.data?.to_create?.length || 0)
const updateCount = computed(() => props.data?.to_update?.length || 0)
const errorCount = computed(() => props.data?.errors?.length || 0)

const colsCreate = [
    { title: 'Mã', dataIndex: 'item_code' },
    { title: 'Diện tích (m²) mới', dataIndex: 'new_coefficient', align: 'right' },
    { title: 'Nguồn', key: 'sources', customRender: ({ record }) => (record.sources || []).join(', ') },
]
const colsUpdate = [
    { title: 'Mã', dataIndex: 'item_code' },
    { title: 'Diện tích cũ', dataIndex: 'old_coefficient', align: 'right' },
    { title: 'Diện tích mới', dataIndex: 'new_coefficient', align: 'right' },
    { title: 'Nguồn', key: 'sources', customRender: ({ record }) => (record.sources || []).join(', ') },
]

function onApply() {
    emit('apply')
}
</script>

<style scoped>
.section {
    margin-bottom: 16px;
}

.errors {
    margin: 8px 16px;
}
</style>
