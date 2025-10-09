<template>
    <div class="p-3">
        <div class="actions">
            <a-space>
                <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm</a-button>
            </a-space>
        </div>

        <AreaTable class="mt-2" :rows="rows" :loading="loading" @selectDefault="onSelectDefault" :can-edit="canEdit" :can-delete="canDelete" />

        <AreaFormModal v-model:visible="modalVisible" @saved="onSaved" />
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { standardProductAreaApi } from '@/services/production_service/standardProductAreaService'
import AreaTable from './components/AreaTable.vue'
import AreaFormModal from './components/AreaFormModal.vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// dưới phần script
const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('DTC-ADD'))
const canEdit = computed(() => can('DTC-EDIT'))
const canDelete = computed(() => can('DTC-DELETE'))

const loading = ref(false)
const rows = ref([])
const modalVisible = ref(false)

async function fetchRows() {
    try {
        loading.value = true
        rows.value = await standardProductAreaApi.listAll()
    } catch (e) {
        console.error(e)
        message.error('Không tải được danh sách diện tích chuẩn')
    } finally {
        loading.value = false
    }
}

function openCreate() {
    modalVisible.value = true
}

async function onSaved() {
    modalVisible.value = false
    await fetchRows()
}

async function onSelectDefault(record) {
    try {
        await standardProductAreaApi.select(record.id)
        message.success(`Đã chọn ID #${record.id} làm mặc định`)
        await fetchRows()
    } catch (e) {
        console.error(e)
        message.error('Chọn mặc định thất bại')
    }
}

onMounted(fetchRows)
</script>

<style scoped>
.p-3 {
    padding: 12px;
}

.actions {
    display: flex;
    justify-content: flex-end;
}

.mt-2 {
    margin-top: 8px;
}
</style>
