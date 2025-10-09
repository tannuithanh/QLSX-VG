<template>
    <a-modal v-model:visible="innerVisible" :title="isEdit ? 'Sửa dữ liệu lỗi' : 'Thêm dữ liệu lỗi'" ok-text="Lưu"
        cancel-text="Hủy" :confirm-loading="submitting" destroy-on-close width="900px" @ok="onOk"
        @cancel="emit('update:visible', false)">
        <a-form :model="form" layout="vertical">
            <a-row :gutter="12">
                <a-col :span="8">
                    <a-form-item label="Ngày sản xuất" required>
                        <!-- Hiển thị DD/MM/YYYY, gửi BE YYYY-MM-DD -->
                        <a-date-picker v-model:value="form.ngay_sx" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                            style="width:100%" />
                    </a-form-item>
                </a-col>

                <a-col :span="8">
                    <a-form-item label="Xưởng" required>
                        <a-select v-model:value="form.xuong_id" allow-clear placeholder="Chọn xưởng"
                            :loading="loadingLookups" show-search :filter-option="selectFilter"
                            @change="onWorkshopChange">
                            <a-select-option v-for="w in workshops" :key="w.id" :value="w.id">
                                {{ w.name }} ({{ w.code }})
                            </a-select-option>
                        </a-select>
                    </a-form-item>
                </a-col>

                <a-col :span="8">
                    <a-form-item label="Tổ / nhóm" required>
                        <a-select v-model:value="form.to_id" allow-clear placeholder="Chọn tổ"
                            :disabled="!form.xuong_id" :loading="loadingLookups" show-search
                            :filter-option="selectFilter">
                            <a-select-option v-for="t in teamsByWorkshop" :key="t.id" :value="t.id">
                                {{ t.name }} ({{ t.code }})
                            </a-select-option>
                        </a-select>
                    </a-form-item>
                </a-col>

                <a-col :span="8">
                    <a-form-item label="Đơn hàng" required>
                        <a-input v-model:value="form.don_hang" placeholder="Nhập đơn hàng" />
                    </a-form-item>
                </a-col>

                <a-col :span="8">
                    <a-form-item label="Mã hàng" required>
                        <a-input v-model:value="form.ma_hang" placeholder="Nhập mã hàng" />
                    </a-form-item>
                </a-col>

                <a-col :span="8">
                    <a-form-item label="SL lỗi" required>
                        <a-input-number v-model:value="form.sl_loi" :min="0" style="width:100%" placeholder="0" />
                    </a-form-item>
                </a-col>
            </a-row>

            <a-divider orientation="left">Lỗi phát sinh</a-divider>

            <!-- Nhóm lỗi 1 -->
            <a-row :gutter="12">
                <a-col :span="12">
                    <a-form-item label="Mã lỗi 1">
                        <a-select v-model:value="form.ma_loi1" allow-clear placeholder="Chọn mã lỗi 1"
                            :options="errorCodeOptions" show-search :filter-option="selectFilter" />
                    </a-form-item>
                </a-col>
                <a-col :span="12">
                    <a-form-item label="Công đoạn PS 1">
                        <a-select v-model:value="form.cong_doan_ps1" allow-clear placeholder="Chọn công đoạn 1"
                            :options="stageOptions" show-search :filter-option="selectFilter" />
                    </a-form-item>
                </a-col>
            </a-row>

            <!-- Nhóm lỗi 2 -->
            <a-row :gutter="12">
                <a-col :span="12">
                    <a-form-item label="Mã lỗi 2">
                        <a-select v-model:value="form.ma_loi2" allow-clear placeholder="Chọn mã lỗi 2"
                            :options="errorCodeOptions" show-search :filter-option="selectFilter" />
                    </a-form-item>
                </a-col>
                <a-col :span="12">
                    <a-form-item label="Công đoạn PS 2">
                        <a-select v-model:value="form.cong_doan_ps2" allow-clear placeholder="Chọn công đoạn 2"
                            :options="stageOptions" show-search :filter-option="selectFilter" />
                    </a-form-item>
                </a-col>
            </a-row>

            <!-- Nhóm lỗi 3 -->
            <a-row :gutter="12">
                <a-col :span="12">
                    <a-form-item label="Mã lỗi 3">
                        <a-select v-model:value="form.ma_loi3" allow-clear placeholder="Chọn mã lỗi 3"
                            :options="errorCodeOptions" show-search :filter-option="selectFilter" />
                    </a-form-item>
                </a-col>
                <a-col :span="12">
                    <a-form-item label="Công đoạn PS 3">
                        <a-select v-model:value="form.cong_doan_ps3" allow-clear placeholder="Chọn công đoạn 3"
                            :options="stageOptions" show-search :filter-option="selectFilter" />
                    </a-form-item>
                </a-col>
            </a-row>

            <a-row :gutter="12">
                <a-col :span="8">
                    <a-form-item>
                        <a-checkbox v-model:checked="form.huy">Hủy (đối với hàng hủy)</a-checkbox>
                    </a-form-item>
                </a-col>
            </a-row>
        </a-form>
    </a-modal>
</template>

<script setup>
import { computed, onMounted, reactive, watch, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

import { dataErrorApi } from '@/services/production_service/dataErrorService'
import { productivityEntryApi } from '@/services/production_service/productivityEntryService'
import { workshopApi } from '@/services/production_service/workshopService'
import { teamApi } from '@/services/production_service/teamService'
import { errorCodeApi } from '@/services/production_service/errorCodeService'
import { stageApi } from '@/services/production_service/stageService'

/* Props/Emits */
const props = defineProps({
    visible: { type: Boolean, default: false },
    record: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'saved'])

const innerVisible = computed({
    get: () => props.visible,
    set: v => emit('update:visible', v),
})
const isEdit = computed(() => !!props.record)

/* Lookups */
const workshops = ref([])
const teams = ref([])
const errorCodes = ref([])
const stages = ref([])
const loadingLookups = ref(false)

async function loadLookups() {
    loadingLookups.value = true
    try {
        const [ws, ts, ecs, sts] = await Promise.all([
            workshopApi.listAll(),
            teamApi.listAll(),
            errorCodeApi.listAll(),
            stageApi.listAll(),
        ])
        workshops.value = ws
        teams.value = ts
        errorCodes.value = ecs
        stages.value = sts
    } finally {
        loadingLookups.value = false
    }
}

const errorCodeOptions = computed(() =>
    errorCodes.value.map(ec => ({ label: `${ec.name} (${ec.code})`, value: ec.code }))
)
// Label ưu tiên NAME để người dùng thấy tên công đoạn; vẫn lưu code cho ổn định
const stageOptions = computed(() =>
    stages.value.map(s => ({ label: `${s.name} (${s.code})`, value: s.code }))
)

const selectFilter = (input, option) =>
    (option?.label ?? '').toLowerCase().includes((input ?? '').toLowerCase())

const teamsByWorkshop = computed(() =>
    !form.xuong_id ? [] : teams.value.filter(t => Number(t.workshop_id) === Number(form.xuong_id))
)

/* Form */
const today = dayjs().format('YYYY-MM-DD')
const form = reactive({
    id: null,
    ngay_sx: today,
    xuong_id: null,
    to_id: null,
    don_hang: '',
    ma_hang: '',
    sl_loi: null,
    ma_loi1: '', cong_doan_ps1: '',
    ma_loi2: '', cong_doan_ps2: '',
    ma_loi3: '', cong_doan_ps3: '',
    huy: false,
})

watch(() => props.record, (r) => {
    if (!r) return resetForm()
    form.id = r.id
    // chuẩn hóa ngày từ record: nhận Date/ISO/chuỗi -> về YYYY-MM-DD
    form.ngay_sx = r.production_date ? dayjs(r.production_date).format('YYYY-MM-DD') : today
    form.xuong_id = r.workshop_id ?? null
    form.to_id = r.team_id ?? null
    form.don_hang = r.order_no ?? ''
    form.ma_hang = r.item_code ?? ''
    form.sl_loi = r.error_qty ?? null

    // giữ VALUE là code; nếu DB đang lưu tên, vẫn render được (không có trong options => để trống)
    form.ma_loi1 = r.error_code_1 ?? ''
    form.cong_doan_ps1 = r.error_stage_1 ?? ''
    form.ma_loi2 = r.error_code_2 ?? ''
    form.cong_doan_ps2 = r.error_stage_2 ?? ''
    form.ma_loi3 = r.error_code_3 ?? ''
    form.cong_doan_ps3 = r.error_stage_3 ?? ''

    form.huy = !!r.is_scrapped
}, { immediate: true })

function resetForm() {
    form.id = null
    form.ngay_sx = today
    form.xuong_id = null
    form.to_id = null
    form.don_hang = ''
    form.ma_hang = ''
    form.sl_loi = null
    form.ma_loi1 = form.cong_doan_ps1 = ''
    form.ma_loi2 = form.cong_doan_ps2 = ''
    form.ma_loi3 = form.cong_doan_ps3 = ''
    form.huy = false
}

function onWorkshopChange() {
    const t = teams.value.find(x => x.id === form.to_id)
    if (t && Number(t.workshop_id) !== Number(form.xuong_id)) {
        form.to_id = null
    }
}

/* Check trùng với bảng năng suất (ngày local, khớp workshop/team id + order + item) */
const textKey = v => String(v ?? '').replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim()
function makePEKey({ d, w, t, o, i }) {
    return `${d}__${w}__${t}__${textKey(o)}__${textKey(i)}`
}
async function checkExistsInProductivity() {
    const d = form.ngay_sx
    const w = form.xuong_id
    const t = form.to_id
    const o = form.don_hang
    const i = form.ma_hang

    const errs = []
    if (!d) errs.push('Vui lòng chọn "Ngày sản xuất".')
    if (!w) errs.push('Vui lòng chọn "Xưởng".')
    if (!t) errs.push('Vui lòng chọn "Tổ/nhóm".')
    if (!o?.trim()) errs.push('Vui lòng nhập "Đơn hàng".')
    if (!i?.trim()) errs.push('Vui lòng nhập "Mã hàng".')
    if (form.sl_loi === null || form.sl_loi === '' || Number.isNaN(Number(form.sl_loi))) {
        errs.push('"SL lỗi" phải là số.')
    }
    if (errs.length) { message.error(errs[0]); return false }

    // lấy năng suất trong ngày để giảm tải
    const list = await productivityEntryApi.listAll({ date_from: d, date_to: d })
    const idx = new Set(
        list.map(r => {
            const ymd = dayjs.utc(r.production_date).local().format('YYYY-MM-DD') // FIX lệch UTC
            return makePEKey({
                d: ymd,
                w: r.workshop_id,
                t: r.team_id,
                o: r.order_no,
                i: r.item_code,
            })
        })
    )

    const key = makePEKey({ d, w, t, o, i })
    if (!idx.has(key)) {
        const ws = workshops.value.find(x => Number(x.id) === Number(w))
        const tm = teams.value.find(x => Number(x.id) === Number(t))
        message.error([
            'Không trùng dữ liệu năng suất đã có.',
            `Ngày: ${dayjs(d).format('DD/MM/YYYY')}`,
            `Xưởng: ${ws ? `${ws.name} (${ws.code})` : w}`,
            `Tổ/nhóm: ${tm ? `${tm.name} (${tm.code})` : t}`,
            `Đơn hàng: ${o}`,
            `Mã hàng: ${i}`,
        ].join('  '))
        return false
    }
    return true
}

/* Submit */
const submitting = ref(false)
async function onOk() {
    if (!(await checkExistsInProductivity())) return

    const payload = {
        production_date: form.ngay_sx,          // YYYY-MM-DD
        workshop_id: form.xuong_id,
        team_id: form.to_id,
        order_no: textKey(form.don_hang),
        item_code: textKey(form.ma_hang),
        error_qty: Number(form.sl_loi),

        // LƯU code; bảng hiển thị sẽ map code -> name
        error_code_1: form.ma_loi1 || null,
        error_stage_1: form.cong_doan_ps1 || null,
        error_code_2: form.ma_loi2 || null,
        error_stage_2: form.cong_doan_ps2 || null,
        error_code_3: form.ma_loi3 || null,
        error_stage_3: form.cong_doan_ps3 || null,

        is_scrapped: !!form.huy,
    }

    submitting.value = true
    try {
        if (isEdit.value && form.id) {
            await dataErrorApi.update(form.id, payload)
            message.success('Đã cập nhật.')
        } else {
            await dataErrorApi.create(payload)
            message.success('Đã thêm.')
        }
        emit('saved')
        emit('update:visible', false)
    } catch (e) {
        message.error(e?.response?.data?.message || e?.message || 'Lưu thất bại.')
    } finally {
        submitting.value = false
    }
}

onMounted(loadLookups)
</script>
