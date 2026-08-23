<script setup lang="ts">
/**
 * Shared text-input primitive (Silk M1): one focus ring, one invalid state,
 * zero per-page border improvisation.
 */
withDefaults(
  defineProps<{
    modelValue: string | number;
    type?: "text" | "number" | "password";
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    ariaLabel?: string;
  }>(),
  { type: "text", placeholder: "", disabled: false, invalid: false, ariaLabel: undefined }
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <input
    class="app-input"
    :class="{ 'app-input--invalid': invalid }"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-invalid="invalid || undefined"
    @input="onInput"
  />
</template>

<style scoped>
.app-input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.app-input::placeholder { color: var(--color-text-tertiary); }
.app-input:focus {
  outline: none;
  border-color: var(--color-brand-primary);
  box-shadow: 0 0 0 3px var(--color-ring);
}
.app-input:disabled { opacity: 0.55; cursor: not-allowed; }
.app-input--invalid,
.app-input--invalid:focus {
  border-color: var(--color-state-error);
  box-shadow: 0 0 0 3px var(--color-state-error-soft);
}
</style>
