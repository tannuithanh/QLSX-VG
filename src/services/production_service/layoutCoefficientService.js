import productionApi from "@/plugins/productionApi";

export const layoutCoefficientApi = {
  // GET /layout-coefficients
  list(params = {}) {
    return productionApi.get("/layout-coefficients", { params });
  },

  // lấy tất cả (index trả mảng → trả thẳng; nếu sau này BE trả paginator vẫn chịu được)
  async listAll(params = {}) {
    const { data } = await productionApi.get("/layout-coefficients", {
      params,
    });
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : [];
  },
  
  // POST /layout-coefficients { item_code, coefficient }
  create(payload) {
    return productionApi.post("/layout-coefficients", payload);
  },

  // PUT /layout-coefficients/{id} { item_code?, coefficient? }
  update(id, payload) {
    return productionApi.put(`/layout-coefficients/${id}`, payload);
  },

  // DELETE /layout-coefficients/{id}
  remove(id) {
    return productionApi.delete(`/layout-coefficients/${id}`);
  },

  toOptions(rows = []) {
    return rows.map((r) => ({
      label: `${r.item_code} (${r.coefficient})`,
      value: r.id,
    }));
  },

  recalculate(payload = {}) {
    return productionApi.post("/layout-coefficients/recalculate", payload);
  },

  calcCoefficient() {
    return productionApi.post("/layout-coefficients/calc-coefficient");
  },

  generateFromSAll() {
    return productionApi.post("/layout-coefficients/generate-from-s-db");
  },

  generateFromSPreview() {
    return productionApi.post('/layout-coefficients/generate-from-s-db/preview')
  },
  generateFromSApply() {
    return productionApi.post('/layout-coefficients/generate-from-s-db/apply')
  },
};
