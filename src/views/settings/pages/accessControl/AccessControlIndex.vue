<template>
    <div class="stack">
        <!-- CARD 1: QUẢN LÝ MODULE -->
        <a-card :bordered="false" class="card">
            <div class="card-head">
                <div class="title">Danh sách module</div>
                <a-space>
                    <a-button type="primary" @click="openModuleForm()">+ Thêm module</a-button>
                </a-space>
            </div>

            <ModuleToolbar v-model:keyword="moduleKeyword" :loading="loading.modules" @reload="loadModules"
                @create="openModuleForm()" />

            <!-- Truyền rows đã cắt trang + pagination có total -->
            <ModuleTable :rows="paginatedRows" :loading="loading.modules" :pagination="tablePagination"
                @change="onTableChange" @edit="openModuleForm" @delete="onDeleteModule" />
        </a-card>

        <ModuleFormModal v-model:visible="moduleFormOpen" :mode="isEditModule ? 'edit' : 'create'"
            :initial="editingModule" @submit="onSaveModule" @cancel="moduleFormOpen = false" />

        <!-- CARD 2: VAI TRÒ & PHÂN QUYỀN -->
        <a-card :bordered="false" class="card">
            <div class="card-head">
                <div class="title">Vai trò & Phân quyền</div>
                <a-button type="primary" @click="openAssign()">+ Phân quyền</a-button>
            </div>
            <RolePermissionTable ref="permTableRef" @edit="openAssignFromRow" @cleared="" />
        </a-card>

        <PermissionAssignModal v-model:visible="permOpen" :initial-role-id="prefill.roleId"
            :initial-module-id="prefill.moduleId" @done="refreshPermissions" />
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { message, notification } from 'ant-design-vue'
import { moduleApi } from '@/services/user_service/moduleService'
import ModuleToolbar from '@/views/settings/pages/accessControl/components/ModuleToolbar.vue'
import ModuleTable from '@/views/settings/pages/accessControl/components/ModuleTable.vue'
import ModuleFormModal from '@/views/settings/pages/accessControl/components/ModuleFormModal.vue'
import PermissionAssignModal from '@/views/settings/pages/accessControl/components/PermissionAssignModal.vue'
import RolePermissionTable from '@/views/settings/pages/accessControl/components/RolePermissionTable.vue'

const loading = reactive({ modules: false })
const modules = ref([])
const moduleKeyword = ref('')

const moduleFormOpen = ref(false)
const isEditModule = ref(false)
const editingModule = ref(null)

function openModuleForm(record) {
    if (record) { isEditModule.value = true; editingModule.value = { ...record } }
    else { isEditModule.value = false; editingModule.value = null }
    moduleFormOpen.value = true
}

async function onSaveModule(payload) {
    try {
        if (isEditModule.value && editingModule.value?.id) {
            await moduleApi.update(editingModule.value.id, payload)
            notification.success({ message: 'Đã cập nhật module' })
        } else {
            await moduleApi.create(payload)
            notification.success({ message: 'Đã tạo module' })
        }
        moduleFormOpen.value = false
        await loadModules()
        refreshPermissions()
    } catch (e) {
        message.error(e?.response?.data?.message || 'Lưu module không thành công')
    }
}

async function onDeleteModule(id) {
    try {
        await moduleApi.remove(id)
        modules.value = modules.value.filter(m => m.id !== id)
        message.success('Đã xoá module')
        refreshPermissions()
    } catch (e) {
        message.error(e?.response?.data?.message || 'Xoá module không thành công')
    }
}

async function loadModules() {
    loading.modules = true
    try {
        // Lấy full list, filter/paginate ở client
        const { data } = await moduleApi.list()
        modules.value = Array.isArray(data) ? data : []
    } catch (e) {
        message.error(e?.response?.data?.message || 'Không tải được danh sách module')
    } finally {
        loading.modules = false
    }
}

/* ---------- Search + Pagination (client) ---------- */
const pager = reactive({ current: 1, pageSize: 10 })

const filtered = computed(() => {
    const q = (moduleKeyword.value || '').trim().toLowerCase()
    if (!q) return modules.value
    return modules.value.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.code || '').toLowerCase().includes(q)
    )
})

const paginatedRows = computed(() => {
    const start = (pager.current - 1) * pager.pageSize
    return filtered.value.slice(start, start + pager.pageSize)
})

const tablePagination = computed(() => ({
    current: pager.current,
    pageSize: pager.pageSize,
    total: filtered.value.length,     // <-- QUAN TRỌNG: phải có total
    showSizeChanger: true,
    showQuickJumper: true
}))

function onTableChange(pag) {
    if (pag?.pageSize && pag.pageSize !== pager.pageSize) {
        pager.pageSize = pag.pageSize
        pager.current = 1
    }
    if (pag?.current) pager.current = pag.current
}

// Gõ tìm kiếm -> về trang 1
watch(moduleKeyword, () => { pager.current = 1 })

/* ---------- Phân quyền ---------- */
const permOpen = ref(false)
const prefill = ref({ roleId: null, moduleId: null })
const permTableRef = ref(null)

function openAssign() {
    prefill.value = { roleId: null, moduleId: null }
    permOpen.value = true
}
function openAssignFromRow({ roleId, moduleId }) {
    prefill.value = { roleId, moduleId }
    permOpen.value = true
}
function refreshPermissions() {
    permTableRef.value?.reload()
}

onMounted(loadModules)
</script>

<style scoped>
.stack {
    display: grid;
    gap: 16px;
}

.card {
    min-width: 0;
}

.card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.title {
    font-weight: 600;
    font-size: 16px;
}
</style>
