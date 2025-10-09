<template>
    <a-form layout="inline" @submit.prevent>
        <a-form-item label="Từ khoá">
            <a-input v-model:value="local.keyword" placeholder="Tìm mã hoặc dạng lỗi..." allow-clear
                style="min-width:260px" @pressEnter="$emit('search')" />
        </a-form-item>

        <a-form-item>
            <a-button type="primary" @click="$emit('search')">Tìm</a-button>
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
</script>
