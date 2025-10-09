import productionApi from '@/plugins/productionApi'

export const teamApi = {
  // GET /teams?workshop_id=...
  list(params = {}) {
    return productionApi.get('/teams', { params })
  },

  // Lấy tất cả (index trả mảng -> trả thẳng)
  async listAll(params = {}) {
    const { data } = await productionApi.get('/teams', { params })
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  },

  // POST /teams  { name, code, workshop_id }
  create(payload) {
    return productionApi.post('/teams', payload)
  },

  // PUT /teams/{id}  { name?, code?, workshop_id? }
  update(id, payload) {
    return productionApi.put(`/teams/${id}`, payload)
  },

  // DELETE /teams/{id}
  remove(id) {
    return productionApi.delete(`/teams/${id}`)
  },
}
