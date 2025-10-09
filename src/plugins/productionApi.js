import axios from 'axios'
import { productionApiUrl } from '@/utils/env'
import router from '@/router'

const productionApi = axios.create({
  baseURL: productionApiUrl,
  timeout: 10000,
})

/** Request: gắn Bearer từ localStorage */
productionApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Response: nếu 401 thì logout cứng */
productionApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      try {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } catch {}
      if (router.currentRoute.value.name !== 'Login') {
        router.replace({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
      }
    }
    return Promise.reject(error)
  }
)

export default productionApi
