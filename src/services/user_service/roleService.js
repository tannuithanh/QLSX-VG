// src/services/user_service/roleService.js
import api from '@/plugins/axios'

export const roleApi = {
  // GET /roles?keyword=...
  list(params = {}) {
    return api.get('/roles', { params })
  },

  // POST /roles  { name, code }
  create(payload) {
    return api.post('/roles', payload)
  },

  // PUT /roles/{id}  { name, code }
  update(id, payload) {
    return api.put(`/roles/${id}`, payload)
  },

  // DELETE /roles/{id}
  remove(id) {
    return api.delete(`/roles/${id}`)
  },

  // Helper: map sang options cho a-select
  toOptions(rows = []) {
    return rows.map(r => ({ label: r.name, value: r.id }))
  }
}
