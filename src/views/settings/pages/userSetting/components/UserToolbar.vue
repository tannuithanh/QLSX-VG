<template>
    <div class="toolbar">
        <div class="toolbar-left">
            <a-input v-model:value="local.search" allow-clear placeholder="Tìm tên, mã NV, email, SĐT…"
                style="width: 280px">
                <template #prefix>
                    <SearchOutlined />
                </template>
            </a-input>

            <a-select v-model:value="local.dept" style="width: 200px" :options="deptOptions" placeholder="Lọc phòng ban"
                allow-clear>
                <template #suffixIcon>
                    <FilterOutlined />
                </template>
            </a-select>

            <!-- 👇 Đổi thành INPUT tự do -->
            <a-input v-model:value="local.unit" allow-clear placeholder="Lọc chức vụ chi tiết" style="width: 200px">
                <template #prefix>
                    <FilterOutlined />
                </template>
            </a-input>

            <a-select v-model:value="local.admin" style="width: 160px" :options="adminOptions" placeholder="Lọc admin"
                allow-clear>
                <template #suffixIcon>
                    <FilterOutlined />
                </template>
            </a-select>
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
                Thêm người dùng
            </a-button>
        </a-space>
    </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { PlusOutlined, ReloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons-vue'

const props = defineProps({
    search: String,
    dept: [String, Number],
    unit: String,                 // 👈 vẫn nhận v-model:unit
    admin: Boolean,
    deptOptions: Array,
    adminOptions: Array,
    loading: Boolean,
})

const emit = defineEmits(['update:search', 'update:dept', 'update:unit', 'update:admin', 'reload', 'create'])

const local = reactive({
    search: props.search || '',
    dept: props.dept,
    unit: props.unit || '',       // 👈 text
    admin: props.admin,
})

watch(() => local.search, v => emit('update:search', v))
watch(() => local.dept, v => emit('update:dept', v))
watch(() => local.unit, v => emit('update:unit', v))
watch(() => local.admin, v => emit('update:admin', v))
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
