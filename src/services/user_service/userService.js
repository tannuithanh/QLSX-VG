// src/services/userService.js
import api from "@/plugins/axios";

export const userApi = {
  // GET /users?ids=1,2,3 (tuỳ chọn)
  list(params = {}, signal) {
    return api.get("/users", { params, signal });
  },

  // GET /users/{id}
  show(id) {
    return api.get(`/users/${id}`);
  },

  // POST /users
  create(payload) {
    // payload: { name, msnv, email, phone?, address?, department_id?, position_id?, position_detail?, is_admin?, division? }
    return api.post("/users", payload);
  },

  // PUT /users/{id}
  update(id, payload) {
    return api.put(`/users/${id}`, payload);
  },

  // DELETE /users/{id}
  remove(id) {
    return api.delete(`/users/${id}`);
  },

  // POST /users/{id}/assign-role  body: { role_ids: [1,2,3] }
  assignRole(id, roleIds) {
    return api.post(`/users/${id}/assign-role`, { role_ids: roleIds });
  },

  // POST /users/user/avatar  (đúng theo routes bạn đang để prefix 'users' + '/user/avatar')
  uploadAvatar(file) {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.post(
      "/users/user/avatar",
      fd /*, { headers: { 'Content-Type': 'multipart/form-data' } }*/
    );
  },

  // POST /users/user/signature
  uploadSignature(file) {
    const fd = new FormData();
    fd.append("signature", file);
    return api.post("/users/user/signature", fd);
  },

  // GET /users/find-by-name?name=...
  findByName(name) {
    return api.get("/users/find-by-name", { params: { name } });
  },

  // GET /managers  (route ngoài nhóm /users)
  getLowerManagers() {
    return api.get("/managers");
  },

  // tiện: batch get theo id list
  batchGet(ids = []) {
    return api.get("/users", { params: { ids: ids.join(",") } });
  },
  changePasswordFirstTime(payload) {
    return api.post("/change-password-first-time", payload);
  },
};
