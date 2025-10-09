<template>
    <div class="toolbar">
        <a-input v-model:value="local.keyword" allow-clear placeholder="Tìm tên/mã module…" style="max-width: 320px">
            <template #prefix>
                <SearchOutlined />
            </template>
        </a-input>

        <a-space>
            <a-button :loading="loading" @click="$emit('reload')" ghost>
                <template #icon>
                    <ReloadOutlined />
                </template>
                Tải lại
            </a-button>
        </a-space>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'

const props = defineProps({
    loading: Boolean,
    keyword: String,
})
const emit = defineEmits(['update:keyword', 'reload', 'create'])

const local = reactive({ keyword: props.keyword || '' })
watch(() => local.keyword, v => emit('update:keyword', v))
</script>

<style scoped>
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}
</style>
