<template>
  <a-modal v-model:visible="innerVisible" title="Import lỗi sản xuất" ok-text="Nhập" cancel-text="Đóng"
    :ok-button-props="{ disabled: !payload.length, loading: submitting }" :width="'90vw'" :mask-closable="false"
    destroy-on-close wrap-class-name="import-clean" @ok="confirm" @cancel="emit('update:visible', false)">
    <!-- Uploader -->
    <a-upload-dragger name="file" :before-upload="beforeUpload" :file-list="fileList" :max-count="1"
      accept=".xlsx,.xls,.csv" :disabled="submitting" @remove="onRemove" class="uploader">
      <InboxOutlined />
      <span class="hint">Kéo file vào đây hoặc bấm để chọn — .xlsx / .xls / .csv</span>
      <span class="sub">
        Cột bắt buộc: Ngày sản xuất, Xưởng, Tổ/nhóm, Đơn hàng, Mã hàng, SL lỗi.
        Tuỳ chọn: Mã lỗi 1–3 & Công đoạn PS 1–3, Hủy.
      </span>
    </a-upload-dragger>

    <a-divider />

    <a-tabs v-model:activeKey="activeTab" size="small" animated>
      <a-tab-pane key="preview">
        <template #tab>
          Preview
          <span v-if="previewRows.length" class="muted">({{ previewRows.length }})</span>
        </template>

        <a-table v-if="previewRows.length" :columns="previewColumns" :data-source="previewRows"
          :pagination="{ pageSize: 10 }" size="small" bordered row-key="__row" :scroll="{ x: tableX, y: 520 }" sticky />
        <a-empty v-else description="Chưa có dữ liệu để xem trước" />
      </a-tab-pane>

      <a-tab-pane v-if="errors.length" key="errors">
        <template #tab>
          Lỗi <a-badge :count="errors.length" :overflow-count="999" />
        </template>
        <div class="error-wrap">
          <a-list :data-source="errors" size="small" bordered>
            <template #renderItem="{ item }">
              <div style="padding:6px 12px">
                <div style="font-weight:600">Dòng {{ item.row }}:</div>
                <ul style="margin:4px 0 0 18px">
                  <li v-for="(e, i) in item.errors" :key="i">{{ e }}</li>
                </ul>
              </div>
            </template>
          </a-list>
        </div>
      </a-tab-pane>
    </a-tabs>

    <div v-if="success && !errors.length" class="success-row">
      Đã sẵn sàng nhập <b>{{ payload.length }}</b> dòng.
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import customParse from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
dayjs.extend(customParse)
dayjs.extend(utc)

/* APIs */
import { dataErrorApi } from '@/services/production_service/dataErrorService'
import { productivityEntryApi } from '@/services/production_service/productivityEntryService'
import { workshopApi } from '@/services/production_service/workshopService'
import { teamApi } from '@/services/production_service/teamService'
import { errorCodeApi } from '@/services/production_service/errorCodeService'
import { stageApi } from '@/services/production_service/stageService'

/* Props/Emits */
const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'done'])
const innerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

/* State */
const submitting = ref(false)
const fileList = ref([])
const errors = ref([])
const success = ref(false)
const activeTab = ref('preview')

const previewRows = ref([])
const previewColumns = ref([])
const payload = ref([]) // dữ liệu sạch để import
const tableX = ref(2000)

/* ===== Helpers ===== */
const pad = n => String(n).padStart(2, '0')
const required = v => v !== undefined && v !== null && String(v).trim() !== ''
const numLike = v => { const n = Number(v); return v !== '' && Number.isFinite(n) }
const textKey = v => String(v ?? '').replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim()
const codeKey = v => String(v ?? '').trim().toUpperCase()

function slugHeader(v) {
  return (v ?? '')
    .toString()
    .trim()
    .replace(/Đ/g, 'D').replace(/đ/g, 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '_')
}
function viSlug(s) {
  return (s ?? '')
    .toString()
    .trim()
    .replace(/Đ/g, 'D').replace(/đ/g, 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ')
}
const sameCode = (a, b) => viSlug(a) === viSlug(b)

function parseISODate(value) {
  if (typeof value === 'number' || (/^\d+(\.\d+)?$/.test(String(value)))) {
    const p = XLSX.SSF.parse_date_code(Number(value))
    if (p && p.y && p.m && p.d) return `${p.y}-${pad(p.m)}-${pad(p.d)}`
  }
  const s = String(value || '').trim().replace(/\./g, '/')
  if (!s) return null
  const fmts = ['D/M/YYYY', 'DD/MM/YYYY', 'D/M/YY', 'DD/MM/YY', 'YYYY/M/D', 'YYYY-MM-DD', 'M/D/YYYY']
  for (const f of fmts) {
    const d = dayjs(s, f, true)
    if (d.isValid()) return d.format('YYYY-MM-DD')
  }
  const d2 = dayjs(s)
  return d2.isValid() ? d2.format('YYYY-MM-DD') : null
}

// Chuẩn hoá & nhận diện “hủy”
function plain(v = '') {
  return String(v ?? '')
    .replace(/Đ/g, 'D').replace(/đ/g, 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
}
function isHuyMark(v) {
  const s = plain(v)
  if (!s) return false
  return s === 'huy'
}

/* ===== Uploader ===== */
function beforeUpload(file) {
  fileList.value = [file]
  resetState(false)
  if (file.name.toLowerCase().endsWith('.csv')) readCSV(file)
  else readXLSX(file)
  return false
}
function readXLSX(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: 'array', cellDates: false, cellNF: false, cellText: false })
      processWorkbook(wb)
    } catch { message.error('Không đọc được file Excel') }
  }
  reader.onerror = () => message.error('Không đọc được file Excel')
  reader.readAsArrayBuffer(file)
}
function readCSV(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: 'string' })
      processWorkbook(wb)
    } catch { message.error('Không đọc được file CSV') }
  }
  reader.onerror = () => message.error('Không đọc được file CSV')
  reader.readAsText(file)
}

/* ===== Parse workbook ===== */
function processWorkbook(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]]

  // thô 5 hàng đầu -> xác định header
  const headRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' })
  const REQ = {
    ngay_sx: ['ngay_san_xuat', 'ngay_sx', 'ngay', 'date', 'production_date'],
    xuong: ['xuong', 'xuong_name', 'factory'],
    to_nhom: ['to_nhom', 'to', 'team'],
    don_hang: ['don_hang', 'so_don', 'order'],
    ma_hang: ['ma_hang', 'item', 'item_code', 'ma'],
    sl_loi: ['sl_loi', 'so_luong_loi', 'loi', 'sl_loi_', 'so_luong', 'sl'],
  }
  let headerRowIdx = 0
  for (let r = 0; r < Math.min(5, headRows.length); r++) {
    const line = (headRows[r] || []).map(slugHeader)
    let hit = 0
    for (const list of Object.values(REQ)) if (list.some(a => line.includes(a))) hit++
    if (hit >= 4) { headerRowIdx = r; break }
  }

  // gộp 2 hàng header + tự gán số cho "Công đoạn PS"
  const top = headRows[headerRowIdx] || []
  const sub = headRows[headerRowIdx + 1] || []
  const merged = top.map((t, i) => (sub[i] && String(sub[i]).trim()) ? sub[i] : t)
  let curIdx = 0
  for (let i = 0; i < merged.length; i++) {
    const s = slugHeader(String(merged[i] || '').trim())
    if (/^ma_?loi_?1$/.test(s)) curIdx = 1
    if (/^ma_?loi_?2$/.test(s)) curIdx = 2
    if (/^ma_?loi_?3$/.test(s)) curIdx = 3
    if (s === 'cong_doan_ps' && curIdx > 0) merged[i] = `Công đoạn PS ${curIdx}`
  }
  const headers = merged.map((txt, i) => ({ title: txt || `COL_${i + 1}`, key: slugHeader(txt) || `col_${i + 1}` }))

  const dataStart = (sub.some(x => String(x).trim()) ? headerRowIdx + 2 : headerRowIdx + 1)
  const raw = XLSX.utils.sheet_to_json(ws, {
    header: headers.map(h => h.key),
    range: dataStart,
    defval: '',
    raw: true,
  })

  const OPT = {
    ma_loi_1: ['ma_loi_1', 'ma_loi1', 'ma_loi_01'],
    cd_ps_1: ['cong_doan_ps_1', 'cong_doan_1', 'cd_ps_1', 'ps_1'],
    ma_loi_2: ['ma_loi_2', 'ma_loi2', 'ma_loi_02'],
    cd_ps_2: ['cong_doan_ps_2', 'cong_doan_2', 'cd_ps_2', 'ps_2'],
    ma_loi_3: ['ma_loi_3', 'ma_loi3', 'ma_loi_03'],
    cd_ps_3: ['cong_doan_ps_3', 'cong_doan_3', 'cd_ps_3', 'ps_3'],
    huy: ['huy', 'hang_huy', 'huy_sl', 'so_luong_huy', 'huy_doi_voi_hang_huy'],
  }
  const pick = (obj, aliases) => { for (const k of aliases) if (obj[k] !== undefined && obj[k] !== '') return obj[k]; return '' }

  const rows = raw.map((r, i) => {
    const dateISO = parseISODate(pick(r, REQ.ngay_sx))
    const huyRaw = pick(r, OPT.huy)
    return {
      __row: i + 1,
      ngay_sx: dateISO ? dayjs(dateISO).format('DD/MM/YYYY') : pick(r, REQ.ngay_sx),
      __dateISO: dateISO,
      xuong: String(pick(r, REQ.xuong) ?? '').trim(),
      to_nhom: String(pick(r, REQ.to_nhom) ?? '').trim(),
      don_hang: String(pick(r, REQ.don_hang) ?? '').trim(),
      ma_hang: String(pick(r, REQ.ma_hang) ?? '').trim(),
      sl_loi: pick(r, REQ.sl_loi),
      ma_loi_1: String(pick(r, OPT.ma_loi_1) ?? '').trim(),
      cd_ps_1: String(pick(r, OPT.cd_ps_1) ?? '').trim(),
      ma_loi_2: String(pick(r, OPT.ma_loi_2) ?? '').trim(),
      cd_ps_2: String(pick(r, OPT.cd_ps_2) ?? '').trim(),
      ma_loi_3: String(pick(r, OPT.ma_loi_3) ?? '').trim(),
      cd_ps_3: String(pick(r, OPT.cd_ps_3) ?? '').trim(),
      huy_raw: huyRaw,
      __is_huy: isHuyMark(huyRaw),
    }
  })

  // Validate + build payload sạch
  const rowErrors = []
  const out = []
  rows.forEach(r => {
    const e = []

    // ===== 1) Validate bắt buộc =====
    if (!r.__dateISO) e.push('Không nhận dạng được "Ngày sản xuất".')
    if (!required(r.xuong)) e.push('Thiếu "Xưởng".')
    if (!required(r.to_nhom)) e.push('Thiếu "Tổ/nhóm".')
    if (!required(r.don_hang)) e.push('Thiếu "Đơn hàng".')
    if (!required(r.ma_hang)) e.push('Thiếu "Mã hàng".')
    if (!numLike(r.sl_loi)) e.push('"SL lỗi" phải là số.')

    // Cột Hủy: chỉ trống hoặc "hủy"
    if (String(r.huy_raw ?? '').trim() !== '' && !r.__is_huy) {
      e.push('Cột "Hủy" chỉ được ghi "hủy" (không phân biệt hoa/thường, có/không dấu) hoặc để trống.')
    }

    // ===== 2) Quy tắc Stage/Code trong cùng một dòng =====
    // 2.1 Có stage thì bắt buộc phải có code (cho từng cặp 1..3)
    for (let i = 1; i <= 3; i++) {
      const st = String(r[`cd_ps_${i}`] ?? '').trim()
      const cd = String(r[`ma_loi_${i}`] ?? '').trim()
      if (st && !cd) e.push(`Công đoạn PS ${i} có nhưng thiếu Mã lỗi ${i}.`)
    }

    // 2.2 Không được trùng "mã lỗi" giữa 3 cặp (dù khác stage)
    const codeList = [r.ma_loi_1, r.ma_loi_2, r.ma_loi_3]
      .map(v => codeKey(v))      // chuẩn hoá: trim + upper
      .filter(Boolean)           // bỏ rỗng
    const dupCode = (new Set(codeList)).size !== codeList.length
    if (dupCode) {
      e.push('Trong cùng một dòng: không được trùng "Mã lỗi" giữa các cột (Mã lỗi 1–3).')
    }

    // 2.3 Được phép trùng stage, nhưng KHÔNG được trùng cặp (stage + code)
    const pairSet = new Set()
    let dupPair = false
    for (let i = 1; i <= 3; i++) {
      const rawStage = String(r[`cd_ps_${i}`] ?? '').trim()
      const rawCode = String(r[`ma_loi_${i}`] ?? '').trim()
      if (!rawStage || !rawCode) continue
      const stKey = viSlug(rawStage)   // chuẩn hoá stage: bỏ dấu, lower
      const cdKey = codeKey(rawCode)   // chuẩn hoá code: upper
      const key = `${stKey}__${cdKey}`
      if (pairSet.has(key)) { dupPair = true; break }
      pairSet.add(key)
    }
    if (dupPair) {
      e.push('Trong cùng một dòng: không được trùng cặp (Công đoạn + Mã lỗi).')
    }

    // ===== 3) Kết luận dòng / Build payload =====
    if (e.length) {
      rowErrors.push({ row: r.__row, errors: e })
    } else {
      out.push({
        production_date: r.__dateISO,           // YYYY-MM-DD
        workshop: r.xuong,                      // text người dùng
        team: r.to_nhom,                        // text người dùng
        order_no: textKey(r.don_hang),
        item_code: textKey(r.ma_hang),
        defect_qty: Number(r.sl_loi),

        defect1_code: textKey(r.ma_loi_1) || null,
        defect1_stage: textKey(r.cd_ps_1) || null,
        defect2_code: textKey(r.ma_loi_2) || null,
        defect2_stage: textKey(r.cd_ps_2) || null,
        defect3_code: textKey(r.ma_loi_3) || null,
        defect3_stage: textKey(r.cd_ps_3) || null,

        is_scrapped: r.__is_huy,               // boolean cho BE
        __stt: r.__row,
      })
    }
  })


  // Preview
  previewRows.value = rows.slice(0, 800)
  previewColumns.value = [
    { title: 'Stt', key: '__row', width: 70, align: 'center', fixed: 'left', customRender: ({ record }) => record.__row },
    { title: 'Ngày sản xuất', dataIndex: 'ngay_sx', width: 140, fixed: 'left' },
    { title: 'Xưởng', dataIndex: 'xuong', width: 140 },
    { title: 'Tổ/nhóm', dataIndex: 'to_nhom', width: 160 },
    { title: 'Đơn hàng', dataIndex: 'don_hang', width: 240 },
    { title: 'Mã hàng', dataIndex: 'ma_hang', width: 220 },
    { title: 'SL lỗi', dataIndex: 'sl_loi', width: 90, align: 'right' },
    {
      title: 'Lỗi phát sinh',
      children: [
        { title: 'Mã lỗi 1', dataIndex: 'ma_loi_1', width: 120 },
        { title: 'Công đoạn PS 1', dataIndex: 'cd_ps_1', width: 140 },
        { title: 'Mã lỗi 2', dataIndex: 'ma_loi_2', width: 120 },
        { title: 'Công đoạn PS 2', dataIndex: 'cd_ps_2', width: 140 },
        { title: 'Mã lỗi 3', dataIndex: 'ma_loi_3', width: 120 },
        { title: 'Công đoạn PS 3', dataIndex: 'cd_ps_3', width: 140 },
      ],
    },
    {
      title: 'Hủy (Đối với hàng hủy)', key: 'huy', width: 160, align: 'center',
      customRender: ({ record }) => record.__is_huy ? 'Hủy' : ''
    },
  ]
  tableX.value = 70 + 140 + 140 + 160 + 240 + 220 + 90 + (120 + 140) * 3 + 160 + 120

  payload.value = out
  errors.value = rowErrors
  success.value = !rowErrors.length && out.length > 0
  activeTab.value = rowErrors.length ? 'errors' : 'preview'

  message.success(`Đọc ${rows.length} dòng (hợp lệ ${out.length}${rowErrors.length ? `, lỗi ${rowErrors.length}` : ''}).`)
}

/* ===== Masters ===== */
const wsCache = ref([])
const teamCache = ref([])
const errorCodeSet = ref(new Set()) // set(code)
const stageCodeSet = ref(new Set()) // set(code)

async function ensureMastersLoaded() {
  const jobs = []
  if (!wsCache.value.length) jobs.push(workshopApi.listAll().then(v => wsCache.value = v || []))
  if (!teamCache.value.length) jobs.push(teamApi.listAll().then(v => teamCache.value = v || []))
  if (!errorCodeSet.value.size) jobs.push(errorCodeApi.listAll().then(v => errorCodeSet.value = new Set((v || []).map(x => codeKey(x.code)))))
  if (!stageCodeSet.value.size) jobs.push(stageApi.listAll().then(v => stageCodeSet.value = new Set((v || []).map(x => codeKey(x.code)))))
  if (jobs.length) await Promise.all(jobs)
}
function findWorkshop(xuongText) {
  const t = String(xuongText || '')
  if (!t) return null
  const byCode = wsCache.value.find(w => sameCode(w.code, t))
  if (byCode) return byCode
  return wsCache.value.find(w => viSlug(w.name) === viSlug(t)) || null
}
function findTeam(toText, workshopId) {
  const t = String(toText || '')
  if (!t || !workshopId) return null
  const pool = teamCache.value.filter(x => Number(x.workshop_id) === Number(workshopId))
  const byCode = pool.find(x => sameCode(x.code, t))
  if (byCode) return byCode
  return pool.find(x => viSlug(x.name) === viSlug(t)) || null
}
const fmtWs = w => (w ? `${w.name} (${w.code})` : '')
const fmtTeam = t => (t ? `${t.name} (${t.code})` : '')

/* ===== PE index (so với năng suất) ===== */
async function buildExistingPEIndexByCode(dateMin, dateMax) {
  const params = (dateMin && dateMax) ? { date_from: dateMin, date_to: dateMax, fields: 'keys' } : { fields: 'keys' }
  let rows = await productivityEntryApi.listAll(params)
  if (!Array.isArray(rows) || !rows.length) rows = await productivityEntryApi.listAll({ fields: 'keys' })

  const wsIdToCode = new Map(wsCache.value.map(w => [Number(w.id), codeKey(w.code)]))
  const teamIdToCode = new Map(teamCache.value.map(t => [Number(t.id), codeKey(t.code)]))

  const idx = new Set()
  for (const r of rows) {
    // Fix lệch ngày: BE trả UTC -> so theo local
    const d = dayjs.utc(r.production_date).local().format('YYYY-MM-DD')
    if (dateMin && d < dateMin) continue
    if (dateMax && d > dateMax) continue
    const wCode = wsIdToCode.get(Number(r.workshop_id)) || ''
    const tCode = teamIdToCode.get(Number(r.team_id)) || ''
    const ord = textKey(r.order_no)
    const itm = textKey(r.item_code)
    idx.add(`${d}__${wCode}__${tCode}__${ord}__${itm}`)
  }
  return idx
}

/* ===== Precheck trước khi import ===== */
async function precheckAll() {
  await ensureMastersLoaded()
  if (!payload.value.length) {
    return { ok: false, errors: [{ row: '-', errors: ['Không có dữ liệu hợp lệ để kiểm tra.'] }] }
  }

  // Khoảng ngày để giảm tải fetch năng suất
  let minDate = null, maxDate = null
  for (const r of payload.value) {
    const d = String(r.production_date || '')
    if (!d) continue
    if (!minDate || d < minDate) minDate = d
    if (!maxDate || d > maxDate) maxDate = d
  }

  const existing = await buildExistingPEIndexByCode(minDate, maxDate)
  const errs = []

  for (const r of payload.value) {
    const ws = findWorkshop(r.workshop)
    if (!ws) { errs.push({ row: r.__stt, errors: [`Không tìm thấy Xưởng "${r.workshop}" trong hệ thống.`] }); continue }
    const team = findTeam(r.team, ws.id)
    if (!team) { errs.push({ row: r.__stt, errors: [`Không tìm thấy Tổ/nhóm "${r.team}" thuộc Xưởng ${fmtWs(ws)}.`] }); continue }

    const key = `${r.production_date}__${codeKey(ws.code)}__${codeKey(team.code)}__${textKey(r.order_no)}__${textKey(r.item_code)}`
    if (!existing.has(key)) {
      errs.push({
        row: r.__stt,
        errors: [
          'Không trùng với dữ liệu năng suất đã có.',
          `Ngày: ${dayjs(r.production_date).format('DD/MM/YYYY')}`,
          `Xưởng: ${fmtWs(ws)}`,
          `Tổ/nhóm: ${fmtTeam(team)}`,
          `Đơn hàng: ${r.order_no}`,
          `Mã hàng: ${r.item_code}`,
        ],
      })
    }

    // Kiểm tra mã lỗi/công đoạn nếu có
    const bad = []
    const { defect1_code: m1, defect1_stage: s1, defect2_code: m2, defect2_stage: s2, defect3_code: m3, defect3_stage: s3 } = r
    if (m1 && !errorCodeSet.value.has(codeKey(m1))) bad.push(`Mã lỗi 1 "${m1}" không tồn tại`)
    if (s1 && !stageCodeSet.value.has(codeKey(s1))) bad.push(`Công đoạn PS 1 "${s1}" không tồn tại`)
    if (m2 && !errorCodeSet.value.has(codeKey(m2))) bad.push(`Mã lỗi 2 "${m2}" không tồn tại`)
    if (s2 && !stageCodeSet.value.has(codeKey(s2))) bad.push(`Công đoạn PS 2 "${s2}" không tồn tại`)
    if (m3 && !errorCodeSet.value.has(codeKey(m3))) bad.push(`Mã lỗi 3 "${m3}" không tồn tại`)
    if (s3 && !stageCodeSet.value.has(codeKey(s3))) bad.push(`Công đoạn PS 3 "${s3}" không tồn tại`)
    if (bad.length) errs.push({ row: r.__stt, errors: bad })
  }

  return { ok: errs.length === 0, errors: errs }
}

/* ===== Build rows cho BE ===== */
function buildRowsForPost() {
  return payload.value.map(r => {
    const ws = findWorkshop(r.workshop)
    const team = ws ? findTeam(r.team, ws.id) : null

    return {
      __row: r.__stt,
      production_date: r.production_date,     // YYYY-MM-DD
      workshop_id: ws?.id ?? null,            // dùng ID
      team_id: team?.id ?? null,              // dùng ID
      order_no: r.order_no?.trim() ?? '',
      item_code: r.item_code?.trim() ?? '',
      error_qty: r.defect_qty ?? 0,

      error_code_1: r.defect1_code || null,
      error_stage_1: r.defect1_stage || null,
      error_code_2: r.defect2_code || null,
      error_stage_2: r.defect2_stage || null,
      error_code_3: r.defect3_code || null,
      error_stage_3: r.defect3_stage || null,

      is_scrapped: !!r.is_scrapped,           // boolean cho BE
    }
  })
}

/* ===== Actions ===== */
async function confirm() {
  if (!payload.value.length) return message.warning('Không có dữ liệu hợp lệ để nhập.')

  const pre = await precheckAll()
  if (!pre.ok) {
    errors.value = pre.errors
    activeTab.value = 'errors'
    success.value = false
    return message.error('Có dòng không hợp lệ. Vui lòng kiểm tra tab Lỗi.')
  }

  submitting.value = true
  try {
    const rowsToPost = buildRowsForPost()
    const res = await dataErrorApi.bulkInsert({ rows: rowsToPost })
    emit('done', res?.data?.inserted_count ?? rowsToPost.length)
    emit('update:visible', false)
  } catch (e) {
    const errs = e?.response?.data?.errors
    if (Array.isArray(errs) && errs.length) {
      errors.value = errs
      activeTab.value = 'errors'
      success.value = false
      message.error(e?.response?.data?.message || 'Import thất bại.')
    } else {
      message.error('Có lỗi khi gọi API import.')
    }
  } finally {
    submitting.value = false
  }
}
function onRemove() { resetState(true) }
function resetState(clearFile) {
  if (clearFile) fileList.value = []
  errors.value = []
  success.value = false
  activeTab.value = 'preview'
  previewRows.value = []
  previewColumns.value = []
  payload.value = []
}
</script>

<style scoped>
.import-clean .uploader {
  border: 1px dashed #d9d9d9;
  padding: 12px;
}

.import-clean .uploader .hint {
  display: block;
  margin-top: 6px;
  font-weight: 600;
}

.import-clean .uploader .sub {
  display: block;
  color: #888;
  margin-top: 4px;
}

.error-wrap {
  max-height: 520px;
  overflow: auto;
}

.success-row {
  margin-top: 8px;
  color: #389e0d;
}
</style>
