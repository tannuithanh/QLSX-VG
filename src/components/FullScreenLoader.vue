<template>
  <div class="loader-overlay">
    <div class="modern-spinner" />
  </div>
</template>

<style scoped>
.loader-overlay {
  position: absolute;
  inset: 0;
  z-index: 999;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Spinner hình tròn gradient xoay */
.modern-spinner {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 6px solid transparent;
  border-top: 6px solid #c06252;
  border-right: 6px solid #f4a261;
  border-bottom: 6px solid #e76f51;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 8px rgba(192, 98, 82, 0.5);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
