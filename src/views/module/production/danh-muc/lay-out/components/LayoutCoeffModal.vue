<template>
  <a-modal
    v-model:visible="innerVisible"
    :title="isEdit ? 'Cập nhật hệ số layout' : 'Thêm hệ số layout'"
    @ok="submit"
    @cancel="$emit('cancel')"
    ok-text="Lưu"
    cancel-text="Huỷ"
    destroyOnClose
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="Mã hàng" name="item_code" required>
        <a-input v-model:value="form.item_code" />
        <small style="opacity:.7">
          Quy tắc: nếu ký tự thứ 10 là <b>0</b> hoặc ký tự 10–11 là <b>S1</b> ⇒ được nhập L/W/H (coefficient sẽ khoá).
          Ngược lại ⇒ chỉ nhập coefficient.
        </small>
      </a-form-item>

      <a-form-item label="Chiều dài (L)" name="L" :required="canEditDims">
        <a-input-number
          v-model:value="form.L"
          :min="0"
          :step="0.001"
          :precision="3"
          style="width: 100%"
          :disabled="!canEditDims"
        />
      </a-form-item>

      <a-form-item label="Chiều rộng (W)" name="W" :required="canEditDims">
        <a-input-number
          v-model:value="form.W"
          :min="0"
          :step="0.001"
          :precision="3"
          style="width: 100%"
          :disabled="!canEditDims"
        />
      </a-form-item>

      <a-form-item label="Chiều cao (H)" name="H" :required="canEditDims">
        <a-input-number
          v-model:value="form.H"
          :min="0"
          :step="0.001"
          :precision="3"
          style="width: 100%"
          :disabled="!canEditDims"
        />
      </a-form-item>

      <a-form-item label="Diện tích sản phẩm (m²)" name="coefficient" :required="!canEditDims">
        <a-input-number
          v-model:value="form.coefficient"
          :min="0"
          :precision="4"
          :step="0.0001"
          style="width: 100%"
          :disabled="canEditDims"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  initial: { type: Object, default: null }, // { id?, item_code?, L?, W?, H?, coefficient? }
})
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const innerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

const formRef = ref(null)

const form = reactive({
  item_code: '',
  L: null,
  W: null,
  H: null,
  coefficient: null,
})

const isEdit = computed(() => !!(props.initial && props.initial.id))

watch(
  () => props.initial,
  (v) => {
    form.item_code = v?.item_code ?? ''
    form.L = v?.L ?? null
    form.W = v?.W ?? null
    form.H = v?.H ?? null
    form.coefficient = v?.coefficient ?? null
  },
  { immediate: true }
)

// Helpers đếm 1-based
const charAt1 = (s, pos) => (s && s.length >= pos ? s[pos - 1] : '')
const substr1 = (s, start, len) =>
  (s && s.length >= start ? s.substring(start - 1, start - 1 + len) : '')

// Cho nhập L/W/H khi: ký tự thứ 10 = '0' hoặc ký tự 10–11 = 'S1'
const canEditDims = computed(() => {
  const code = String(form.item_code || '').trim().toUpperCase()
  const c10 = charAt1(code, 10)
  const s10_11 = substr1(code, 10, 2)
  return c10 === '0' || s10_11 === 'S1'
})

// Validator số thập phân không âm, tối đa N chữ số sau dấu phẩy
const decValidator =
  (maxDp, label) =>
  (_, value) => {
    if (value === null || value === undefined || value === '') {
      return Promise.reject(new Error(`Vui lòng nhập ${label}`))
    }
    const num = Number(value)
    if (Number.isNaN(num) || num < 0) {
      return Promise.reject(new Error(`${label} phải là số không âm`))
    }
    const s = String(value)
    const dp = s.includes('.') ? s.split('.')[1].length : 0
    if (dp > maxDp) {
      return Promise.reject(new Error(`${label} tối đa ${maxDp} số thập phân`))
    }
    return Promise.resolve()
  }

// Rules động theo canEditDims
const rules = computed(() => ({
  item_code: [{ required: true, message: 'Vui lòng nhập mã hàng' }],
  L: canEditDims.value ? [{ validator: decValidator(4, 'L (mm)') }] : [],
  W: canEditDims.value ? [{ validator: decValidator(4, 'W (mm)') }] : [],
  H: canEditDims.value ? [{ validator: decValidator(4, 'H (mm)') }] : [],
  coefficient: !canEditDims.value
    ? [{ validator: decValidator(4, 'Diện tích sản phẩm (m²)') }]
    : [],
}))

function submit() {
  formRef.value?.validate()
    .then(() => {
      const payload = {
        item_code: String(form.item_code || '').trim(),
      }

      if (canEditDims.value) {
        // Gửi L/W/H dạng số thập phân (mm)
        payload.L = form.L !== null && form.L !== '' ? Number(form.L) : null
        payload.W = form.W !== null && form.W !== '' ? Number(form.W) : null
        payload.H = form.H !== null && form.H !== '' ? Number(form.H) : null
        // Không gửi coefficient để BE tự tính nếu cần
      } else {
        payload.coefficient =
          form.coefficient !== null && form.coefficient !== ''
            ? Number(form.coefficient)
            : null
      }

      emit('submit', payload)
    })
    .catch(() => {
      /* validate fail */
    })
}
</script>
