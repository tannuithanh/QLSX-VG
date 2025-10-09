<template>
    <div class="page">
        <UserRoleToolbar :role-id="roleId" :role-options="roleOptions" :loading-roles="loading.roles" :saving="saving"
            @change-role="onChangeRole" @save="onSave" />

        <a-card class="scope-card" size="small" :loading="loading.modules" :bordered="false">
            <a-space direction="vertical" style="width:100%">
                <a-checkbox v-model:checked="scoped">
                    Chỉ áp dụng cho module được chọn
                </a-checkbox>

                <a-select v-if="scoped" v-model:value="selectedModuleIds" :options="moduleOptions" mode="multiple"
                    allow-clear show-search :filter-option="filterOption" placeholder="Chọn 1 hoặc nhiều module..."
                    style="min-width: 480px; max-width: 100%" />
                <div v-else class="muted">
                    (Không chọn module ⇒ gán role cho user trên TẤT CẢ module)
                </div>
            </a-space>
        </a-card>

        <UserRoleTable :data-source="usersForTransfer" v-model:target-keys="targetKeys"
            :loading="loading.users || loading.current" />
    </div>
</template>

<script setup>
import { ref,  onMounted } from 'vue'
import { message, notification } from 'ant-design-vue'
import UserRoleToolbar from './components/UserRoleToolbar.vue'
import UserRoleTable from './components/UserRoleTable.vue'

import { roleApi } from '@/services/user_service/roleService'
import { userApi } from '@/services/user_service/userService'
import { moduleApi } from '@/services/user_service/moduleService'
import { permissionApi } from '@/services/user_service/permissionService'

const loading = ref({ roles: false, users: false, modules: false })
const saving = ref(false)

const roleId = ref(null)
const roleOptions = ref([])
const allUsers = ref([])
const targetKeys = ref([])

const scoped = ref(false)
const selectedModuleIds = ref([])
const moduleOptions = ref([])

onMounted(async () => {
    await Promise.all([loadRoles(), loadUsers(), loadModules()])
})

async function loadRoles() {
    loading.value.roles = true
    try {
        const { data } = await roleApi.list()
        roleOptions.value = data.map(r => ({ value: r.id, label: r.name }))
    } finally { loading.value.roles = false }
}

async function loadUsers() {
    loading.value.users = true
    try {
        const { data } = await userApi.list()
        allUsers.value = data
    } finally { loading.value.users = false }
}

async function loadModules() {
    loading.value.modules = true
    try {
        const { data } = await moduleApi.list()
        moduleOptions.value = data.map(m => ({ value: m.id, label: m.name }))
    } finally { loading.value.modules = false }
}

async function onChangeRole(rid) {
    roleId.value = rid || null
    targetKeys.value = []
    scoped.value = false
    selectedModuleIds.value = []
}

async function onSave() {
    if (!roleId.value && !scoped.value) {
        return message.warning('Chọn vai trò trước khi lưu')
    }
    if (targetKeys.value.length === 0) {
        return message.warning('Chọn ít nhất 1 người dùng trước khi lưu')
    }

    const rid = Number(roleId.value) || null
    const selectedUserIds = targetKeys.value.map(x => Number(x))

    saving.value = true
    try {
        const response = await permissionApi.addUserRoles({
            user_id: selectedUserIds,
            role_id: rid,
            module_id: scoped.value ? selectedModuleIds.value : null
        })

        notification.success({ message: 'Đã lưu thay đổi' })
        emit('done')
        emit('update:visible', false)
    } catch (error) {
        console.error("Save error:", error)
        message.error(error.response?.data?.message || 'Lưu không thành công')
    } finally {
        saving.value = false
    }
}
</script>



<style scoped>
.label {
    font-weight: 600;
    margin-bottom: 6px;
}

.req {
    color: #ff4d4f;
}

.muted {
    color: #888;
    font-size: 12px;
}

.hint {
    color: #666;
    font-size: 12px;
}
</style>
