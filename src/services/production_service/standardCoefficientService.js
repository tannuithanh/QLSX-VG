import productionApi from '@/plugins/productionApi'

export const standardCoefficientApi = {
  // GET /standard-coefficients
  list(params = {}) {
    return productionApi.get('/standard-coefficients', { params })
  },

  // Lấy tất cả (index trả mảng -> trả thẳng; nếu sau này BE đổi sang paginator vẫn chịu được)
  async listAll(params = {}) {
    const { data } = await productionApi.get('/standard-coefficients', { params })
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  },

  // POST /standard-coefficients   { item_code, coefficient }
  create(payload) {
    return productionApi.post('/standard-coefficients', payload)
  },

  // PUT /standard-coefficients/{id}  { item_code?, coefficient? }
  update(id, payload) {
    return productionApi.put(`/standard-coefficients/${id}`, payload)
  },

  // DELETE /standard-coefficients/{id}
  remove(id) {
    return productionApi.delete(`/standard-coefficients/${id}`)
  },

  toOptions(rows = []) {
    return rows.map(r => ({ label: `${r.item_code} (${r.coefficient})`, value: r.id }))
  },
}
