<template>
    <div style="display:flex; gap:12px; align-items:center">
        <!-- 👁 Xem -->
        <EyeOutlined v-if="showView" style="color:#1890ff; cursor:pointer; font-size:18px" @click="$emit('view')" />

        <!-- ✏️ Sửa -->
        <EditOutlined v-if="showEdit" style="color:#faad14; cursor:pointer; font-size:18px" @click="$emit('edit')" />

        <!-- 🧮 Tính & lưu -->
        <CalculatorOutlined v-if="showCompute" style="color:#1677ff; cursor:pointer; font-size:18px"
            title="Tính & lưu mã này" @click="$emit('compute')" />

        <!-- ✅ Lưu -->
        <CheckOutlined v-if="showSave" style="color:#52c41a; cursor:pointer; font-size:18px" @click="$emit('save')" />

        <!-- ❌ Huỷ -->
        <CloseOutlined v-if="showCancel" style="color:#8c8c8c; cursor:pointer; font-size:18px"
            @click="$emit('cancel')" />

        <!-- 🗑 Xoá -->
        <template v-if="showDelete">
            <a-popconfirm v-if="confirmOnDelete" :title="confirmTitle" :ok-text="confirmOkText"
                :cancel-text="confirmCancelText" :placement="confirmPlacement" @confirm="$emit('delete')">
                <DeleteOutlined style="color:#f5222d; cursor:pointer; font-size:18px" />
            </a-popconfirm>
            <DeleteOutlined v-else style="color:#f5222d; cursor:pointer; font-size:18px" @click="$emit('delete')" />
        </template>
    </div>
</template>

<script setup>
import {
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckOutlined,
    CloseOutlined,
    CalculatorOutlined,
} from "@ant-design/icons-vue";

defineProps({
    showView: { type: Boolean, default: true },
    showEdit: { type: Boolean, default: true },
    showDelete: { type: Boolean, default: true },
    showSave: { type: Boolean, default: false },
    showCancel: { type: Boolean, default: false },
    showCompute: { type: Boolean, default: false }, // 🔹 thêm prop này

    confirmOnDelete: { type: Boolean, default: true },
    confirmTitle: { type: String, default: "Xoá bản ghi này?" },
    confirmOkText: { type: String, default: "Xoá" },
    confirmCancelText: { type: String, default: "Huỷ" },
    confirmPlacement: { type: String, default: "top" },
});
</script>
