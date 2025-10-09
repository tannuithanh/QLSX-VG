import { storageUrl } from "@/utils/env";

export function resolveStoragePath(path) {
  if (!path) return "";
  const p = String(path).trim();

  // đã là URL tuyệt đối / data URL / blob URL thì trả nguyên
  if (/^(https?:)?\/\//i.test(p) || /^data:/.test(p) || /^blob:/.test(p))
    return p;

  const base = storageUrl.replace(/\/+$/, "");
  const clean = p.replace(/^\/+/, "");

  // nếu BE đã trả kiểu 'storage/...' hoặc '/storage/...'
  if (clean.startsWith("storage/")) return `${base}/${clean}`;
  if (p.startsWith("/storage/")) return `${base}${p}`;

  // mặc định gắn /storage/
  return `${base}/storage/${clean}`;
}
