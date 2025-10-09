// src/services/positionService.js
import api from '@/plugins/axios'

export const positionApi = {
  // GET /positions
  list(params = {}) {
    return api.get('/positions', { params })
  },

  // POST /positions   body: { name }
  create(payload) {
    return api.post('/positions', payload)
  },

  // PUT /positions/{id}   body: { name }
  update(id, payload) {
    return api.put(`/positions/${id}`, payload)
  },

  // DELETE /positions/{id}
  remove(id) {
    return api.delete(`/positions/${id}`)
  },

  // Helper: map sang options cho a-select
  toOptions(rows = []) {
    return rows.map(r => ({ label: r.name, value: r.id }))
  },
}
