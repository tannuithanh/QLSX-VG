// utils/layoutRatioHelper.js

/** Map { fullCode => layout_ratio } từ list layout_coefficients (đã có layout_ratio sẵn) */
export function buildCoeffMap(list = []) {
  const map = new Map();
  for (const r of list) {
    const code = String(r.item_code || "").trim();
    const ratio = r.layout_ratio != null ? Number(r.layout_ratio) : null;
    if (code && ratio != null && !Number.isNaN(ratio)) map.set(code, ratio);
  }
  return map;
}

/** Lấy prefix theo 2 nhóm đầu (phần trước 2 dấu '-') + dấu '-' ở cuối.
 * "66-84008-B2-B2" -> "66-84008-"
 * "66-04016-S1"    -> "66-04016-"
 */
function getBasePrefixByHyphens(code = "") {
  const parts = String(code || "")
    .trim()
    .split("-");
  if (parts.length < 2) return "";
  return parts.slice(0, 2).join("-") + "-";
}

/** Parse theo ký tự 10–11, nhưng basePrefix lấy theo 2 nhóm đầu */
export function parseByPos10_11(itemCode = "") {
  const s = String(itemCode || "").trim();
  const basePrefix = getBasePrefixByHyphens(s);

  const c10 = s.charAt(9) || ""; // vị trí 10 (1-based)
  const c11 = s.charAt(10) || ""; // vị trí 11 (1-based)
  const keyStr = `${c10}${c11}`;

  let type = "0";
  let n = 1;

  if (/[BLSX]/i.test(c10) && /\d/.test(c11)) {
    type = c10.toUpperCase();
    n = parseInt(c11, 10);
  } else if (/\d/.test(c10) && /\d/.test(c11)) {
    type = "0";
    n = 1;
  } else {
    type = "0";
    n = 1;
  }
  return { basePrefix, type, n, keyStr, raw: s };
}

/** Lấy các mã dạng "0" (…-01..99) theo prefix */
function findAvailableZeroCodes(basePrefix, coeffMap) {
  const list = [];
  for (const key of coeffMap.keys()) {
    if (key.startsWith(basePrefix)) {
      const suffix = key.slice(basePrefix.length);
      if (/^\d{2}$/.test(suffix)) list.push(key);
    }
  }
  list.sort((a, b) => parseInt(a.slice(-2), 10) - parseInt(b.slice(-2), 10));
  return list;
}

/** Chọn danh sách mã "0" theo quy tắc (B/L/X dùng 0-xx; S có ưu tiên riêng xử lý dưới) */
function selectByRule(type, n, available) {
  const nums = available.map((c) => parseInt(c.slice(-2), 10));
  const map = new Map(nums.map((num, i) => [num, available[i]]));

  const rangeOk =
    type === "B" || type === "L"
      ? n >= 2 && n <= 5
      : type === "S" || type === "X" || type === "0"
      ? n >= 1 && n <= 6
      : false;
  if (!rangeOk)
    return {
      ok: false,
      list: [],
      reason: `Số n không hợp lệ cho loại ${type}`,
    };

  if (type === "L" || type === "X" || type === "S") {
    const need = [];
    for (let i = 1; i <= n; i++) {
      if (!map.has(i))
        return {
          ok: false,
          list: [],
          reason: `Thiếu liên tiếp: cần 01..${String(n).padStart(2, "0")}`,
        };
      need.push(map.get(i));
    }
    return { ok: true, list: need, reason: null };
  }

  if (type === "B") {
    if (!nums.length)
      return { ok: false, list: [], reason: "Không có mã 0 nào" };
    const max = Math.max(...nums);
    const need = [];
    for (let i = 0; i < n; i++) {
      const k = max - i;
      if (!map.has(k)) {
        const from = String(max).padStart(2, "0");
        const to = String(max - n + 1).padStart(2, "0");
        return {
          ok: false,
          list: [],
          reason: `Thiếu liên tiếp cho B: cần ${from}..${to}`,
        };
      }
      need.push(map.get(k));
    }
    return { ok: true, list: need, reason: null };
  }

  return { ok: false, list: [], reason: `Loại không hỗ trợ: ${type}` };
}

/** TÍNH + LOG “plain text” đúng format bạn yêu cầu
 * - Ưu tiên S: nếu tồn tại mã trực tiếp ...-S{n} trong bảng hệ số → dùng luôn, không cần 01..0n
 */
export function computeLayoutQtyVerboseByPos(
  itemCode,
  qtyActual,
  coeffMap,
  options = {}
) {
  const { debug = false, logger = console.log } = options;
  const qty = Number(qtyActual);
  const { basePrefix, type, n, keyStr } = parseByPos10_11(itemCode);

  if (debug) {
    logger(`Mã ${itemCode}`);
    logger(`SL thực tế: ${Number.isFinite(qty) ? qty : "NaN"}`);
    logger(`Xác định theo ký tự [10,11] = "${keyStr}" → type=${type}, n=${n}`);
    logger(`Truy cứu dữ liệu layout: prefix "${basePrefix}"`);
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    debug && logger(`→ SLTT không hợp lệ (<=0/NaN) → Tổng = 0`);
    return { total: 0, used: [], warn: null };
  }

  // TRƯỜNG HỢP MÃ 0 TRỰC TIẾP (…-02)
  if (type === "0" && /^\d{2}$/.test(keyStr)) {
    const full = `${basePrefix}${keyStr}`;
    const ratio = coeffMap.get(full);
    if (debug) {
      logger(`→ Tìm trực tiếp mã 0: ${full}`);
      logger(`ratio(${full}) = ${ratio ?? "NULL"}`);
    }
    if (ratio == null || Number.isNaN(Number(ratio))) {
      debug && logger(`→ Không thấy ratio cho ${full} → Không tính được`);
      return { total: null, used: [], warn: `Thiếu dữ liệu cho ${full}` };
    }
    const subtotal = qty * Number(ratio);
    debug && logger(`Công thức: ${qty} * ${Number(ratio)} = ${subtotal}`);
    debug && logger(`Tổng: ${subtotal}`);
    return { total: subtotal, used: [full], warn: null };
  }

  // QUY TẮC S — ƯU TIÊN DÙNG TRỰC TIẾP S{n} NẾU CÓ
  if (type === "S") {
    const directS = `${basePrefix}S${n}`;
    const rS = coeffMap.get(directS);
    if (rS != null && !Number.isNaN(Number(rS))) {
      if (debug) {
        logger(`→ Ưu tiên S: tìm thấy ${directS} trong bảng hệ số`);
        logger(`ratio(${directS}) = ${rS}`);
        const subtotal = qty * Number(rS);
        logger(`Công thức: ${qty} * ${Number(rS)} = ${subtotal}`);
        logger(`Tổng: ${subtotal}`);
      }
      return { total: qty * Number(rS), used: [directS], warn: null };
    }
    debug && logger(`→ Không có ${directS} → fallback sang bộ 01..0${n}`);
  }

  // B/L/X (và S fallback) — dùng 0-xx
  const available = findAvailableZeroCodes(basePrefix, coeffMap);
  if (debug) {
    // giúp bạn soi vì sao “tìm thấy 0 mã 0”
    const samplePrefixes = [...coeffMap.keys()]
      .filter((k) => k.startsWith(basePrefix))
      .slice(0, 10);
    logger(`→ Tìm thấy ${available.length} mã 0: [${available.join(", ")}]`);
    if (available.length === 0) {
      logger(
        `→ Gợi ý debug: Có ${
          samplePrefixes.length
        } mã cùng prefix nhưng KHÔNG phải 0-xx? [${samplePrefixes.join(", ")}]`
      );
    }
  }

  const sel = selectByRule(type, n, available);
  if (!sel.ok) {
    debug && logger(`→ Không đạt quy tắc ${type}${n}: ${sel.reason}`);
    return { total: null, used: [], warn: sel.reason };
  }

  debug && logger(`Các mã được chọn (${type}${n}): [${sel.list.join(", ")}]`);

  let sum = 0;
  for (const code of sel.list) {
    const ratio = coeffMap.get(code);
    debug && logger(`- ${code}: ratio=${ratio ?? "NULL"}`);
    if (ratio == null || Number.isNaN(Number(ratio))) {
      debug && logger(`→ Thiếu ratio cho ${code} → Không tính được`);
      return { total: null, used: [], warn: `Thiếu layout_ratio cho ${code}` };
    }
    const sub = qty * Number(ratio);
    sum += sub;
    debug && logger(`  subtotal = ${qty} * ${Number(ratio)} = ${sub}`);
  }

  debug && logger(`Tổng (cộng các subtotal) = ${sum}`);
  return { total: sum, used: sel.list, warn: null };
  // return 'oke';
}
