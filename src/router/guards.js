// src/router/guards.js
import { useAuthStore } from "@/stores/auth";
import { notification } from "ant-design-vue";

export function applyGuards(router) {
  router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore();

    // --- 0) Đồng bộ token từ localStorage vào store (nếu cần)
    const token = localStorage.getItem("auth_token");
    if (token && !auth.token) {
      auth.setToken(token);
    }

    // --- 1) Nếu có token mà CHƯA fetch /me lần nào -> gọi /me đúng 1 lần
    // giúp F5 xong user luôn chuẩn từ BE (kể cả is_first_password_changed)
    if (token && !auth.meLoaded && typeof auth.fetchMe === "function") {
      try {
        await auth.fetchMe();
      } catch {
        // nếu /me lỗi thì fetchMe đã tự clear token & user
      }
    }

    // --- 2) Yêu cầu đăng nhập
    const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth === true);
    if (requiresAuth && !token) {
      return next({ name: "Login", query: { redirect: to.fullPath } });
    }

    // --- 3) Chỉ cho guest (ví dụ: Login)
    if (to.meta?.guestOnly && token) {
      // nếu đã đăng nhập thì cho về trang mặc định (tùy bạn)
      return next("/settings");
    }

    // --- 4) Chỉ admin
    if (to.matched.some((r) => r.meta?.requiresAdmin === true)) {
      // có thể dùng getter isAdmin nếu bạn thích: const isAdmin = auth.isAdmin
      const v = auth.user?.is_admin;
      const isAdmin = v === true || v === 1 || v === "1";
      if (!isAdmin) {
        notification.warning({
          message: "Không có quyền truy cập",
          description: "Trang này chỉ dành cho quản trị viên.",
        });
        return next("/"); // hoặc next('/403')
      }
    }

    // --- 5) Bắt buộc đổi mật khẩu lần đầu
    // Quy ước: is_first_password_changed = 0/false => CHƯA đổi -> PHẢI ép
    const changed = auth.user?.is_first_password_changed;
    const notChangedYet = changed === 0 || changed === "0" || changed === false;

    // Nếu đã đăng nhập và chưa đổi, CHẶN TẤT CẢ trừ trang đổi mật khẩu
    if (token && notChangedYet) {
      const goingForcePage = !!to.meta?.isForceChangePage;
      if (!goingForcePage) {
        return next({
          name: "change-password-first-time",
          query: { redirect: to.fullPath },
        });
      }
    }

    // Nếu đã đổi rồi mà vẫn đứng ở trang đổi mật khẩu -> đưa về redirect hoặc home
    if (to.meta?.isForceChangePage && token && !notChangedYet) {
      const back = to.query?.redirect || "/";
      return next(back);
    }

    // --- 6) Cho qua
    next();
  });

  router.afterEach((to) => {
    const base = "Trang chủ";
    document.title = to.meta?.title ? `${to.meta.title} • ${base}` : base;
  });
}
