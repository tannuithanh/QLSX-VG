// src/utils/itemRuleHelper.js

const allowedFor0 = new Set(["01", "02", "03", "04", "05", "06"]);
const allowedForS = new Set(["S1", "S2", "S3", "S4", "S5", "S6"]);
const allowedForL = new Set(["L2", "L3", "L4", "L5"]);
const allowedForB = new Set(["B2", "B3", "B4", "B5"]);
const allowedForX = new Set(["X1", "X2", "X3", "X4", "X5", "X6"]);

export function validateItemCodeRule(itemCode) {
  const errors = [];
  const s = String(itemCode || "").trim();

  // đủ để đọc group (pos10, index 9) + ít nhất 1 ký tự phía sau
  if (s.length < 11) {
    errors.push("Mã hàng phải có tối thiểu 11 ký tự.");
    return { ok: false, rule: null, group: null, errors };
  }

  // Ký tự thứ 10 (index 9)
  const group = s[9]; // '0' | 'S' | 'L' | 'B' | 'X'
  if (!["0", "S", "L", "B", "X"].includes(group)) {
    errors.push(
      `Ký tự thứ 10 phải là một trong: 0 / S / L / B / X (hiện tại: "${
        group || ""
      }").`
    );
    return { ok: false, rule: null, group, errors };
  }

  let ruleToken = null;

  if (group === "0") {
    // ✅ chỉ cần 1 chữ số ngay sau '0' (pos11, index 10) và phải trong [1..6]
    const digit = s[10]; // một ký tự
    if (!/^[1-6]$/.test(digit || "")) {
      errors.push(
        `Sau ký tự "0" phải là 1 chữ số trong [1..6] (ví dụ "01","02",...,"06").`
      );
    } else {
      ruleToken = "0" + digit; // normalize thành "01".."06" để dùng downstream
    }
  } else {
    // Nhóm chữ: token = group + 1 chữ số, nằm tại pos10-11 (index 9..10)
    const token = s.slice(9, 11); // "S1","L3","B5","X2",...
    if (!token || token[0] !== group) {
      errors.push(`Không đọc được rule cho nhóm "${group}" tại vị trí 11.`);
    } else {
      const sets = {
        S: allowedForS,
        L: allowedForL,
        B: allowedForB,
        X: allowedForX,
      };
      const set = sets[group];
      if (!/^[SLBX][0-9]$/.test(token)) {
        errors.push(`Rule không hợp lệ. Định dạng phải là ${group}<số>.`);
      } else if (!set.has(token)) {
        switch (group) {
          case "S":
            errors.push(`Không hợp lệ: "${token}". Chỉ cho phép: S1..S6.`);
            break;
          case "L":
            errors.push(
              `Không hợp lệ: "${token}". Chỉ cho phép: L2..L5 (L1, L6 không hợp lệ).`
            );
            break;
          case "B":
            errors.push(
              `Không hợp lệ: "${token}". Chỉ cho phép: B2..B5 (B1, B6 không hợp lệ).`
            );
            break;
          case "X":
            errors.push(`Không hợp lệ: "${token}". Chỉ cho phép: X1..X6.`);
            break;
        }
      } else {
        ruleToken = token;
      }
    }
  }

  return {
    ok: errors.length === 0,
    group,
    rule: ruleToken, // '01'..'06' (nhóm '0') hoặc 'S1'..'X6'
    errors,
  };
}

export function isRulePresent(itemCode) {
  const r = validateItemCodeRule(itemCode);
  return r.ok;
}
