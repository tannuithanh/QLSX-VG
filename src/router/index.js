import { createRouter, createWebHistory } from "vue-router";
import MainLayout from "@/layouts/MainLayout.vue";

import authRoutes from "./modules/auth";
import profileRoutes from "./modules/profile";

// các module con KHÔNG chứa MainLayout
import settingsChildRoutes from "./modules/settings";
import productionChildRoutes from "./modules/production";
import homeRoutes from "./modules/home";

import { applyGuards } from "./guards";

const routes = [
  ...authRoutes,
  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      ...homeRoutes,
      ...settingsChildRoutes,
      ...productionChildRoutes,
      ...profileRoutes,
    ],
  },

  // 404
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

applyGuards?.(router);

export default router;
