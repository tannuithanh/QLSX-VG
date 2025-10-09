<template>
    <div class="p-3">
        <div class="actions">
            <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm cấu hình</a-button>
        </div>

        <a-divider />

        <LayoutStdTable :rows="rows" :loading="loading" @edit="openEdit" @delete="onDelete" :can-edit="canEdit" :can-delete="canDelete" />

        <!-- Modal -->
        <LayoutStdModal v-model:visible="modalVisible" :teams="teams" :initial="editingRow"
            :used-team-ids="rows.map(r => r.team_id)" @saved="onSaved" />
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { layoutStandardProductivityApi } from '@/services/production_service/layoutStandardProductivityService'
import { teamApi } from '@/services/production_service/teamService'
import LayoutStdTable from './components/LayoutStdTable.vue'
import LayoutStdModal from './components/LayoutStdModal.vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// dưới phần script
const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('NSL-ADD'))
const canEdit = computed(() => can('NSL-EDIT'))
const canDelete = computed(() => can('NSL-DELETE'))

const loading = ref(false)
const rows = ref([])
const teams = ref([])

async function fetchTeams() {
    try {
        teams.value = await teamApi.listAll()
    } catch (e) {
        console.error(e)
        message.error('Không tải được danh mục tổ.')
    }
}

async function fetchRows() {
    try {
        loading.value = true
        const data = await layoutStandardProductivityApi.listAll()
        const raw = Array.isArray(data) ? data : []
        const teamMap = new Map(teams.value.map(t => [Number(t.id), t]))
        rows.value = raw.map(r => ({
            ...r,
            team: r.team ?? teamMap.get(Number(r.team_id)) ?? null,
        }))
    } catch (e) {
        console.error(e)
        message.error('Không tải được dữ liệu layout.')
    } finally {
        loading.value = false
    }
}

function reload() { fetchRows() }

function onDelete(row) {
    Modal.confirm({
        title: 'Xoá?',
        content: `Xoá layout chuẩn của tổ "${row?.team?.name ?? row.team_id}"?`,
        okType: 'danger',
        onOk: async () => {
            try {
                await layoutStandardProductivityApi.deleteByTeam(row.team_id)
                message.success('Đã xoá.')
                reload()
            } catch (e) {
                console.error(e)
                message.error('Xoá thất bại.')
            }
        }
    })
}

const modalVisible = ref(false)
const editingRow = ref(null)

function openCreate() { editingRow.value = null; modalVisible.value = true }
function openEdit(row) { editingRow.value = row; modalVisible.value = true }
function onSaved() { modalVisible.value = false; editingRow.value = null; reload() }

onMounted(async () => {
    await fetchTeams()
    await fetchRows()
})
</script>

<style scoped>
.p-3 {
    padding: 12px;
}

.toolbar {
    display: flex;
    gap: 8px;
}

.stack {
    display: grid;
    gap: 12px;
}

.actions {
    display: flex;
    justify-content: flex-end;
}
</style>
