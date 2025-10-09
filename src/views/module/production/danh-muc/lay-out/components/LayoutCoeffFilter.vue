<template>
    <a-form layout="inline" @submit.prevent>
        <a-form-item label="Từ khoá">
            <a-input v-model:value="local.keyword" placeholder="Tìm mã hàng / hệ số..." allow-clear
                style="min-width:240px" @pressEnter="$emit('search')" />
        </a-form-item>
    </a-form>
</template>

<script setup>
import { reactive, watch } from 'vue'
const props = defineProps({ modelValue: Object })
const emit = defineEmits(['update:modelValue', 'search'])

const local = reactive({ keyword: '' })
watch(() => props.modelValue, v => Object.assign(local, v || {}), { immediate: true, deep: true })
watch(local, v => emit('update:modelValue', { ...v }), { deep: true })

function reset() { Object.assign(local, { keyword: '' }); emit('search') }
</script>

<style scoped>
.ml-8 {
    margin-left: 8px;
}
</style>
