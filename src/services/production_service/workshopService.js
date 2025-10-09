// src/services/production_service/workshopService.js
import productionApi from "@/plugins/productionApi";

export const workshopApi = {
  list(params = {}) {
    return productionApi.get("/workshops", { params });
  },

  async listAll() {
    const { data } = await productionApi.get("/workshops");
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : [];
  },

  create(payload) {
    return productionApi.post("/workshops", payload); // { name, code }
  },

  update(id, payload) {
    return productionApi.put(`/workshops/${id}`, payload);
  },

  remove(id) {
    return productionApi.delete(`/workshops/${id}`);
  },

  toOptions(rows = []) {
    return rows.map((r) => ({
      label: `${r.name} (${r.code})`,
      value: r.id,
      code: r.code,
    }));
  },
};
