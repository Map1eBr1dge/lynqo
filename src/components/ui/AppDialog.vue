<script setup lang="ts">
import { computed } from "vue";
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent } from "reka-ui";

/**
 * The single dialog primitive of the app (see
 * spark-output/specs/vnext-dialog-consolidation.md).
 *
 * Reka provides focus trap, scroll lock, aria wiring and stacked-layer
 * ordering; this wrapper owns positioning variants, size tiers and the
 * motion tokens from board.json. Owners stay the single source of truth for
 * `open`: Esc/outside intents are routed through @close, never applied
 * directly.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    variant?: "center" | "sheet-right";
    size?: "sm" | "md" | "lg";
    /** false blocks Esc/outside dismissal (legal consent is the only case). */
    dismissible?: boolean;
    labelledBy?: string;
    describedBy?: string;
  }>(),
  { variant: "center", size: "md", dismissible: true }
);

const emit = defineEmits<{ close: [] }>();

const cardClass = computed(() => [
  "app-dialog__card",
  `app-dialog__card--${props.variant}`,
  `app-dialog__card--${props.size}`,
]);

interface PreventableEvent {
  preventDefault: () => void;
}

function requestClose() {
  if (props.dismissible) emit("close");
}

function onEscapeKeyDown(event: PreventableEvent) {
  // Veto Reka's built-in close so `open` is only ever changed by the owner.
  event.preventDefault();
  requestClose();
}

function onInteractOutside(event: PreventableEvent) {
  event.preventDefault();
  requestClose();
}

function onOpenUpdate(value: boolean) {
  // Safety net for programmatic closes initiated inside the slot.
  if (!value) emit("close");
}
</script>

<template>
  <DialogRoot :open="open" @update:open="onOpenUpdate">
    <DialogPortal>
      <Transition name="app-overlay">
        <DialogOverlay v-if="open" class="app-dialog__overlay" />
      </Transition>
      <Transition name="app-card">
        <DialogContent
          v-if="open"
          :class="cardClass"
          :aria-labelledby="labelledBy"
          :aria-describedby="describedBy"
          @escape-key-down="onEscapeKeyDown"
          @interact-outside="onInteractOutside"
        >
          <slot />
        </DialogContent>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.app-dialog__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(15, 23, 42, 0.46);
}

.app-dialog__card {
  position: fixed;
  z-index: calc(var(--z-modal) + 1);
  color: var(--color-text-primary);
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

/* ── Variant: centered modal ── */
.app-dialog__card--center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(calc(100vw - 40px), var(--app-dialog-width, 520px));
  max-height: min(86vh, 860px);
  display: flex;
  flex-direction: column;
}
.app-dialog__card--sm { --app-dialog-width: 380px; }
.app-dialog__card--md { --app-dialog-width: 520px; }
.app-dialog__card--lg { --app-dialog-width: 760px; }

/* ── Variant: right sheet (ConnectDevicePanel style drawer) ── */
.app-dialog__card--sheet-right {
  top: calc(var(--topbar-height) + 6px);
  right: 32px;
  width: min(400px, calc(100vw - 32px));
  max-height: calc(100vh - var(--topbar-height) - 22px);
  overflow-y: auto;
  padding: 20px;
}

@media (max-width: 600px) {
  .app-dialog__card--sheet-right {
    top: 8px;
    right: 8px;
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
  }
}

/* ── Motion: board.json tiers ── enter 200ms spring-out · exit 140ms ease-in */
.app-overlay-enter-active { transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.app-overlay-leave-active { transition: opacity 140ms cubic-bezier(0.4, 0, 1, 1); }
.app-overlay-enter-from,
.app-overlay-leave-to { opacity: 0; }

.app-card-enter-active { transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.app-card-leave-active { transition: opacity 140ms cubic-bezier(0.4, 0, 1, 1), transform 140ms cubic-bezier(0.4, 0, 1, 1); }
.app-card-enter-from,
.app-card-leave-to { opacity: 0; }

.app-dialog__card--center.app-card-enter-from { transform: translate(-50%, -47%) scale(0.96); }
.app-dialog__card--center.app-card-leave-to { transform: translate(-50%, -51%) scale(0.98); }

.app-dialog__card--sheet-right.app-card-enter-from { transform: translateY(-8px); }
.app-dialog__card--sheet-right.app-card-leave-to { transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) {
  .app-overlay-enter-active,
  .app-overlay-leave-active,
  .app-card-enter-active,
  .app-card-leave-active { transition-duration: 1ms; }
}
</style>
