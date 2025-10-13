const SCHEME = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https' : 'http'
const withScheme = (hostPath) => `${SCHEME}://${hostPath}`

const normalize = (u, fallback = '') => (u || fallback).replace(/\/+$/, '')

export const USER_API_URL     = normalize(import.meta.env.VITE_USER_URL, withScheme('userqlsx.vinhgiapottery.com/api'))
export const USER_STORAGE_URL = normalize(import.meta.env.VITE_USER_STORAGE_URL, withScheme('userqlsx.vinhgiapottery.com'))

export const PRODUCTION_API_URL     = normalize(import.meta.env.VITE_PRODUCTION_API_URL, withScheme('apidashboard.vinhgiapottery.com/api'))
export const PRODUCTION_STORAGE_URL = normalize(import.meta.env.VITE_PRODUCTION_STORAGE_URL, withScheme('apidashboard.vinhgiapottery.com'))

export const apiUrl = USER_API_URL
export const storageUrl = USER_STORAGE_URL

export const productionApiUrl     = PRODUCTION_API_URL
export const productionStorageUrl = PRODUCTION_STORAGE_URL
