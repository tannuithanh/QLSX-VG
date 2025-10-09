<template>
    <div class="report-picker">
        <a-radio-group v-model:value="model">
            <a-radio-button value="nang-suat">Báo cáo năng suất</a-radio-button>
            <!-- Sau này thêm báo cáo khác thì bổ sung ở đây -->
        </a-radio-group>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    modelValue: { type: String, default: 'nang-suat' },
})
const emits = defineEmits(['update:modelValue'])

const model = computed({
    get() { return props.modelValue },  
    set(v) { emits('update:modelValue', v) },
})
</script>

<style scoped>
.report-picker {
    margin-bottom: 12px;
}
</style>
