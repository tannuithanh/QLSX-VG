# Vue + Ant Design Vue Starter

A ready-to-run Vue 3 + Vite project with **ant-design-vue@3.2.20**, **vue-router**, **pinia**, and **axios**.

## Quick Start

```bash
# 1) Extract the zip or clone this folder
cd vue-antd-starter

# 2) Install deps
npm install

# 3) Run dev server
npm run dev

# 4) Build for production
npm run build
```

## Notes

- Global Ant Design Vue is registered in `src/main.js`.
- Router is set up in `src/router/index.js` with `Home` and `About`.
- State store example in `src/stores/counter.js`.
- Axios is preconfigured with interceptors in `src/plugins/axios.js`. Set `VITE_API_BASE_URL` in `.env`.
- Try the demo fetch on the Home page.
