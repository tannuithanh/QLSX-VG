// Chuẩn hoá: bỏ "/" ở cuối để tránh double slash
const normalize = (u, fallback = '') => (u || fallback).replace(/\/+$/, '')

// USER SERVICE
export const USER_API_URL     = normalize(import.meta.env.VITE_USER_URL, 'http://localhost:8000/api')
export const USER_STORAGE_URL = normalize(import.meta.env.VITE_USER_STORAGE_URL, 'http://localhost:8000')

// PRODUCTION SERVICE
export const PRODUCTION_API_URL     = normalize(import.meta.env.VITE_PRODUCTION_API_URL, 'http://localhost:10000/api')
export const PRODUCTION_STORAGE_URL = normalize(import.meta.env.VITE_PRODUCTION_STORAGE_URL, 'http://localhost:10000')

// Nếu bạn muốn giữ tên ngắn gọn cho app hiện tại (mặc định đang login qua user_service):
export const apiUrl     = USER_API_URL
export const storageUrl = USER_STORAGE_URL

export const productionApiUrl = PRODUCTION_API_URL
export const productioneStorageUrl = PRODUCTION_STORAGE_URL