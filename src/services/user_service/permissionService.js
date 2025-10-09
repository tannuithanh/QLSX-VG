// src/services/user_service/permissionService.js
import api from "@/plugins/axios";

export const permissionApi = {
  /* ========= ACTION MASTER ========= */
  listActions(params = {}) {
    return api.get("/actions", { params });
  },

  /* ========= PERMISSION MASTER ========= */
  list(params = {}) {
    return api.get("/permissions", { params });
  },

  create(payload) {
    return api.post("/permissions", payload);
  },

  permissionsByModule(moduleId) {
    return api.get(`/permissions/by-module/${moduleId}`);
  },

  /* ========= ROLE <-> PERMISSION ========= */
  rolePermissions(params = {}) {
    return api.get("/role-permissions", { params });
  },

  assignPermissions(roleId, permissionIds) {
    return api.post("/role-permissions", { roleId, permissionIds });
  },

  updateRolePermission(roleId, moduleId, permissionIds = []) {
    return api.post("/permissions/update-role-permission", {
      roleId,
      moduleId,
      permissionIds: Array.isArray(permissionIds) ? permissionIds : [],
    });
  },

  /* ========= USER <-> ROLE ========= */
  listUserRoles(params = {}) {
    return api.get("/user-roles", { params });
  },

  // BE: POST /add-user-roles  body: { user_id, role_id, module_id }
  addUserRole(user_id, role_id, module_id = null) {
    return api.post("/add-user-roles", { user_id, role_id, module_id });
  },

  removeUserRole(id) {
    return api.delete(`/user-roles/${id}`);
  },

  /* ========= Role -> Modules (theo route bạn đã tạo) ========= */
  // GET /roles/{role}/modules  (trỏ PermissionController@modules)
  roleModules(roleId) {
    return api.get(`/roles/${roleId}/modules`);
  },

  /* ========= Helpers cho UI ========= */
  toActionOptions(rows = []) {
    return rows.map((a) => ({ label: a.name || a.code, value: a.id }));
  },

  toPermissionOptions(rows = []) {
    return rows.map((p) => ({
      label:
        p.code ||
        `${p.module?.code || p.module_id}:${p.action?.code || p.action_id}`,
      value: p.id,
    }));
  },

  async mapActionIdsToPermissionIds(moduleId, actionIds) {
    const { data } = await api.get(`/permissions/by-module/${moduleId}`);
    const set = new Set(actionIds);
    return (data || []).filter((p) => set.has(p.action?.id)).map((p) => p.id);
  },
};
