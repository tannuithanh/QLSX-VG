<template>
    <div class="toolbar">
        <a-space wrap>
            <span>Vai trò:</span>
            <a-select v-model:value="roleIdModel" :options="roleOptions" :loading="loadingRoles" style="min-width:280px"
                placeholder="Chọn vai trò" allow-clear show-search :filter-option="filterOption"
                @change="val => $emit('change-role', val)" />

            <span v-if="!!roleIdModel">Module:</span>
            <a-select v-if="!!roleIdModel" v-model:value="moduleIdsModel" :options="moduleOptions" mode="multiple"
                allow-clear show-search style="min-width:360px" placeholder="Chọn module của vai trò"
                :filter-option="filterOption" @change="vals => $emit('change-modules', vals)" />

            <a-button type="primary" :loading="saving" :disabled="disableSave" @click="$emit('save')">
                Lưu thay đổi
            </a-button>
        </a-space>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    roleId: [Number, String, null],
    roleOptions: { type: Array, default: () => [] },      // [{value,label}]
    moduleOptions: { type: Array, default: () => [] },    // [{value,label}] thuộc Role
    selectedModuleIds: { type: Array, default: () => [] },// number[]
    loadingRoles: Boolean,
    saving: Boolean,
    canSave: { type: Boolean, default: true },
})
defineEmits(['change-role', 'change-modules', 'save'])

const roleIdModel = ref(props.roleId)
const moduleIdsModel = ref(props.selectedModuleIds)

watch(() => props.roleId, v => (roleIdModel.value = v))
watch(() => props.selectedModuleIds, v => (moduleIdsModel.value = v))

const filterOption = (input, option) =>
    (option?.label ?? '').toLowerCase().includes((input || '').toLowerCase())

const disableSave = computed(() => props.saving || !props.canSave)
</script>

<style scoped>
.toolbar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
}

.toolbar :deep(.ant-space) {
    width: 100%;
    gap: 8px 12px;
    align-items: center;
}

.toolbar span {
    color: #444;
    font-weight: 500;
}

.toolbar :deep(.ant-select) {
    min-width: 280px;
}

.toolbar :deep(.ant-select-selector) {
    min-height: 36px;
}

.toolbar :deep(.ant-btn-primary) {
    min-width: 140px;
    height: 36px;
}

@media (max-width: 768px) {
    .toolbar {
        padding: 8px 10px;
    }

    .toolbar :deep(.ant-select) {
        min-width: 220px;
        width: 100%;
    }

    .toolbar :deep(.ant-btn) {
        width: 100%;
    }
}
</style>
