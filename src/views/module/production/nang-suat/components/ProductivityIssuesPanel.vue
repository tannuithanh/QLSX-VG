<!-- components/ProductivityIssuesPanel.vue -->
<template>
  <a-card :title="`Danh sách mã thiếu (${mergedIssues.length})`" size="small">
    <div v-if="!mergedIssues.length" class="empty">
      <a-empty description="Không có mã thiếu dữ liệu" />
    </div>

    <div v-else class="pill-wrap">
      <div v-for="it in mergedIssues" :key="`${it.item_code}__${it.layout_key11}`" class="pill" :class="pillClass(it)">
        <div class="pill-head">
          <span class="code">{{ it.item_code }}</span>
          <span class="key">Key: <strong>{{ it.layout_key11 || '—' }}</strong></span>
        </div>
        <div class="tags">
          <a-tag v-if="it.stdMissing" color="red" class="tight">Thiếu hệ số chuẩn</a-tag>
          <a-tag v-if="it.layoutMissing" color="orange" class="tight">Thiếu hệ số layout</a-tag>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stdMissingList: { type: Array, default: () => [] },
  layoutIssueList: { type: Array, default: () => [] },
})

/* Helpers */
const norm = (s) => String(s || '').trim().toUpperCase()
const keyOf = (code, key11) => `${norm(code)}__${norm(key11)}`
const isNum = (v) => Number.isFinite(Number(v))

// Thiếu hệ số chuẩn? (coi <=0 hoặc không phải số là thiếu)
// Tương thích nhiều tên field nếu phần cha đổi key
const isStdMissing = (r) => {
  const c = r?._std_coefficient ?? r?.std_coefficient ?? r?.stdCoeff
  const n = Number(c)
  return !(Number.isFinite(n) && n > 0)
}

// Thiếu hệ số layout? (ratio không phải số)
// Thiếu hệ số layout?
const isLayoutMissing = (r) => {
  const ratio = Number(r?.layout_ratio)
  const reason = String(r?.reason || '')
  const saved = Number(r?.qty_layout_output)
  const qty = Number(r?.qty_actual)

  // 1) Không có ratio
  if (!Number.isFinite(ratio)) return true

  // 2) Phần cha đã phân loại bằng reason
  if (reason.includes('Thiếu hệ số layout') || reason.includes('SL theo SP Layout = 0')) return true

  // 3) Dữ liệu cũ: có ratio nhưng đã lưu 0 trong khi qty_actual > 0
  if (Number.isFinite(saved) && saved === 0 && Number.isFinite(qty) && qty > 0) return true

  return false
}


/* UNION + tự tính cờ cho từng item (reactive) */
const mergedIssues = computed(() => {
  // hợp nhất dữ liệu từ cả hai list
  const union = [...(props.stdMissingList || []), ...(props.layoutIssueList || [])]
  const map = new Map()

  for (const r of union) {
    const code = norm(r?.item_code)
    const key11 = norm(r?.layout_key11)
    if (!code && !key11) continue

    const k = keyOf(code, key11)
    const cur = map.get(k) || { item_code: code, layout_key11: key11, stdMissing: false, layoutMissing: false }

    // ✅ tự suy luận cả hai loại thiếu từ chính record
    if (isStdMissing(r)) cur.stdMissing = true
    if (isLayoutMissing(r)) cur.layoutMissing = true

    map.set(k, cur)
  }

  // chỉ giữ item thật sự thiếu ít nhất một loại
  return Array.from(map.values()).filter(x => x.stdMissing || x.layoutMissing)
})

function pillClass(it) {
  if (it.stdMissing && it.layoutMissing) return 'both'
  if (it.stdMissing) return 'std'
  if (it.layoutMissing) return 'layout'
  return ''
}
</script>

<style scoped>
.empty {
  padding: 16px 0;
}

.pill-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.pill {
  border: 1px solid #f0f0f0;
  background: #fff7e6;
  /* nền nhẹ để nổi bật */
  border-radius: 12px;
  padding: 10px 12px;
}

.pill.std {
  border-color: #ff4d4f33;
  background: #fff1f0;
}

.pill.layout {
  border-color: #faad1433;
  background: #fff7e6;
}

.pill.both {
  border-color: #ff4d4f66;
  background: #fff1f0;
}

.pill-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.code {
  font-weight: 600;
}

.key {
  color: #595959;
  font-size: 12px;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

@media (max-width: 576px) {
  .pill-wrap {
    grid-template-columns: 1fr;
  }
  
  .pill {
    padding: 8px 10px;
  }

  .pill-head {
    flex-direction: column;
    gap: 2px;
  }

  .code {
    font-size: 14px;
  }

  .key {
    font-size: 11px;
  }
}

.tight {
  margin-inline: 0;
}
</style>
