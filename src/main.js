// main.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.less";
import "./assets/styles/main.css";

import App from "./App.vue";
import router from "./router";
import axios from "./plugins/axios";
import { useAuthStore } from "@/stores/auth";

// === ECharts (tree-shaking) ===
import VueECharts from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from "echarts/components";

// Đăng ký các phần bạn dùng
use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);
// ===============================

const app = createApp(App);
const pinia = createPinia();

app.config.globalProperties.$axios = axios;
app.use(pinia);

// hydrate auth trước khi render
const auth = useAuthStore();
auth.loadAuthFromLocalStorage?.();

// Đăng ký component toàn cục: <v-chart />
app.component("v-chart", VueECharts);

app.use(router).use(Antd).mount("#app");
