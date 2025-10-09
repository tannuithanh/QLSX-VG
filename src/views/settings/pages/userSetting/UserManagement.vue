<template>
  <div class="page">
    <UserToolbar
      v-model:search="search"
      v-model:dept="deptFilter"
      v-model:unit="unitFilter"
      v-model:admin="adminFilter"
      :deptOptions="deptOptions"
      :unitOptions="unitOptions"
      :adminOptions="adminOptions"
      :loading="loading"
      @reload="reload"
      @create="openDrawer()"
    />

    <UserTable
      :rows="filteredData"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      @change="onTableChange"
      @edit="openDrawer"
      @delete="onDelete"
    />

    <UserFormDrawer
      v-model:visible="open"
      :mode="isEdit ? 'edit' : 'create'"
      :initial="isEdit ? editingRow : null"
      :deptOptions="deptOptions"
      :unitOptions="unitOptions"
      :positionOptions="positionOptions"
      @cancel="onClose"
      @submit="onSave"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, notification } from 'ant-design-vue'

import UserToolbar from '@/views/settings/pages/userSetting/components/UserToolbar.vue'
import UserFormDrawer from '@/views/settings/pages/userSetting/components/UserFormDrawer.vue'
import UserTable from '@/views/settings/pages/userSetting/components/UserTable.vue'

import { userApi } from '@/services/user_service/userService'
import { departmentApi } from '@/services/user_service/departmentService'
import { positionApi } from '@/services/user_service/positionService'

/** Loading / Drawer state */
const loading = ref(false)
const saving = ref(false)
const open = ref(false)
const isEdit = ref(false)
const editingRow = ref(null)

/** Pagination */
const pagination = reactive({ current: 1, pageSize: 10, showSizeChanger: false })
function onTableChange(pag) {
  if (pag?.current) pagination.current = pag.current
}

/** Filters */
const search = ref('')
const deptFilter = ref()  // department_id (number)
const unitFilter = ref()  // division text
const adminFilter = ref() // boolean

/** Options */
const adminOptions = [{ label: 'Admin', value: true }, { label: 'User', value: false }]
const deptOptions = ref([])      // [{label, value:id(number)}]
const positionOptions = ref([])  // [{label, value:id(number)}]
const unitOptions = [
  { label: 'Frontend', value: 'Frontend' },
  { label: 'Backend', value: 'Backend' },
  { label: 'Tuyển dụng', value: 'Tuyển dụng' },
  { label: 'Sales B2B', value: 'Sales B2B' },
]

/** Columns (UI-only; render trong UserTable) */
const columns = [
  { title: 'STT', key: 'stt', width: 70, align: 'center', fixed: 'left' },
  { title: 'Người dùng', key: 'user', width: 260, fixed: 'left' },
  { title: 'MSNV', dataIndex: 'msnv', width: 110 },
  { title: 'SĐT', dataIndex: 'phone', width: 120 },
  { title: 'Địa chỉ', dataIndex: 'address', width: 220, ellipsis: true },
  { title: 'Chức vụ', dataIndex: 'position', width: 140 },
  { title: 'Chi tiết chức vụ', dataIndex: 'positionDetail', width: 200, ellipsis: true },
  { title: 'Phòng ban', dataIndex: 'department', width: 140 },
  { title: 'Bộ phận', dataIndex: 'unit', width: 140 },
  { title: 'Quyền', dataIndex: 'isAdmin', width: 100, align: 'center' },
  { title: 'Thao tác', key: 'action', width: 110, align: 'center', fixed: 'right' },
]

/** Data từ BE */
const dataSource = ref([])

/* Helper: ép về number hoặc null */
const toNum = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/* Map BE → row cho bảng */
function toRow(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    msnv: u.msnv,
    phone: u.phone,
    address: u.address,
    position_id: u.position?.id ?? null,
    position: u.position?.name || '',
    positionDetail: u.position_detail || '',
    department_id: u.department?.id ?? null,
    department: u.department?.name || '',
    unit: u.division || '',     // FE gọi unit; BE là division
    isAdmin: !!u.is_admin,
    avatar: u.avatar_url || u.avatar || '',
    signature: u.signature_url || u.signature || '',
  }
}

/* Map payload form → payload BE */
function toApiPayload(p) {
  return {
    name: p.name,
    msnv: p.msnv,
    email: p.email,
    phone: p.phone || null,
    address: p.address || null,
    position_detail: p.positionDetail || null,
    division: p.unit || null,          // unit -> division
    is_admin: !!p.isAdmin,
    department_id: toNum(p.department),
    position_id: toNum(p.position),
  }
}

/** Load options */
async function loadOptions() {
  try {
    const [posRes, depRes] = await Promise.all([positionApi.list(), departmentApi.list()])
    // ép id về number cho chắc
    positionOptions.value = positionApi.toOptions(posRes.data).map(o => ({ ...o, value: toNum(o.value) }))
    deptOptions.value = departmentApi.toOptions(depRes.data).map(o => ({ ...o, value: toNum(o.value) }))
  } catch (e) {
    message.error(e?.response?.data?.message || 'Không tải được danh mục chức vụ/phòng ban')
  }
}

/** Load list từ BE */
async function loadUsers() {
  loading.value = true
  try {
    const { data } = await userApi.list()
    dataSource.value = Array.isArray(data) ? data.map(toRow) : []
  } catch (e) {
    message.error(e?.response?.data?.message || 'Không tải được danh sách người dùng')
  } finally {
    loading.value = false
  }
}

/** Filtered data (filter local) */
const filteredData = computed(() => {
  let rows = dataSource.value
  const q = (search.value || '').trim().toLowerCase()
  if (q) {
    rows = rows.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.msnv?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q)
    )
  }
  if (deptFilter.value) rows = rows.filter(r => r.department_id === toNum(deptFilter.value))
  if (unitFilter.value) rows = rows.filter(r => r.unit === unitFilter.value)
  if (adminFilter.value !== undefined && adminFilter.value !== null)
    rows = rows.filter(r => r.isAdmin === adminFilter.value)
  return rows
})

/** Drawer handlers */
function openDrawer(record) {
  if (record) {
    isEdit.value = true
    // 👇 Quan trọng: map về ID cho 2 select
    editingRow.value = {
      ...record,
      department: record.department_id ?? undefined,
      position: record.position_id ?? undefined,
    }
  } else {
    isEdit.value = false
    editingRow.value = null
  }
  open.value = true
}
function onClose() { open.value = false }

/** Save (call API) */
async function onSave(payload) {
  try {
    saving.value = true
    if (isEdit.value && editingRow.value?.id) {
      await userApi.update(editingRow.value.id, toApiPayload(payload))
      const { data } = await userApi.show(editingRow.value.id) // load lại có quan hệ
      const idx = dataSource.value.findIndex(r => r.id === editingRow.value.id)
      if (idx > -1) dataSource.value[idx] = toRow(data)
      notification.success({ message: 'Đã cập nhật người dùng' })
    } else {
      const res = await userApi.create(toApiPayload(payload))
      const created = res?.data?.user || res?.data
      // gọi lại show để đảm bảo có department/position đầy đủ
      const showRes = await userApi.show(created.id)
      dataSource.value.unshift(toRow(showRes.data))
      notification.success({ message: 'Đã tạo người dùng mới' })
    }
    onClose()
  } catch (e) {
    const msg = e?.response?.data?.message
    const errs = e?.response?.data?.errors
    message.error(msg || 'Lưu không thành công')
    if (errs) console.warn('Validation errors:', errs)
  } finally {
    saving.value = false
  }
}

/** Delete (call API) */
async function onDelete(id) {
  try {
    await userApi.remove(id)
    dataSource.value = dataSource.value.filter(r => r.id !== id)
    message.success('Đã xoá')
  } catch (e) {
    message.error(e?.response?.data?.message || 'Xoá không thành công')
  }
}

/** Reload */
async function reload() {
  await Promise.all([loadOptions(), loadUsers()])
}

onMounted(async () => {
  await Promise.all([loadOptions(), loadUsers()])
})
</script>

<style scoped>
.page { min-width: 0 }
</style>
