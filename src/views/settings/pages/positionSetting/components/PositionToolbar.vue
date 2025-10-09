<template>
    <div class="toolbar">
        <div class="toolbar-left">
            <a-input v-model:value="local.search" allow-clear placeholder="Tìm theo tên chức vụ…" style="width: 280px">
                <template #prefix>
                    <SearchOutlined />
                </template>
            </a-input>
        </div>

        <a-space>
            <a-button @click="$emit('reload')" :loading="loading" ghost>
                <template #icon>
                    <ReloadOutlined />
                </template>
                Tải lại
            </a-button>
            <a-button type="primary" @click="$emit('create')">
                <template #icon>
                    <PlusOutlined />
                </template>
                Thêm chức vụ
            </a-button>
        </a-space>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'

const props = defineProps({
    search: String,
    loading: Boolean,
})
const emit = defineEmits(['update:search', 'reload', 'create'])

const local = reactive({ search: props.search || '' })
watch(() => local.search, v => emit('update:search', v))
</script>

<style scoped>
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    flex-wrap: wrap
}

.toolbar-left {
    display: flex;
    gap: 12px;
    flex-wrap: wrap
}
</style>
