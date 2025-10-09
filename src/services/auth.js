// src/services/authApi.js (hoặc file bạn đang dùng)
import api from "@/plugins/axios"; // axios instance có gắn token

export const authApi = {
  login(data) {
    return api.post("/login", data);
  },
  logout() {
    return api.post("/logout");
  },
  changePassword(data) {
    return api.post("/change-password", data);
  },
  sendResetLink(data) {
    return api.post("/forgot-password", data);
  },
  resetPassword(data) {
    return api.post("/reset-password", data);
  },
  refresh() {
    return api.post("/refresh");
  },
  me() {
    return api.get("/me");
  },

  // 👇 Thêm 2 hàm mới
  meModules() {
    // GET /me/modules
    return api.get("/me/modules");
  },
  meModulesWithRoles() {
    // GET /me/modules-with-roles
    return api.get("/me/modules-with-roles");
  },
};