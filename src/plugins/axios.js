import axios from 'axios'
import router from '@/router'
import { apiUrl } from '@/utils/env'

const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
})
// Instance riêng cho refresh (tránh đệ quy interceptor)
const refreshClient = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
})

/** Request: gắn Bearer từ localStorage */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue = []

function enqueue(cb) { queue.push(cb) }
function resolveQueue(newToken) { queue.forEach(cb => cb(newToken)); queue = [] }

function hardLogout() {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  } catch {}
  if (router.currentRoute.value.name !== 'Login') {
    router.replace({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
  }
}

/** Response: xử lý 401 + refresh token */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const original = error?.config
    if (!error?.response) return Promise.reject(error)

    if (status === 401) {
      const url = String(original?.url || '')
      const isAuthPath =
        url.includes('/login') ||
        url.includes('/refresh') ||
        url.includes('/forgot-password') ||
        url.includes('/reset-password')

      if (isAuthPath) {
        hardLogout()
        return Promise.reject(error)
      }

      if (original.__isRetry) {
        hardLogout()
        return Promise.reject(error)
      }
      original.__isRetry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          enqueue((newToken) => {
            if (newToken) original.headers.Authorization = `Bearer ${newToken}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true
      try {
        const currToken = localStorage.getItem('auth_token')
        const resp = await refreshClient.post(
          '/refresh',
          {},
          { headers: currToken ? { Authorization: `Bearer ${currToken}` } : {} }
        )

        const newToken = resp?.data?.token || resp?.data?.access_token || null
        const newUser  = resp?.data?.user || null
        if (!newToken) throw new Error('No token in refresh response')

        localStorage.setItem('auth_token', newToken)
        if (newUser) localStorage.setItem('auth_user', JSON.stringify(newUser))

        isRefreshing = false
        resolveQueue(newToken)

        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (e) {
        isRefreshing = false
        resolveQueue(null)
        hardLogout()
        return Promise.reject(e)
      }
    }

    return Promise.reject(error)
  }
)

export default api
