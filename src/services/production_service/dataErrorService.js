import productionApi from "@/plugins/productionApi";

export const dataErrorApi = {
  // GET /data-errors
  list(params = {}) {
    return productionApi.get("/data-errors", { params });
  },

  // lấy hết (mảng hoặc paginator đều chịu)
  async listAll(params = {}) {
    const { data } = await productionApi.get("/data-errors", { params });
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : [];
  },

  // POST /data-errors
  create(payload) {
    return productionApi.post("/data-errors", payload);
  },

  // GET /data-errors/{id}
  get(id) {
    return productionApi.get(`/data-errors/${id}`);
  },

  // PUT /data-errors/{id}
  update(id, payload) {
    return productionApi.put(`/data-errors/${id}`, payload);
  },

  // DELETE /data-errors/{id}
  remove(id) {
    return productionApi.delete(`/data-errors/${id}`);
  },

  // POST /data-errors/bulk-insert
  bulkInsert(rows = []) {
    return productionApi.post(`/data-errors/bulk-insert`, { rows });
  },
};
