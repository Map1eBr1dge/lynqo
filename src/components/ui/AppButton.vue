<script setup lang="ts">
import { Loader } from "lucide-vue-next";

/**
 * Shared button primitive (Silk M1). Visuals come exclusively from
 * tokens.css / board.json so pages stop hand-rolling paddings and colors.
 */
withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "md" | "sm";
    type?: "button" | "submit";
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { variant: "primary", size: "md", type: "button", disabled: false, loading: false }
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    :type="type"
    class="app-btn"
    :class="[`app-btn--${variant}`, `app-btn--${size}`]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <Loader v-if="loading" :size="14" class="app-btn__spin" />
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}
.app-btn:active:not(:disabled) { transform: scale(0.98); }
.app-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.app-btn--md { height: 36px; padding: 0 16px; font-size: var(--text-sm); }
.app-btn--sm { height: 30px; padding: 0 12px; font-size: var(--text-xs); }

.app-btn--primary {
  color: var(--color-text-inverse);
  background: var(--color-brand-primary);
  border: 1px solid var(--color-brand-primary);
}
.app-btn--primary:hover:not(:disabled) { background: var(--color-brand-primary-hover); }
.app-btn--primary:active:not(:disabled) { background: var(--color-brand-primary-active); }

.app-btn--secondary {
  color: var(--color-text-brand);
  background: transparent;
  border: 1px solid var(--color-border-strong);
}
.app-btn--secondary:hover:not(:disabled) {
  background: var(--color-hover);
  border-color: var(--color-brand-primary);
}

.app-btn--danger {
  color: #fff;
  background: var(--color-state-error);
  border: 1px solid var(--color-state-error);
}
.app-btn--danger:hover:not(:disabled) { filter: brightness(1.08); }

.app-btn--ghost {
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
}
.app-btn--ghost:hover:not(:disabled) {
  background: var(--color-hover);
  color: var(--color-text-primary);
}

.app-btn__spin { animation: app-btn-spin 0.9s linear infinite; }
@keyframes app-btn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .app-btn__spin { animation-duration: 0.01s; animation-iteration-count: 1; opacity: 0.7; }
  .app-btn:active:not(:disabled) { transform: none; }
}
</style>
