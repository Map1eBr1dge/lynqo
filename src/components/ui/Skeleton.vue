<script setup lang="ts">
/**
 * Loading placeholder primitive (Silk M1). Shimmer runs on compositor-only
 * properties and collapses to a static block under reduced-motion.
 */
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    circle?: boolean;
  }>(),
  { width: "100%", height: "12px", circle: false }
);
</script>

<template>
  <span
    class="skeleton"
    :class="{ 'skeleton--circle': circle }"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton {
  display: inline-block;
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-surface-inset);
}
.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.35),
    transparent
  );
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}
.skeleton--circle { border-radius: var(--radius-full); }

@keyframes skeleton-shimmer {
  100% { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; transform: none; opacity: 0.5; }
}
</style>
