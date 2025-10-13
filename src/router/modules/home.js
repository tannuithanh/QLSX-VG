import index from "@/views/home/index.vue";
export default [
  {
    path: "",
    name: "Home",
    component: index,
    meta: { title: "Trang chủ", requiresAuth: true, activeKey: "home" },
  },
];
