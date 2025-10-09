import Login from "@/views/auth/Login.vue";

export default [
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { guestOnly: true },
  },
   {
    path: '/change-password-first-time',
    name: 'change-password-first-time',
    component: () => import('@/components/common/ChangePasswordFistTime.vue'), // <- dùng trực tiếp component
    meta: { requiresAuth: true, isForceChangePage: true },
  },
  // 404 → về trang chính
  { path: "/:pathMatch(.*)*", redirect: "/" },
];
