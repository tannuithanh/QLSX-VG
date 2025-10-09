import ProductionDanhMuc from "@/views/module/production/danh-muc/index.vue";
import ProductionNangSuat from "@/views/module/production/nang-suat/index.vue";
import ProductionDauVaoLoi from "@/views/module/production/du-lieu-loi/index.vue";
import ProductionBaoCao from "@/views/module/production/bao-cao/nang-suat/index.vue";
import ProductionBaocaoLayout from "@/views/module/production/bao-cao/layout/index.vue";

export default [
  {
    path: "san-xuat",
    meta: {
      title: "Quản lý sản xuất",
      requiresAuth: true,
      openKeys: ["production"], // mặc định mở group production
    },
    children: [
      { path: "", redirect: "/san-xuat/danh-muc" },
      {
        path: "danh-muc",
        name: "ProductionDanhMuc",
        component: ProductionDanhMuc,
        meta: {
          title: "Danh mục",
          requiresAuth: true,
          activeKey: "production-danh-muc",
          openKeys: ["production"],
        },
      },
      {
        path: "nang-suat",
        name: "ProductionNangSuat",
        component: ProductionNangSuat,
        meta: {
          title: "Dữ liệu năng suất",
          requiresAuth: true,
          activeKey: "production-nang-suat",
          openKeys: ["production"],
        },
      },
      {
        path: "dau-vao-loi",
        name: "ProductionDauVaoLoi",
        component: ProductionDauVaoLoi,
        meta: {
          title: "Dữ liệu đầu vào lỗi",
          requiresAuth: true,
          activeKey: "production-dau-vao-loi",
          openKeys: ["production"],
        },
      },

      // --- Báo cáo ---
      {
        path: "bao-cao-nang-suat",
        name: "ProductionBaoCaoNangSuat",
        component: ProductionBaoCao,
        meta: {
          title: "Báo cáo năng suất",
          requiresAuth: true,
          activeKey: "report-nang-suat",
          openKeys: ["production", "report"],
        },
      },
      {
        path: "bao-cao-layout",
        name: "ProductionBaoCaoLayout",
        component: ProductionBaocaoLayout,
        meta: {
          title: "Báo cáo layout",
          requiresAuth: true,
          activeKey: "report-layout",
          openKeys: ["production", "report"],
        },
      },
    ],
  },
];
