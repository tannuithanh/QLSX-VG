import productionApi from '@/plugins/productionApi'

export const layoutStandardProductivityApi = {
  async listAll(params = {}) {
    const { data } = await productionApi.get('/layout-standard-productivities', { params })
    return data
  },
  async getByTeam(teamId) {
    const { data } = await productionApi.get(`/layout-standard-productivities/${teamId}`)
    return data
  },
  async upsert(payload) {
    const { data } = await productionApi.post('/layout-standard-productivities', payload)
    return data
  },
  async deleteByTeam(teamId) {
    const { data } = await productionApi.delete(`/layout-standard-productivities/${teamId}`)
    return data
  },
}
