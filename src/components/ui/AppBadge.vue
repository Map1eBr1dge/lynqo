<script setup lang="ts">
/**
 * Status badge primitive (Silk M1). Tone maps 1:1 onto the state tokens, so
 * a new status color starts at tokens.css — never in a page's scoped CSS.
 */
withDefaults(
  defineProps<{
    tone?: "neutral" | "success" | "warning" | "error" | "info" | "accent";
    dot?: boolean;
  }>(),
  { tone: "neutral", dot: false }
);

const toneVars: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: "var(--color-surface-inset)", fg: "var(--color-text-secondary)" },
  success: { bg: "var(--color-state-success-soft)", fg: "var(--color-state-success)" },
  warning: { bg: "var(--color-state-warning-soft)", fg: "var(--color-state-warning)" },
  error: { bg: "var(--color-state-error-soft)", fg: "var(--color-state-error)" },
  info: { bg: "var(--color-state-info-soft)", fg: "var(--color-state-info)" },
  accent: { bg: "var(--color-accent-soft)", fg: "var(--color-accent-deep)" },
};
</script>

<template>
  <span
    class="app-badge"
    :style="{ background: toneVars[tone].bg, color: toneVars[tone].fg }"
  >
    <span v-if="dot" class="app-badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  white-space: nowrap;
}
.app-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}
</style>
