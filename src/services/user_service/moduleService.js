
import api from '@/plugins/axios'

export const moduleApi = {
  // GET /modules?keyword=...
  list(params = {}) {
    return api.get('/modules', { params })
  },

  // POST /modules   body: { name, code, description? }
  create(payload) {
    return api.post('/modules', payload)
  },

  // PUT /modules/{id}  body: { name, code, description? }
  update(id, payload) {
    return api.put(`/modules/${id}`, payload)
  },

  // DELETE /modules/{id}
  remove(id) {
    return api.delete(`/modules/${id}`)
  },

  // Helper: cho a-select
  toOptions(rows = []) {
    return rows.map(m => ({ label: m.name, value: m.id }))
  },
}
