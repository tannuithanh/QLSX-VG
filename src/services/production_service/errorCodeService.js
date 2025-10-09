import productionApi from "@/plugins/productionApi";

const base = "/error-codes";

export const errorCodeApi = {
  // Lấy toàn bộ (array)
  async listAll() {
    const { data } = await productionApi.get(base);
    return Array.isArray(data) ? data : [];
  },

  create(payload) {
    return productionApi.post(base, payload); // {code, name}
  },

  update(id, payload) {
    return productionApi.put(`${base}/${id}`, payload); // {code?, name?}
  },

  remove(id) {
    return productionApi.delete(`${base}/${id}`);
  },
};
