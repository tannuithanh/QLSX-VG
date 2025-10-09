<template>
    <a-card :loading="loading" :bordered="false" body-style="padding:8px 12px">
        <a-transfer :data-source="dataSource" v-model:target-keys="model" :show-search="true"
            :list-style="{ width: '100%', height: '540px' }" :titles="['Chưa gán', 'Đã gán']" :render="item => item.title"
            :disabled="disabled" :one-way="false" :locale="{
                itemUnit: 'user',
                itemsUnit: 'users',
                searchPlaceholder: 'Tìm người dùng...',
                notFoundContent: 'Không có dữ liệu'
            }">
            <template #footer="{ direction }">
                <div class="tf-footer">
                    <template v-if="direction === 'left'">{{ leftCount }} users</template>
                    <template v-else>{{ rightCount }} users</template>
                </div>
            </template>
        </a-transfer>
    </a-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    dataSource: { type: Array, default: () => [] },
    targetKeys: { type: Array, default: () => [] },
    loading: Boolean,
    disabled: Boolean,
})

const emit = defineEmits(['update:targetKeys'])

const model = computed({
    get: () => props.targetKeys,
    set: v => emit('update:targetKeys', v),
})

const leftCount = computed(() =>
    props.dataSource.filter(x => !props.targetKeys.includes(x.key)).length
)
const rightCount = computed(() =>
    props.dataSource.filter(x => props.targetKeys.includes(x.key)).length
)
</script>

<style scoped>
:deep(.ant-card-body) {
    padding: 8px 12px !important;
}

:deep(.ant-transfer) {
    width: 100%;
}

:deep(.ant-transfer-list) {
    width: 100% !important;
    height: 540px !important;
    border-radius: 8px;
}

:deep(.ant-transfer-operation) {
    margin: 0 8px;
}

:deep(.ant-transfer-list-header) {
    padding: 8px 12px;
    font-weight: 600;
    color: #444;
}

:deep(.ant-transfer-list-search) {
    margin: 8px 12px;
}

:deep(.ant-transfer-list-content-item) {
    padding: 6px 10px;
    border-radius: 6px;
}

.tf-footer {
    padding: 6px 8px;
    background: #fafafa;
    border-top: 1px solid #f0f0f0;
    color: #999;
}

:deep(.ant-transfer-disabled) {
    opacity: 0.65;
    pointer-events: none;
}

@media (max-width: 768px) {
    :deep(.ant-transfer-list) {
        height: 420px !important;
    }
}
</style>
