import productionApi from "@/plugins/productionApi";

export const standardProductAreaApi = {
  // GET /standard-product-areas  -> luôn trả mảng (không phân trang)
  async listAll(params = {}) {
    const { data } = await productionApi.get("/standard-product-areas", {
      params,
    });
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : [];
  },

  // GET /standard-product-areas/{id}
  get(id) {
    return productionApi.get(`/standard-product-areas/${id}`);
  },

  // (mới) GET /standard-product-areas/selected -> lấy record đang mặc định
  async getSelected() {
    const { data } = await productionApi.get(
      "/standard-product-areas/selected"
    );
    return data ?? null;
  },

  // POST /standard-product-areas  { standard_area }
  create(payload) {
    return productionApi.post("/standard-product-areas", payload);
  },

  // PUT /standard-product-areas/{id}  { standard_area, is_selected? }
  update(id, payload) {
    return productionApi.put(`/standard-product-areas/${id}`, payload);
  },

  // (mới) PUT /standard-product-areas/{id}/select -> chọn mặc định
  select(id) {
    return productionApi.put(`/standard-product-areas/${id}/select`);
  },

  // DELETE /standard-product-areas/{id}
  remove(id) {
    return productionApi.delete(`/standard-product-areas/${id}`);
  },
};
