<template>
  <a-drawer
    v-model:visible="internalOpen"
    :title="mode === 'edit' ? 'Sửa người dùng' : 'Thêm người dùng'"
    :width="720"
    destroy-on-close
    @close="$emit('update:open', false)"
    :footer-style="{ textAlign: 'right' }"
  >
    <a-form ref="formRef" layout="vertical" :model="form" :rules="rules" @submit.prevent>
      <a-row :gutter="16">
        <!-- Thông tin cơ bản -->
        <a-col :span="24">
          <a-card size="small" class="block" title="Thông tin cơ bản">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="Họ và tên" name="name" has-feedback>
                  <a-input v-model:value="form.name" placeholder="VD: Nguyễn Văn A" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Mã số nhân viên" name="msnv" has-feedback>
                  <a-input v-model:value="form.msnv" placeholder="VD: NV00123" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Số điện thoại" name="phone">
                  <a-input v-model:value="form.phone" placeholder="VD: 0901234567" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Email" name="email" has-feedback>
                  <a-input v-model:value="form.email" placeholder="name@company.com" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="Địa chỉ" name="address">
                  <a-textarea
                    v-model:value="form.address"
                    :rows="2"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-card>
        </a-col>

        <!-- Công việc -->
        <a-col :span="24">
          <a-card size="small" class="block" title="Thông tin công việc">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="Chức vụ" name="position">
                  <a-select
                    v-model:value="form.position"
                    :options="positionOptions"
                    allow-clear
                    placeholder="Chọn chức vụ"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Chi tiết chức vụ" name="positionDetail" has-feedback>
                  <a-input
                    v-model:value="form.positionDetail"
                    placeholder="VD: Team Lead Frontend"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Phòng ban" name="department">
                  <a-select
                    v-model:value="form.department"
                    :options="deptOptions"
                    allow-clear
                    placeholder="Chọn phòng ban"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Bộ phận" name="unit" has-feedback>
                  <a-input v-model:value="form.unit" placeholder="Nhập bộ phận" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Admin" name="isAdmin">
                  <a-switch
                    v-model:checked="form.isAdmin"
                    checked-children="Admin"
                    un-checked-children="User"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-card>
        </a-col>
      </a-row>

      <a-divider />
      <a-space>
        <a-button @click="$emit('cancel')">Huỷ</a-button>
        <a-button type="primary" @click="submit">Lưu</a-button>
      </a-space>
    </a-form>
  </a-drawer>
</template>

<script setup>
import { ref, watch, reactive } from "vue";

const props = defineProps({
  open: Boolean,
  mode: { type: String, default: "create" }, // 'create' | 'edit'
  initial: { type: Object, default: null },
  deptOptions: Array,
  positionOptions: Array,
});
const emit = defineEmits(["update:open", "submit", "cancel"]);

const internalOpen = ref(props.open);
watch(
  () => props.open,
  (v) => (internalOpen.value = v)
);
watch(internalOpen, (v) => emit("update:open", v));

const emptyForm = () => ({
  id: null,
  name: "",
  email: "",
  msnv: "",
  phone: "",
  address: "",
  position: undefined,
  positionDetail: "",
  department: undefined,
  unit: "",
  isAdmin: false,
});

const form = reactive(emptyForm());

watch(
  () => props.initial,
  (val) => {
    Object.assign(form, emptyForm(), val || {});
  },
  { immediate: true }
);

const rules = {
  name: [
    { required: true, message: "Vui lòng nhập họ tên" },
    { min: 2, message: "Tối thiểu 2 ký tự" },
  ],
  msnv: [
    { required: true, message: "Vui lòng nhập MSNV" },
    {
      pattern: /^[A-Za-z0-9\-_.]{3,}$/,
      message: "MSNV không hợp lệ",
    },
  ],
  // phone: không required nữa
  email: [
    { required: true, message: "Nhập email" },
    { type: "email", message: "Email không hợp lệ" },
  ],
  department: [{ required: true, message: "Chọn phòng ban" }],
  unit: [{ required: true, message: "Nhập bộ phận" }],
  position: [{ required: true, message: "Chọn chức vụ" }],
  positionDetail: [{ required: true, message: "Nhập chi tiết chức vụ" }],
};

const formRef = ref();

async function submit() {
  await formRef.value?.validate();
  emit("submit", { ...form });
}
</script>

<style scoped>
.block {
  margin-bottom: 12px;
}
</style>
