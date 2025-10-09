import productionApi from '@/plugins/productionApi'

export const standardDailyProductivityApi = {
  async listAll(params = {}) {
    const { data } = await productionApi.get('/standard-daily-productivities', { params })
    return data
  },
  async getByTeam(teamId) {
    const { data } = await productionApi.get(`/standard-daily-productivities/${teamId}`)
    return data
  },
  async upsert(payload) {
    const { data } = await productionApi.post('/standard-daily-productivities', payload)
    return data
  },
  async deleteByTeam(teamId) {
    const { data } = await productionApi.delete(`/standard-daily-productivities/${teamId}`)
    return data
  },
}
