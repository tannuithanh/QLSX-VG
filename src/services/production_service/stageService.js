import productionApi from '@/plugins/productionApi'

export const stageApi = {
  list(params = {}) {
    return productionApi.get('/stages', { params })
  },

  // vì BE index() trả mảng -> trả thẳng; nếu sau này trả paginator thì vẫn chịu được
  async listAll(params = {}) {
    const { data } = await productionApi.get('/stages', { params })
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  },

  create(payload) {
    // { name, code, abbr }
    return productionApi.post('/stages', payload)
  },

  update(id, payload) {
    // { name?, code?, abbr? }
    return productionApi.put(`/stages/${id}`, payload)
  },

  remove(id) {
    return productionApi.delete(`/stages/${id}`)
  },

  toOptions(rows = []) {
    return rows.map(r => ({ label: r.name, value: r.id }))
  },
}
