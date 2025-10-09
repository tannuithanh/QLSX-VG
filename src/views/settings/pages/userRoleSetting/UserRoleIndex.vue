<template>
    <div class="page">
        <UserRoleToolbar :role-id="roleId" :role-options="roleOptions" :module-options="roleModuleOptions"
            :selected-module-ids="selectedModuleIds" :loading-roles="loading.roles" :saving="saving" :can-save="canSave"
            @change-role="onChangeRole" @change-modules="onModulesChange" @save="onSave" />

        <UserRoleTable :data-source="usersForTransfer" v-model:target-keys="targetKeys"
            :loading="loading.users || loading.pivot" :disabled="saving || !roleId || selectedModuleIds.length === 0" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message, notification } from 'ant-design-vue'

import UserRoleToolbar from './components/UserRoleToolbar.vue'
import UserRoleTable from './components/UserRoleTable.vue'

import { userApi } from '@/services/user_service/userService'
import { permissionApi } from '@/services/user_service/permissionService'

/* ---------- STATE ---------- */
const loading = ref({ roles: false, users: false, pivot: false, roleModules: false })
const saving = ref(false)

const roleId = ref(null)            // number|null
const roleOptions = ref([])           // [{value,label}]
const roleModuleOptions = ref([])     // [{value,label}] của role đã chọn
const selectedModuleIds = ref([])     // number[]

const allUsers = ref([])
const usersForTransfer = computed(() =>
    allUsers.value.map(u => ({
        key: String(u.id),
        title: `${u.full_name || u.name || u.email} — ${u.email || ''}`.trim(),
        raw: u,
    }))
)

const pivotAll = ref([])              // [{id,user_id,role_id,module_id}]
const targetKeys = ref([])            // string[] userIds cột phải

/** ✅ Cache role -> { ids:number[], options:{value,label}[] } */
const roleModulesCache = ref(new Map()) // Map<number, { ids:number[], options:Array<{value,label}> }>

/* ---------- COMPUTED ---------- */
const canSave = computed(() => {
    if (saving.value) return false
    if (!roleId.value) return false
    if (selectedModuleIds.value.length === 0) return false
    return true
})

/* ---------- LIFECYCLE ---------- */
onMounted(async () => {
    await Promise.all([loadRoles(), loadUsers(), loadPivot()])
})

/* ---------- LOADERS ---------- */
async function loadRoles() {
    loading.value.roles = true
    try {
        // Lấy role list theo cách bạn đang có (có thể thay bằng /roles nếu sẵn)
        const { data } = await permissionApi.rolePermissions()
        const roles = Array.isArray(data) ? data : []
        const map = new Map()
        roles.forEach(rp => {
            if (rp?.role) map.set(rp.role.id, rp.role.name || rp.role.code || `#${rp.role.id}`)
            if (rp?.role_id && !rp?.role) map.set(rp.role_id, `#${rp.role_id}`)
        })
        roleOptions.value = Array.from(map.entries()).map(([id, label]) => ({ value: id, label }))
    } catch (e) {
        console.error(e)
        roleOptions.value = []
    } finally { loading.value.roles = false }
}

async function loadUsers() {
    loading.value.users = true
    try {
        const { data } = await userApi.list()
        allUsers.value = Array.isArray(data) ? data : []
    } finally { loading.value.users = false }
}

async function loadPivot() {
    loading.value.pivot = true
    try {
        const { data } = await permissionApi.listUserRoles()
        // ⚠️ Chuẩn hoá tất cả về number (trừ module_id có thể null)
        pivotAll.value = (Array.isArray(data) ? data : []).map(r => ({
            id: Number(r.id),
            user_id: Number(r.user_id),
            role_id: Number(r.role_id),
            module_id: r.module_id == null ? null : Number(r.module_id),
        }))
    } finally { loading.value.pivot = false }
}


/** ✅ Lấy module của Role và GIỮ tên trong cache */
async function ensureRoleModules(rid) {
    if (!rid) {
        roleModuleOptions.value = []
        return []
    }
    // Dùng cache (giữ nguyên label name)
    if (roleModulesCache.value.has(rid)) {
        const c = roleModulesCache.value.get(rid)
        roleModuleOptions.value = c.options
        return c.ids
    }
    loading.value.roleModules = true
    try {
        const res = await permissionApi.roleModules(rid) // [{id,name}]
        const list = Array.isArray(res?.data) ? res.data : []
        const ids = list.map(x => Number(x.id))
        const options = list.map(x => ({ value: Number(x.id), label: x.name || `#${x.id}` }))

        roleModulesCache.value.set(rid, { ids, options }) // ✅ cache đầy đủ
        roleModuleOptions.value = options
        return ids
    } catch (e) {
        console.error(e)
        roleModulesCache.value.set(rid, { ids: [], options: [] })
        roleModuleOptions.value = []
        return []
    } finally { loading.value.roleModules = false }
}

/* ---------- REACTIONS ---------- */
async function onChangeRole(rid) {
    roleId.value = rid || null
    selectedModuleIds.value = []
    targetKeys.value = []
    if (roleId.value) await ensureRoleModules(Number(roleId.value))
    else roleModuleOptions.value = []
}

function onModulesChange(vals) {
    selectedModuleIds.value = (vals || []).map(Number)
    recomputeTargetKeys()
}

/**
 * Cột phải = user có roleId hiện tại ở TẤT CẢ module đang chọn.
 */
function recomputeTargetKeys() {
    const rid = roleId.value != null ? Number(roleId.value) : null
    const mids = (selectedModuleIds.value || []).map(Number)

    if (!rid || mids.length === 0) {
        targetKeys.value = []
        return
    }

    // Gom theo user: tập module đã có cho role này
    const byUser = new Map()
    pivotAll.value
        .filter(r => Number(r.role_id) === rid && r.module_id != null)
        .forEach(r => {
            const setMid = byUser.get(r.user_id) || new Set()
            setMid.add(Number(r.module_id))
            byUser.set(r.user_id, setMid)
        })

    const right = []
    byUser.forEach((setMid, uid) => {
        const hasAll = mids.every(m => setMid.has(m))
        if (hasAll) right.push(String(uid))
    })
    targetKeys.value = right
}


/* ---------- SAVE: add/remove trong phạm vi module đã chọn ---------- */
async function onSave() {
    if (!roleId.value) return message.warning('Hãy chọn vai trò')
    if (selectedModuleIds.value.length === 0) return message.warning('Hãy chọn ít nhất 1 module')

    const rid = Number(roleId.value)
    const mids = selectedModuleIds.value.map(Number)
    const selectedUserIds = targetKeys.value.map(x => Number(x))
    const selectedUserSet = new Set(selectedUserIds)

    saving.value = true
    try {
        await loadPivot()

        const existInScope = pivotAll.value.filter(r =>
            Number(r.role_id) === rid &&
            r.module_id != null &&
            mids.includes(Number(r.module_id))
        )


        const SEP = '|'
        const keyOf = (uid, rid, mid) => `${uid}${SEP}${rid}${SEP}${mid}`
        const parseKey = k => { const [u, r, m] = k.split(SEP); return [Number(u), Number(r), Number(m)] }

        const desired = new Set()
        selectedUserIds.forEach(uid => mids.forEach(mid => desired.add(keyOf(uid, rid, mid))))

        const existMap = new Map(existInScope.map(r =>
            [keyOf(Number(r.user_id), rid, Number(r.module_id)), r]
        ))

        const toAdd = []
        desired.forEach(k => { if (!existMap.has(k)) toAdd.push(k) })

        const toRemove = existInScope.filter(r =>
            !selectedUserSet.has(Number(r.user_id)) ||
            !desired.has(keyOf(Number(r.user_id), rid, Number(r.module_id)))
        )

        await Promise.all(toRemove.map(r => permissionApi.removeUserRole(r.id)))
        for (const k of toAdd) {
            const [uid, , mid] = parseKey(k)
            await permissionApi.addUserRole(uid, rid, mid)
        }

        await loadPivot()
        recomputeTargetKeys()
        notification.success({ message: 'Đã lưu thay đổi' })
    } catch (e) {
        console.error(e)
        message.error(e?.response?.data?.message || 'Lưu không thành công')
    } finally {
        saving.value = false
    }
}

watch([pivotAll, roleId, selectedModuleIds], () => {
    if (!saving.value) recomputeTargetKeys()
})
</script>

<style scoped>
.page {
    min-width: 0;
    background: #fff;
}

:deep(.ant-card) {
    border-radius: 10px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
}

:deep(.ant-space-vertical) {
    gap: 8px;
}

@media (max-width: 992px) {
    .page {
        padding: 0 8px;
    }
}
</style>
