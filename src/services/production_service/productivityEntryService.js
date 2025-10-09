// services/production_service/productivityEntryService.js
import productionApi from "@/plugins/productionApi";

export const productivityEntryApi = {
  // GET /productivity-entries
  list(params = {}) {
    return productionApi.get("/productivity-entries", { params });
  },

  // lấy hết (BE trả mảng hoặc paginator đều chịu được)
  async listAll(params = {}) {
    const { data } = await productionApi.get("/productivity-entries", {
      params,
    });
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : [];
  },

  // POST /productivity-entries
  create(payload) {
    return productionApi.post("/productivity-entries", payload);
  },

  // PUT /productivity-entries/{id}
  update(id, payload) {
    return productionApi.put(`/productivity-entries/${id}`, payload);
  },

  // DELETE /productivity-entries/{id}
  remove(id) {
    return productionApi.delete(`/productivity-entries/${id}`);
  },

  // POST /productivity-entries/bulk-insert
  bulkInsert(payload) {
    return productionApi.post(`/productivity-entries/bulk-insert`, payload);
  },

  // 🔸 NEW: lưu 2 cột đã tính cho 1 bản ghi
  // POST /productivity-entries/{id}/save-calcs
  saveCalcs(
    id,
    { qty_standard_product = null, qty_layout_output = null } = {}
  ) {
    return productionApi.post(`/productivity-entries/${id}/save-calcs`, {
      qty_standard_product,
      qty_layout_output,
    });
  },

  // 🔸 NEW: lưu 2 cột đã tính cho nhiều bản ghi
  // POST /productivity-entries/save-calcs-bulk
  saveCalcsBulk(rows = []) {
    // rows: [{ id, qty_standard_product, qty_layout_output }, ...]
    return productionApi.post(`/productivity-entries/save-calcs-bulk`, {
      rows,
    });
  },
};
