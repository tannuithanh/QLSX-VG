import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "/",
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        modifyVars: {
          "primary-color": "#c06252",
          "link-color": "#c06252",
          "border-radius-base": "4px",
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // server: {
  //   host: "172.23.13.102", // 👈 bind vào IP này
  //   port: 5179,            // 👈 chạy port 5179
  //   strictPort: true,      // 👈 nếu 5179 đang bận thì báo lỗi, ko tự đổi
  // },
});
