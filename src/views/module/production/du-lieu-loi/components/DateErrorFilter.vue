<template>
    <a-form layout="inline" @submit.prevent>
        <a-form-item label="Đơn hàng">
            <a-input v-model:value="model.order_no" allowClear style="width:220px" placeholder="Nhập đơn hàng" />
        </a-form-item>

        <a-form-item label="Mã hàng">
            <a-input v-model:value="model.item_code" allowClear style="width:200px" placeholder="Nhập mã hàng" />
        </a-form-item>

        <a-form-item label="Từ ngày">
            <a-date-picker v-model:value="fromObj" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                placeholder="Chọn từ ngày" style="width:150px" />
        </a-form-item>

        <a-form-item label="Đến ngày">
            <a-date-picker v-model:value="toObj" format="DD/MM/YYYY" value-format="YYYY-MM-DD"
                placeholder="Chọn đến ngày" style="width:150px" />
        </a-form-item>

        <a-form-item>
            <a-space>
                <a-button type="primary" @click="$emit('search')">Lọc</a-button>
                <a-button @click="reset">Xoá lọc</a-button>
            </a-space>
        </a-form-item>
    </a-form>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({ order_no: '', item_code: '', date_from: null, date_to: null })
    }
})
const emit = defineEmits(['update:modelValue', 'search', 'reset'])

const model = computed({
    get: () => props.modelValue,
    set: v => emit('update:modelValue', v)
})

const fromObj = computed({
    get: () => model.value.date_from || null,
    set: v => { model.value = { ...model.value, date_from: v || null } }
})
const toObj = computed({
    get: () => model.value.date_to || null,
    set: v => { model.value = { ...model.value, date_to: v || null } }
})

function reset() {
    model.value = { order_no: '', item_code: '', date_from: null, date_to: null }
    emit('reset')
}
</script>
