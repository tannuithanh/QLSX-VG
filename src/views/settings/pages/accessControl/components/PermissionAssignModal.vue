<template>
    <a-modal v-model:visible="open" title="Phân quyền cho vai trò" width="520px" :confirm-loading="saving" @ok="onSave"
        @cancel="resetState">
        <div class="field">
            <div class="label">Chọn vai trò</div>
            <a-select v-model:value="roleId" :options="roleOptions" :loading="loading.roles" placeholder="-- Vai trò --"
                allow-clear style="width:100%" />
        </div>

        <div class="field">
            <div class="label">Chọn module</div>
            <a-select v-model:value="moduleId" :options="moduleOptions" :loading="loading.modules"
                placeholder="-- Module --" allow-clear style="width:100%" />
        </div>

        <div class="field">
            <div class="label">Chọn quyền (action)</div>
            <div v-if="roleId && moduleId" class="box">
                <a-spin :spinning="loading.permissions">
                    <a-checkbox-group v-model:value="selectedPermissionIds">
                        <div class="grid">
                            <a-checkbox v-for="perm in modulePermissions" :key="perm.id" :value="perm.id">
                                {{ perm.action?.name || perm.action?.code || ('Action #' + perm.action_id) }}
                            </a-checkbox>
                        </div>
                    </a-checkbox-group>
                </a-spin>
                <div v-if="!loading.permissions && modulePermissions.length === 0" class="hint">
                    Module này chưa có Permission. Hãy tạo Permission (module + action) trước.
                </div>
            </div>
            <div v-else class="hint">Chọn vai trò và module để hiển thị action.</div>
        </div>
    </a-modal>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { message, notification } from 'ant-design-vue'
import { roleApi } from '@/services/user_service/roleService'
import { moduleApi } from '@/services/user_service/moduleService'
import { permissionApi } from '@/services/user_service/permissionService'

const open = defineModel('open', { type: Boolean, default: false })

// ✅ LẤY props RA BIẾN ĐỂ DÙNG TRONG SCRIPT
const props = defineProps({
    initialRoleId: { type: [Number, String], default: null },   // ✅ sửa type
    initialModuleId: { type: [Number, String], default: null },   // ✅ sửa type
})

const emit = defineEmits(['done'])

const loading = ref({ roles: false, modules: false, permissions: false })
const saving = ref(false)
const roleOptions = ref([])
const moduleOptions = ref([])
const roleId = ref(null)
const moduleId = ref(null)

const modulePermissions = ref([])        // permissions of module
const selectedPermissionIds = ref([])    // checked perms for role+module

// ✅ Prefetch ngay khi mounted (phòng khi watch không bắt được lần đầu)
onMounted(async () => {
    await Promise.all([loadRoles(), loadModules()])
})

// Khi mở modal => load lại + prefill
watch(open, async v => {
    if (!v) return
    // đảm bảo đã có dữ liệu nền
    if (roleOptions.value.length === 0 || moduleOptions.value.length === 0) {
        await Promise.all([loadRoles(), loadModules()])
    }

    // ✅ dùng props.initialRoleId / props.initialModuleId
    roleId.value = props.initialRoleId ?? null
    moduleId.value = props.initialModuleId ?? null

    modulePermissions.value = []
    selectedPermissionIds.value = []

    if (roleId.value && moduleId.value) {
        await loadModulePermissions(moduleId.value)
        await loadCurrentSelections(roleId.value, moduleId.value)
    }
})

async function loadRoles() {
    loading.value.roles = true
    try {
        const { data } = await roleApi.list()
        roleOptions.value = roleApi.toOptions(Array.isArray(data) ? data : []) // ✅ fallback
    } catch (e) {
        roleOptions.value = [] // ✅ an toàn
        message.error(e?.response?.data?.message || 'Không tải được vai trò')
    } finally {
        loading.value.roles = false
    }
}

async function loadModules() {
    loading.value.modules = true
    try {
        const { data } = await moduleApi.list()
        moduleOptions.value = moduleApi.toOptions(Array.isArray(data) ? data : []) // ✅ fallback
    } catch (e) {
        moduleOptions.value = [] // ✅ an toàn
        message.error(e?.response?.data?.message || 'Không tải được module')
    } finally {
        loading.value.modules = false
    }
}

// đổi role/module => tải lại permission + selections
watch([roleId, moduleId], async ([rId, mId]) => {
    if (!rId || !mId) return
    await loadModulePermissions(mId)
    await loadCurrentSelections(rId, mId)
})

async function loadModulePermissions(mid) {
    loading.value.permissions = true
    try {
        const { data } = await permissionApi.permissionsByModule(mid)
        modulePermissions.value = Array.isArray(data) ? data : []
    } catch (e) {
        modulePermissions.value = []
        message.error(e?.response?.data?.message || 'Không tải được permission của module')
    } finally {
        loading.value.permissions = false
    }
}

async function loadCurrentSelections(rid, mid) {
    try {
        const { data } = await permissionApi.rolePermissions()
        const current = (Array.isArray(data) ? data : [])
            .filter(x => x.role_id === Number(rid) && x.permission?.module_id === Number(mid))
        selectedPermissionIds.value = current.map(x => x.permission_id)
    } catch (e) {
        selectedPermissionIds.value = []
        message.error(e?.response?.data?.message || 'Không tải được phân quyền hiện tại')
    }
}

function resetState() {
    roleId.value = null
    moduleId.value = null
    modulePermissions.value = []
    selectedPermissionIds.value = []
}

async function onSave() {
    if (!roleId.value || !moduleId.value) return message.warning('Chọn vai trò và module')
    try {
        saving.value = true
        await permissionApi.updateRolePermission(
            Number(roleId.value),
            Number(moduleId.value),
            selectedPermissionIds.value
        )
        notification.success({ message: 'Cập nhật quyền thành công' })
        emit('done')
        open.value = false
    } catch (e) {
        message.error(e?.response?.data?.message || 'Lưu phân quyền không thành công')
    } finally {
        saving.value = false
    }
}
</script>
