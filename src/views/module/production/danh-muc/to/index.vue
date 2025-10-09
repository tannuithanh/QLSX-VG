<template>
  <div class="stack">
    <ToFilter v-model="filters" @search="applyFilters" />

    <div class="actions">
      <a-button v-if="canAdd" type="primary" @click="openCreate">Thêm tổ</a-button>
    </div>

    <ToTable :data="pagedData" :pagination="pagination" @change="onTableChange" @edit="openEdit" @delete="onDelete" :can-edit="canEdit" :can-delete="canDelete" />

    <ToModal v-model:visible="modalVisible" :initial="editing" @submit="onSubmit"
      @cancel="() => (modalVisible = false)" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import ToFilter from './components/ToFilter.vue'
import ToTable from './components/ToTable.vue'
import ToModal from './components/ToModal.vue'
import { teamApi } from '@/services/production_service/teamService'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const norm = (c) => String(c ?? '').trim().toUpperCase()
const isAdmin = computed(() => !!user.value?.is_admin)
const moduleCodes = computed(() => new Set((user.value?.modules || []).map(m => norm(m.code))))
const can = (code) => isAdmin.value || moduleCodes.value.has(norm(code))

const canAdd = computed(() => can('TO-ADD'))
const canEdit = computed(() => can('TO-EDIT'))
const canDelete = computed(() => can('TO-DELETE'))



const allRows = ref([])
const filters = ref({ keyword: '', workshop_id: null })

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
})

async function fetchAll() {
  try {
    // lấy tất cả (kèm quan hệ workshop)
    const list = await teamApi.listAll()
    // map thêm field tiện hiển thị/loc FE
    allRows.value = list.map(r => ({
      ...r,
      workshop_name: r?.workshop?.name || '',
      workshop_code: r?.workshop?.code || '',
    }))
    pagination.total = allRows.value.length
  } catch (e) {
    console.error(e)
    message.error(e?.response?.data?.message || e?.message || 'Không tải được danh sách tổ')
  }
}

const filtered = computed(() => {
  const k = (filters.value.keyword || '').trim().toLowerCase()
  const wid = filters.value.workshop_id
  return allRows.value.filter(r => {
    const mk = !k || [r.name, r.code, r.workshop_name, r.workshop_code]
      .some(v => String(v || '').toLowerCase().includes(k))
    const mw = !wid || r.workshop_id === wid
    return mk && mw
  })
})

const pagedData = computed(() => {
  pagination.total = filtered.value.length
  const start = (pagination.current - 1) * pagination.pageSize
  return filtered.value.slice(start, start + pagination.pageSize)
})

function applyFilters() { pagination.current = 1 }
function onTableChange(p) {
  pagination.current = Number(p.current || 1)
  pagination.pageSize = Number(p.pageSize || pagination.pageSize)
}

// Modal
const modalVisible = ref(false)
const editing = ref(null)

function openCreate() {
  editing.value = null
  modalVisible.value = true
}
function openEdit(r) {
  editing.value = {
    id: r.id,
    name: r.name,
    code: r.code,
    workshop_id: r.workshop_id,
  }
  modalVisible.value = true
}

async function onSubmit(payload) {
  try {
    if (editing.value?.id) {
      await teamApi.update(editing.value.id, payload)
      message.success('Cập nhật tổ thành công')
    } else {
      await teamApi.create(payload)
      message.success('Thêm tổ thành công')
    }
    modalVisible.value = false

    await fetchAll()
    const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    if (pagination.current > maxPage) pagination.current = maxPage
  } catch (e) {
    console.error(e)
    const msg =
      e?.response?.data?.message ||
      (e?.response?.data?.errors && Object.values(e.response.data.errors).flat().join(', ')) ||
      e?.message || 'Lỗi khi lưu tổ'
    message.error(msg)
  }
}

async function onDelete(id) {
  try {
    await teamApi.remove(id)
    message.success('Xoá tổ thành công')
    const before = pagedData.value.length
    await fetchAll()
    const after = pagedData.value.length
    if (before === 1 && pagination.current > 1 && after === 0) pagination.current -= 1
  } catch (e) {
    console.error(e)
    message.error(e?.response?.data?.message || e?.message || 'Không xoá được tổ')
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
