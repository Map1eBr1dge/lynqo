<script setup lang="ts">
/**
 * Accessible switch primitive (Silk M1) — one implementation for every
 * on/off setting; pages stop re-inventing role="switch" buttons.
 */
withDefaults(
  defineProps<{
    modelValue: boolean;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  { disabled: false, ariaLabel: undefined }
);

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <button
    type="button"
    class="app-switch"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="app-switch__knob" />
  </button>
</template>

<style scoped>
.app-switch {
  position: relative;
  flex: 0 0 38px;
  width: 38px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
  cursor: pointer;
  transition: background var(--transition-normal);
}
.app-switch[aria-checked="true"] { background: var(--color-brand-primary); }
.app-switch:disabled { opacity: 0.55; cursor: not-allowed; }

.app-switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-normal);
}
.app-switch[aria-checked="true"] .app-switch__knob { transform: translateX(16px); }
</style>
