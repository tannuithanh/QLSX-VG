// services/production_service/productivityEntryService.js
import productionApi from "@/plugins/productionApi";

function chunkArray(arr, size = 300) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const productivityEntryApi = {
  // GET /productivity-entries
  list(params = {}) {
    return productionApi.get("/productivity-entries", { params });
  },

  // lấy hết (BE trả mảng hoặc paginator đều chịu được)
  async listAll(params = {}) {
    const { data } = await productionApi.get("/productivity-entries", { params });
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
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

  // POST /productivity-entries/{id}/save-calcs
  saveCalcs(id, { qty_standard_product = null, qty_layout_output = null } = {}) {
    return productionApi.post(`/productivity-entries/${id}/save-calcs`, {
      qty_standard_product,
      qty_layout_output,
    });
  },

  // POST /productivity-entries/save-calcs-bulk
  saveCalcsBulk(rows = []) {
    return productionApi.post(
      `/productivity-entries/save-calcs-bulk`,
      { rows },
      { timeout: 60000 } // 60s / request
    );
  },

  // ✅ NEW: chia lô để không timeout (vẫn lưu FULL)
  async saveCalcsBulkChunked(rows = [], chunkSize = 300, onProgress) {
    const chunks = chunkArray(rows, chunkSize);
    const total = rows.length;
    let done = 0;

    for (let i = 0; i < chunks.length; i++) {
      await this.saveCalcsBulk(chunks[i]);
      done += chunks[i].length;
      if (typeof onProgress === "function") {
        onProgress({ done, total, batchIndex: i + 1, batchTotal: chunks.length });
      }
    }
    return { done, total, batches: chunks.length };
  },
};
