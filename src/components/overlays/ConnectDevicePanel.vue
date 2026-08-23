<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { Check, ChevronDown, Copy, LoaderCircle, RefreshCw, Wifi, X } from "lucide-vue-next";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";
import { useConnectionDiagnostics } from "@/composables/useConnectionDiagnostics";
import { useLocale } from "@/i18n";
import { configureWindowsFirewall } from "@/services/tauri";
import ConnectionDiagnosticsPanel from "./ConnectionDiagnosticsPanel.vue";
import ConnectionAddressPicker from "./ConnectionAddressPicker.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppSwitch from "@/components/ui/AppSwitch.vue";

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const appStore = useAppStore();
const settingsStore = useSettingsStore();
const { t } = useLocale();
const {
  diagnostics,
  loading: diagnosticsLoading,
  error: diagnosticsError,
  refresh: refreshDiagnostics,
} = useConnectionDiagnostics();

const copiedField = shallowRef<string | null>(null);
const settingPending = shallowRef(false);
const firewallPending = shallowRef(false);
let panelRefresh: Promise<void> | null = null;

const completeLanUrl = computed(() => {
  if (!appStore.serverRunning) return null;
  return appStore.qrCode?.url || null;
});

const mdnsUrl = computed(() => {
  const info = appStore.connectionInfo;
  if (
    !appStore.serverRunning
    || !info?.localDomain
    || !info.token
    || appStore.selectedConnectionIp !== info.ip
  ) return null;
  return `http://${info.localDomain}:${info.port}/mobile?token=${encodeURIComponent(info.token)}`;
});

const receiveFolder = computed(() => appStore.connectionInfo?.receiveFolder || null);

const pairingPin = computed(() => appStore.connectionInfo?.pin || null);

async function refreshPin() {
  await appStore.refreshPairingPinCode();
}

async function refreshPanelData() {
  if (panelRefresh) return panelRefresh;
  panelRefresh = (async () => {
    await appStore.refreshConnectionData();
    // Auto-generate a pairing PIN the first time the panel opens.
    if (appStore.serverRunning && !appStore.connectionInfo?.pin) {
      await appStore.refreshPairingPinCode();
    }
    await refreshDiagnostics(appStore.selectedConnectionIp || undefined);
  })().finally(() => {
    panelRefresh = null;
  });
  return panelRefresh;
}

watch(
  () => props.visible,
  (visible, _previous, onCleanup) => {
    if (!visible) return;
    void refreshPanelData();
    const timer = window.setInterval(async () => {
      const previousIp = appStore.selectedConnectionIp;
      await appStore.refreshConnectionData({ silent: true });
      if (previousIp !== appStore.selectedConnectionIp) {
        await refreshDiagnostics(appStore.selectedConnectionIp || undefined);
      }
    }, 3000);
    onCleanup(() => window.clearInterval(timer));
  }
);

async function toggleRequireConfirm(value: boolean) {
  if (settingPending.value) return;
  settingPending.value = true;
  const saved = await settingsStore.setRequireApproval(value);
  settingPending.value = false;
  if (!saved) {
    appStore.pushToast(
      "error",
      t("connect.settingSaveFailed"),
      t("connect.settingSaveFailedDescription")
    );
  }
}

async function copyToClipboard(text: string | null, field: string) {
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    copiedField.value = field;
    window.setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null;
    }, 2000);
  } catch (error) {
    appStore.pushToast(
      "error",
      t("connect.copyFailed"),
      error instanceof Error ? error.message : undefined
    );
  }
}

async function selectAddress(ip: string) {
  try {
    await appStore.selectConnectionAddress(ip);
    await refreshDiagnostics(ip);
  } catch (error) {
    appStore.pushToast(
      "error",
      t("connect.addressPicker.failed"),
      error instanceof Error && error.message === "selected_address_inactive"
        ? t("connect.warning.selected_address_inactive")
        : error instanceof Error ? error.message : undefined
    );
    await appStore.refreshConnectionData();
  }
}

async function configureFirewall() {
  if (firewallPending.value) return;
  firewallPending.value = true;
  try {
    const result = await configureWindowsFirewall();
    if (!result.success) throw new Error(result.error ?? t("connect.diagnostics.firewallConfigureFailed"));
    appStore.pushToast("success", t("connect.diagnostics.firewallConfigured"));
    await refreshDiagnostics(appStore.selectedConnectionIp || undefined);
  } catch (error) {
    appStore.pushToast(
      "error",
      t("connect.diagnostics.firewallConfigureFailed"),
      error instanceof Error ? error.message : undefined
    );
  } finally {
    firewallPending.value = false;
  }
}
</script>

<template>
  <AppDialog
    :open="visible"
    variant="sheet-right"
    labelled-by="connect-title"
    @close="emit('close')"
  >
    <div class="panel-inner">
      <div class="panel-header">
        <span id="connect-title" class="panel-title">{{ t("connect.title") }}</span>
        <button class="close-btn" :aria-label="t('connect.close')" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <p v-if="appStore.connectionInfoError" class="panel-error">
        {{ appStore.connectionInfoError }}
      </p>

      <!-- ── ① Primary path: scan + pairing code ── -->
      <section class="conn-section">
        <h3 class="conn-section__label">{{ t("connect.sectionScan") }}</h3>
        <div class="qr-card">
          <div class="qr-code">
            <div
              v-if="appStore.serverRunning && appStore.qrCode?.svg"
              v-html="appStore.qrCode.svg"
              class="qr-svg"
            />
            <div v-else class="qr-empty">
              <LoaderCircle v-if="appStore.connectionInfoLoading" :size="22" class="spin" />
              <span v-else>
                {{ appStore.serverRunning ? t("connect.qrUnavailable") : t("connect.serviceStopped") }}
              </span>
            </div>
          </div>
          <p class="qr-hint">{{ t("connect.qrHint") }}</p>
        </div>

        <div v-if="pairingPin" class="pin-card">
          <div class="pin-info">
            <span class="pin-label">{{ t("connect.pairingPin") }}</span>
            <small class="pin-hint">{{ t("connect.pairingPinHint") }}</small>
          </div>
          <div class="pin-controls">
            <span class="pin-value">{{ pairingPin }}</span>
            <button
              class="pin-refresh"
              :aria-label="t('connect.pairingPinRefresh')"
              :title="t('connect.pairingPinRefresh')"
              @click="refreshPin"
            >
              <RefreshCw :size="13" />
            </button>
          </div>
        </div>
      </section>

      <!-- ── ② Secondary paths: collapsed ── -->
      <details class="conn-more">
        <summary class="conn-summary">
          {{ t("connect.sectionOther") }}
          <ChevronDown :size="14" class="conn-summary__chevron" aria-hidden="true" />
        </summary>
        <div class="conn-more__body">
          <ConnectionAddressPicker
            :addresses="appStore.connectionInfo?.addresses ?? []"
            :selected-ip="appStore.selectedConnectionIp"
            :loading="appStore.connectionInfoLoading"
            @select="selectAddress"
          />

          <div class="copy-row">
            <span class="copy-row__label">{{ t("connect.completeAddress") }}</span>
            <div class="copy-row__value-group">
              <span class="copy-row__value">{{ completeLanUrl ?? t("connect.unavailable") }}</span>
              <button
                class="copy-btn"
                :disabled="!completeLanUrl"
                :aria-label="t('connect.copyCompleteAddress')"
                @click="copyToClipboard(completeLanUrl, 'lan')"
              >
                <Check v-if="copiedField === 'lan'" :size="13" class="copied" />
                <Copy v-else :size="13" />
              </button>
            </div>
          </div>

          <div class="copy-row">
            <span class="copy-row__label">{{ t("connect.mdnsAddress") }}</span>
            <div class="copy-row__value-group">
              <span class="copy-row__value">{{ mdnsUrl ?? t("connect.unavailable") }}</span>
              <button
                class="copy-btn"
                :disabled="!mdnsUrl"
                :aria-label="t('connect.copyMdnsAddress')"
                @click="copyToClipboard(mdnsUrl, 'mdns')"
              >
                <Check v-if="copiedField === 'mdns'" :size="13" class="copied" />
                <Copy v-else :size="13" />
              </button>
            </div>
          </div>

          <p class="note">{{ t("connect.browserPrivateNetworkWarning") }}</p>
          <p class="note">{{ t("connect.addToHome") }}</p>
        </div>
      </details>

      <!-- ── ③ Settings: collapsed ── -->
      <details class="conn-more">
        <summary class="conn-summary">
          {{ t("connect.sectionSettings") }}
          <ChevronDown :size="14" class="conn-summary__chevron" aria-hidden="true" />
        </summary>
        <div class="conn-more__body">
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ t("connect.requireApproval") }}</span>
              <small>{{ t("connect.requireApprovalHint") }}</small>
            </div>
            <AppSwitch
              :model-value="settingsStore.requireApproval"
              :disabled="settingPending"
              :aria-label="t('connect.requireApproval')"
              @update:model-value="toggleRequireConfirm"
            />
          </div>
          <div class="setting-row">
            <span class="setting-label">{{ t("connect.receiveFolder") }}</span>
            <span class="setting-value">{{ receiveFolder ?? t("connect.unavailable") }}</span>
          </div>
        </div>
      </details>

      <!-- ── ④ Diagnostics: collapsed ── -->
      <details class="conn-more">
        <summary class="conn-summary">
          <Wifi :size="14" aria-hidden="true" />
          {{ t("connect.sectionDiag") }}
          <ChevronDown :size="14" class="conn-summary__chevron" aria-hidden="true" />
        </summary>
        <div class="conn-more__body">
          <ConnectionDiagnosticsPanel
            :diagnostics="diagnostics"
            :loading="diagnosticsLoading"
            :error="diagnosticsError"
            :firewall-pending="firewallPending"
            @retry="refreshPanelData"
            @configure-firewall="configureFirewall"
          />
          <div class="network-badge">
            <Wifi :size="12" />
            <span>{{ appStore.networkName }}</span>
          </div>
        </div>
      </details>
    </div>
  </AppDialog>
</template>

<style scoped>
.panel-inner { display: flex; flex-direction: column; gap: 12px; }

.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title { color: var(--color-text-primary); font-size: var(--text-md); font-weight: var(--weight-semibold); }

.close-btn, .copy-btn, .pin-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
}
.close-btn { width: 28px; height: 28px; }
.copy-btn { flex: 0 0 28px; width: 28px; height: 28px; }
.close-btn:hover, .copy-btn:hover:not(:disabled) { background: var(--color-hover); color: var(--color-text-primary); }
.copy-btn:disabled { opacity: 0.35; cursor: default; }
.copied { color: var(--color-state-success); }

.panel-error { margin: 0; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--color-state-error-soft); color: var(--color-state-error); font-size: var(--text-xs); }

/* ── Section scaffolding ── */
.conn-section__label,
.conn-summary {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.04em;
}

.conn-section { display: flex; flex-direction: column; gap: 10px; }

.conn-more {
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
}
.conn-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 0;
  list-style: none;
  cursor: pointer;
  user-select: none;
}
.conn-summary::-webkit-details-marker { display: none; }
.conn-summary:hover { color: var(--color-text-secondary); }
.conn-summary__chevron { margin-left: auto; transition: transform var(--transition-fast); }
.conn-more[open] .conn-summary__chevron { transform: rotate(180deg); }
.conn-more__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}

/* ── ① QR + PIN ── */
.qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-inset);
}
.qr-code {
  display: grid;
  place-items: center;
  width: 172px;
  height: 172px;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: #fff;
}
.qr-svg { width: 152px; height: 152px; display: grid; place-items: center; }
.qr-svg :deep(svg) { width: 100%; height: 100%; }
.qr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  text-align: center;
}
.qr-hint { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs); text-align: center; line-height: 1.5; }

.pin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-inset);
}
.pin-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.pin-label { color: var(--color-text-secondary); font-size: var(--text-xs); font-weight: var(--weight-semibold); }
.pin-hint { color: var(--color-text-tertiary); font-size: var(--text-xs); line-height: 1.45; }
.pin-controls { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.pin-value {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--color-brand-primary);
}
.pin-refresh {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.pin-refresh:hover { background: var(--color-hover); color: var(--color-text-secondary); }
.pin-refresh:active { background: var(--color-active); }

/* ── ② Copy rows & notes ── */
.copy-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.copy-row__label { flex: 0 0 auto; color: var(--color-text-secondary); font-size: var(--text-xs); }
.copy-row__value-group { display: flex; min-width: 0; align-items: center; gap: 4px; }
.copy-row__value {
  overflow: hidden;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  line-height: 1.55;
}

/* ── ③ Settings rows ── */
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.setting-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.setting-label { color: var(--color-text-primary); font-size: var(--text-sm); }
.setting-row small { color: var(--color-text-tertiary); font-size: var(--text-xs); line-height: 1.45; }
.setting-value {
  overflow: hidden;
  max-width: 160px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── ④ Diagnostics footer ── */
.network-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-brand-primary-soft);
  color: var(--color-text-brand);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.spin { animation: panel-spin 0.9s linear infinite; }
@keyframes panel-spin { to { transform: rotate(360deg); } }
</style>
