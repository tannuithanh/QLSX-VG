// src/stores/auth.js
import { defineStore } from "pinia";
import api from "@/plugins/axios";
import { authApi } from "@/services/auth";

function safeParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("auth_token") || null,
    user: safeParse(localStorage.getItem("auth_user"), null),
    meLoaded: false,

    // 👇 NEW: cache module / module+roles
    myModules: safeParse(localStorage.getItem("auth_my_modules"), []), // [{id,name,code}]
    myModulesLoaded: false,
    myModulesWithRoles: safeParse(
      localStorage.getItem("auth_my_modules_roles"),
      null
    ), // [{id,name,code,roles:[...]})
    myModulesWithRolesLoaded: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.token,
    isAdmin: (s) => {
      const v = s.user?.is_admin;
      return v === true || v === 1 || v === "1";
    },
    // tiện dùng:
    moduleCodes: (s) =>
      new Set((s.myModules || []).map((m) => m.code).filter(Boolean)),
    hasModule: (s) => (codeOrId) => {
      if (!codeOrId) return false;
      return (s.myModules || []).some(
        (m) => m.code === codeOrId || m.id === Number(codeOrId)
      );
    },
    rolesByModuleId: (s) => {
      const map = new Map();
      (s.myModulesWithRoles || []).forEach((m) =>
        map.set(
          m.id,
          (m.roles || []).map((r) => r.code || r.name)
        )
      );
      return map;
    },
  },

  actions: {
    setToken(token) {
      this.token = token;
      if (token) localStorage.setItem("auth_token", token);
      else localStorage.removeItem("auth_token");
    },
    setUser(user) {
      this.user = user;
      if (user) localStorage.setItem("auth_user", JSON.stringify(user));
      else localStorage.removeItem("auth_user");
    },
    setAuth(token, user) {
      this.setToken(token);
      this.setUser(user);
    },
    patchUser(partial) {
      const next = { ...(this.user || {}), ...(partial || {}) };
      this.setUser(next);
    },
    loadAuthFromLocalStorage() {
      this.token = localStorage.getItem("auth_token") || null;
      this.user = safeParse(localStorage.getItem("auth_user"), null);
      this.myModules = safeParse(localStorage.getItem("auth_my_modules"), []);
      this.myModulesWithRoles = safeParse(
        localStorage.getItem("auth_my_modules_roles"),
        null
      );
    },

    // /me
    async fetchMe() {
      try {
        const { data } = await api.get("/me");
        this.setUser(data);
      } catch {
        this.setUser(null);
        this.setToken(null);
      } finally {
        this.meLoaded = true;
      }
    },

    // 👇 NEW: /me/modules
    async fetchMyModules({ force = false } = {}) {
      if (this.myModulesLoaded && !force) return this.myModules;
      try {
        const { data } = await authApi.meModules();
        this.myModules = Array.isArray(data) ? data : [];
        localStorage.setItem("auth_my_modules", JSON.stringify(this.myModules));
        return this.myModules;
      } finally {
        this.myModulesLoaded = true;
      }
    },

    // 👇 NEW: /me/modules-with-roles
    async fetchMyModulesWithRoles({ force = false } = {}) {
      if (this.myModulesWithRolesLoaded && !force)
        return this.myModulesWithRoles;
      try {
        const { data } = await authApi.meModulesWithRoles();
        this.myModulesWithRoles = Array.isArray(data) ? data : [];
        localStorage.setItem(
          "auth_my_modules_roles",
          JSON.stringify(this.myModulesWithRoles)
        );
        return this.myModulesWithRoles;
      } finally {
        this.myModulesWithRolesLoaded = true;
      }
    },

    // Sau khi đổi mật khẩu lần đầu
    async refreshAfterPasswordChange() {
      this.meLoaded = false;
      await this.fetchMe();
      this.myModulesLoaded = false;
      this.myModulesWithRolesLoaded = false;
      await Promise.all([
        this.fetchMyModules({ force: true }),
        this.fetchMyModulesWithRoles({ force: true }),
      ]);
    },

    // Khi bạn vừa gán/bỏ role/module ở trang phân quyền → gọi cái này để đồng bộ
    async refreshMyAccess() {
      this.myModulesLoaded = false;
      this.myModulesWithRolesLoaded = false;
      await Promise.all([
        this.fetchMyModules({ force: true }),
        this.fetchMyModulesWithRoles({ force: true }),
      ]);
    },

    logout() {
      this.setToken(null);
      this.setUser(null);
      this.meLoaded = false;

      // 👇 clear cache access
      this.myModules = [];
      this.myModulesLoaded = false;
      localStorage.removeItem("auth_my_modules");

      this.myModulesWithRoles = null;
      this.myModulesWithRolesLoaded = false;
      localStorage.removeItem("auth_my_modules_roles");
    },
  },
});
