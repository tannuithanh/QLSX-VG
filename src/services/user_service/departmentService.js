// src/services/departmentService.js
import api from '@/plugins/axios'

export const departmentApi = {
  // GET /departments
  list(params = {}) {
    return api.get('/departments', { params })
  },

  // POST /departments   body: { name, code, description? }
  create(payload) {
    return api.post('/departments', payload)
  },

  // PUT /departments/{id}   body: { name, code, description? }
  update(id, payload) {
    return api.put(`/departments/${id}`, payload)
  },

  // DELETE /departments/{id}
  remove(id) {
    return api.delete(`/departments/${id}`)
  },

  // Helper: map sang options cho a-select
  toOptions(rows = []) {
    return rows.map(r => ({ label: r.name, value: r.id }))
  },
}
