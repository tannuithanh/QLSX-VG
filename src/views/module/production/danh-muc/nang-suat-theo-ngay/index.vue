<template>
    <div class="p-3">

        <div class="actions">
            <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm cấu hình</a-button>
        </div
        <a-divider />

        <StandardDailyTable :rows="rows" :loading="loading" :can-edit="canEdit" :can-delete="canDelete"
            @refresh="reload" @edit="openEdit" @delete="onDelete" />


        <!-- Modal tạo/sửa -->
        <StandardDailyModal v-model:visible="modalVisible" :teams="teams" :initial="editingRow"
            :used-team-ids="rows.map(r => r.team_id)" @saved="onSaved" />


    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { standardDailyProductivityApi } from '@/services/production_service/standardDailyProductivityService'
import { teamApi } from '@/services/production_service/teamService'
import StandardDailyTable from './components/StandardDailyTable.vue'
import StandardDailyModal from './components/StandardDailyModal.vue'
// thêm import
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// dưới phần script
const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('NSTN-ADD'))
const canEdit = computed(() => can('NSTN-EDIT'))
const canDelete = computed(() => can('NSTN-DELETE'))

const loading = ref(false)
const rows = ref([])
const teams = ref([])

async function fetchTeams() {
    try {
        teams.value = await teamApi.listAll()
    } catch (e) {
        console.error(e)
        message.error('Không tải được danh mục Tổ.')
    }
}

async function fetchRows() {
    try {
        loading.value = true
        const data = await standardDailyProductivityApi.listAll()
        rows.value = Array.isArray(data) ? data : []
    } catch (e) {
        console.error(e)
        message.error('Không tải được dữ liệu năng suất theo ngày.')
    } finally {
        loading.value = false
    }
}

function reload() { fetchRows() }

function onDelete(row) {
    Modal.confirm({
        title: 'Xóa cấu hình?',
        content: `Xóa năng suất chuẩn của tổ "${row?.team?.name ?? row.team_id}"?`,
        okText: 'Xóa',
        okType: 'danger',
        cancelText: 'Hủy',
        async onOk() {
            try {
                await standardDailyProductivityApi.deleteByTeam(row.team_id)
                message.success('Đã xóa.')
                reload()
            } catch (e) {
                console.error(e)
                message.error('Xóa thất bại.')
            }
        },
    })
}

/* ===== Modal thêm/sửa ===== */
const modalVisible = ref(false)
const editingRow = ref(null)

function openCreate() {
    editingRow.value = null
    modalVisible.value = true
}
function openEdit(row) {
    editingRow.value = row
    modalVisible.value = true
}
function onSaved() {
    modalVisible.value = false
    editingRow.value = null
    reload()
}


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
    flex-wrap: wrap;
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
