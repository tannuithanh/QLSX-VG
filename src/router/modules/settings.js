import Setting from "@/views/settings/index.vue";

import RoleManagement from "@/views/settings/pages/roleSetting/RoleManagement.vue";
import UserManagement from "@/views/settings/pages/userSetting/UserManagement.vue";
import DepartmentManagement from "@/views/settings/pages/departmentSetting/DepartmentManagement.vue";
import PositionManagement from "@/views/settings/pages/positionSetting/PositionManagement.vue";
import AccessControlIndex from "@/views/settings/pages/accessControl/AccessControlIndex.vue";
import UserRoleIndex from "@/views/settings/pages/userRoleSetting/UserRoleIndex.vue";

export default [
  {
    path: "settings",
    component: Setting,
    meta: {
      title: "Cài đặt hệ thống",
      requiresAuth: true,
      requiresAdmin: true,
    },
    children: [
      { path: "", redirect: "/settings/user" },
      {
        path: "user",
        name: "SettingsUser",
        component: UserManagement,
        meta: {
          title: "Quản lý người dùng",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "departments",
        name: "SettingsDepartments",
        component: DepartmentManagement,
        meta: {
          title: "Phòng ban",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "positions",
        name: "SettingsPositions",
        component: PositionManagement,
        meta: {
          title: "Chức vụ",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "roles",
        name: "SettingsRoles",
        component: RoleManagement,
        meta: { requiresAuth: true, requiresAdmin: true },
      },
      {
        path: "access-control",
        name: "SettingsAccessControl",
        component: AccessControlIndex,
        meta: {
          title: "Vai trò & Phân quyền",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: "user-roles",
        name: "SettingsUserRoles",
        component: UserRoleIndex,
        meta: {
          title: "Gán vai trò cho người dùng",
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
    ],
  },
];
