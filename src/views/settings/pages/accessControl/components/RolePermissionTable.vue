<template>
    <div class="rp-card">
        <a-table :data-source="rows" :loading="loading" row-key="key" :pagination="{ pageSize: 10 }" size="middle">
            <a-table-column title="Vai trò" dataIndex="role_name" key="role_name" />
            <a-table-column title="Module" dataIndex="module_name" key="module_name" />
            <a-table-column title="Quyền" key="actions">
                <template #default="{ record }">
                    <a-space wrap>
                        <a-tag v-for="a in record.action_names" :key="a">{{ a }}</a-tag>
                    </a-space>
                </template>
            </a-table-column>

            <a-table-column title="Hành động" key="act" width="110" align="center">
                <template #default="{ record }">
                    <a-space>
                        <a-tooltip title="Sửa">
                            <a-button type="text" size="small"
                                @click="$emit('edit', { roleId: record.role_id, moduleId: record.module_id })">
                                <template #icon>
                                    <EditOutlined />
                                </template>
                            </a-button>
                        </a-tooltip>
                        <a-popconfirm title="Xoá toàn bộ quyền của vai trò này trên module này?" ok-text="Xoá"
                            ok-type="danger" cancel-text="Huỷ" @confirm="clearPermissions(record)">
                            <a-button type="text" size="small" danger>
                                <template #icon>
                                    <DeleteOutlined />
                                </template>
                            </a-button>
                        </a-popconfirm>
                    </a-space>
                </template>
            </a-table-column>
        </a-table>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { permissionApi } from '../../../../../services/user_service/permissionService'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const loading = ref(false)
const rows = ref([])

function shape(data = []) {
    // group theo (role_id, module_id)
    const map = new Map()
    for (const it of data) {
        const rid = it.role_id
        const mid = it.permission?.module_id
        const key = `${rid}-${mid}`
        if (!map.has(key)) {
            map.set(key, {
                key,
                role_id: rid,
                role_name: it.role?.name || `#${rid}`,
                module_id: mid,
                module_name: it.permission?.module?.name || `#${mid}`,
                action_names: [],
                permission_ids: []
            })
        }
        const g = map.get(key)
        g.action_names.push(it.permission?.action?.name || it.permission?.action?.code || `#${it.permission?.action_id}`)
        g.permission_ids.push(it.permission_id)
    }
    return Array.from(map.values())
}

async function load() {
    loading.value = true
    try {
        const { data } = await permissionApi.rolePermissions()
        rows.value = shape(data || [])
    } catch (e) {
        message.error(e?.response?.data?.message || 'Không tải được danh sách phân quyền')
    } finally {
        loading.value = false
    }
}

async function clearPermissions(rec) {
    try {
        await permissionApi.updateRolePermission(rec.role_id, rec.module_id, [])
        message.success('Đã xoá quyền')
        await load()
    } catch (e) {
        message.error(e?.response?.data?.message || 'Xoá quyền không thành công')
    }
}

function reload() { load() }

defineExpose({ reload })
onMounted(load)
</script>

<style scoped>
.rp-card {
    min-width: 0;
}

.rp-title {
    font-weight: 600;
    margin-bottom: 8px;
}
</style>
